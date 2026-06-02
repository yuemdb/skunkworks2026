/**
 * Figma REST API client for server-side design context fetching.
 *
 * Given a Figma URL, this module fetches:
 *  1. Node metadata (component names, text content, design structure)
 *  2. A PNG screenshot of the specified node
 *
 * Both are injected into the LLM request so the model reviews the actual design
 * rather than inferring from a URL string.
 *
 * Requires: FIGMA_ACCESS_TOKEN env var (personal access token from figma.com/settings)
 */

const FIGMA_API_BASE = 'https://api.figma.com/v1';

/** Parsed components from a Figma URL */
export interface FigmaUrlParts {
  fileKey: string;
  /** Node ID in API format, e.g. "440:10513" */
  nodeId: string;
}

/**
 * Parse a Figma design/proto URL into fileKey + nodeId.
 * Returns null if the URL is not a recognizable Figma URL.
 *
 * Handles:
 *   https://www.figma.com/design/:fileKey/:name?node-id=440-10513
 *   https://www.figma.com/proto/:fileKey/:name?node-id=440-10513
 *   https://www.figma.com/file/:fileKey/:name?node-id=440-10513
 */
export function parseFigmaUrl(url: string): FigmaUrlParts | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('figma.com')) return null;

    const match = parsed.pathname.match(/\/(?:design|proto|file)\/([^/]+)/);
    if (!match) return null;

    const fileKey = match[1];
    const nodeParam = parsed.searchParams.get('node-id');
    if (!nodeParam) return null;

    // URL format uses '-' (440-10513); API format uses ':' (440:10513)
    const nodeId = nodeParam.replace('-', ':');
    return { fileKey, nodeId };
  } catch {
    return null;
  }
}

interface FigmaNode {
  id: string;
  name: string;
  type: string;
  characters?: string;
  children?: FigmaNode[];
}

/**
 * Recursively extract a readable summary of a Figma node tree.
 * Returns at most `maxLines` entries to keep the prompt concise.
 */
function extractNodeSummary(node: FigmaNode, depth = 0, lines: string[] = []): string[] {
  const indent = '  '.repeat(depth);

  if (node.type === 'TEXT' && node.characters?.trim()) {
    lines.push(`${indent}[Text] "${node.characters.trim().replace(/\n/g, ' ')}"`);
  } else if (depth <= 3) {
    lines.push(`${indent}[${node.type}] ${node.name}`);
  }

  if (node.children) {
    for (const child of node.children) {
      if (lines.length >= 120) break;
      extractNodeSummary(child, depth + 1, lines);
    }
  }

  return lines;
}

export interface FigmaContextResult {
  /** Plain-text summary of the node to prepend to the LLM prompt */
  contextText: string;
  /** Screenshot of the node, ready to pass as an image content block */
  images: Array<{ media_type: string; data: string }>;
  nodeName: string;
}

/**
 * Fetch design context for a Figma node URL.
 *
 * Steps:
 *  1. Parse the URL to extract fileKey + nodeId
 *  2. GET /files/:fileKey/nodes?ids=:nodeId  → node structure
 *  3. GET /images/:fileKey?ids=:nodeId&format=png  → CDN screenshot URL
 *  4. Download the screenshot and convert to base64
 *
 * Throws if the URL is invalid, the token is missing/wrong, or the node is not found.
 */
export async function fetchFigmaContext(
  figmaUrl: string,
  token: string,
): Promise<FigmaContextResult> {
  const parts = parseFigmaUrl(figmaUrl);
  if (!parts) throw new Error('Not a valid Figma design/proto URL');

  const { fileKey, nodeId } = parts;
  const headers = { 'X-Figma-Token': token };

  // ── 1. Node metadata ──────────────────────────────────────────────────────
  const nodeRes = await fetch(
    `${FIGMA_API_BASE}/files/${fileKey}/nodes?ids=${encodeURIComponent(nodeId)}`,
    { headers },
  );
  if (!nodeRes.ok) {
    const body = await nodeRes.text().catch(() => '');
    throw new Error(`Figma API ${nodeRes.status}${body ? `: ${body.slice(0, 200)}` : ''}`);
  }

  const nodeData = (await nodeRes.json()) as {
    nodes: Record<string, { document: FigmaNode }>;
  };

  const nodeEntry = nodeData.nodes?.[nodeId];
  if (!nodeEntry) {
    throw new Error(`Node "${nodeId}" not found in file "${fileKey}"`);
  }

  const node = nodeEntry.document;
  const nodeName = node.name;

  const summaryLines = extractNodeSummary(node);
  const contextText = [
    `Figma design node: "${nodeName}" (${nodeId})`,
    `File key: ${fileKey}`,
    '',
    'Design structure (component types and text content):',
    ...summaryLines,
    summaryLines.length >= 120 ? '... (truncated — additional elements not shown)' : '',
  ]
    .filter((l) => l !== undefined)
    .join('\n');

  // ── 2. Screenshot ─────────────────────────────────────────────────────────
  const images: FigmaContextResult['images'] = [];

  try {
    const imgRes = await fetch(
      `${FIGMA_API_BASE}/images/${fileKey}?ids=${encodeURIComponent(nodeId)}&format=png&scale=1`,
      { headers },
    );

    if (imgRes.ok) {
      const imgData = (await imgRes.json()) as { images: Record<string, string | null> };
      const imageUrl = imgData.images?.[nodeId];

      if (imageUrl) {
        const download = await fetch(imageUrl);
        if (download.ok) {
          const buffer = await download.arrayBuffer();
          const base64 = Buffer.from(buffer).toString('base64');
          images.push({ media_type: 'image/png', data: base64 });
        }
      }
    }
  } catch (err) {
    // Screenshot is best-effort — if it fails, the text summary still helps
    console.warn('[figma] Screenshot fetch failed (continuing without image):', err);
  }

  return { contextText, images, nodeName };
}
