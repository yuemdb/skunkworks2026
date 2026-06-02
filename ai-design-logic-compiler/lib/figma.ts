export function parseFigmaUrl(url: string): { fileKey: string; nodeId: string } | null {
  const match = url.match(/figma\.com\/(?:design|file)\/([a-zA-Z0-9]+).*node-id=([0-9-]+)/);
  if (!match) return null;
  return { fileKey: match[1], nodeId: match[2].replace('-', ':') };
}

// ── Node tree walker ────────────────────────────────────────────────────────

interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
  characters?: string;
}

const ACTION_WORDS = ['click', 'tap', 'submit', 'cancel', 'confirm', 'approve', 'deny', 'login', 'sign', 'connect', 'disconnect', 'authorize', 'continue'];
const STATE_WORDS = ['error', 'empty', 'loading', 'success', 'fail', 'warning', 'unauthorized', 'disabled', 'skeleton'];

function collectAll(node: FigmaNode, results: { frames: string[]; texts: string[] }) {
  const nameLower = node.name.toLowerCase();

  if (['FRAME', 'COMPONENT', 'SECTION'].includes(node.type)) {
    results.frames.push(node.name);
  }
  if (node.type === 'TEXT' && node.characters) {
    results.texts.push(node.characters);
  }

  for (const child of node.children ?? []) {
    collectAll(child, results);
  }
}

export interface FigmaContextInput {
  screens: string;
  entry_point: string;
  main_happy_path: string;
  notable_states: string;
  key_interactions: string;
  annotations_or_notes: string;
  known_gaps: string;
}

export interface FigmaScreenshot {
  id: string;
  name: string;
  url: string;
}

/**
 * Walks a frame's children to find a meaningful screen title from text content.
 * Prefers short heading-like text (≤ 60 chars) near the top of the frame,
 * falls back to the frame name if nothing useful is found.
 */
function deriveScreenTitle(frame: FigmaNode): string {
  const texts: string[] = [];

  function walk(node: FigmaNode, depth: number) {
    if (depth > 4) return;
    if (node.type === 'TEXT' && node.characters) {
      const t = node.characters.trim();
      if (t.length > 2 && t.length <= 60) texts.push(t);
    }
    for (const child of node.children ?? []) {
      walk(child, depth + 1);
    }
  }

  walk(frame, 0);

  // Pick heading-like text: not all-caps (icon labels), has a space or ≥ 8 chars.
  // Among all candidates, prefer the longest — longer text is more likely a page
  // title than a short tab/nav label (e.g. "Organization Settings" beats "General Settings").
  const candidates = texts.filter(
    (t) => (t.includes(' ') || t.length >= 8) && t !== t.toUpperCase()
  );
  const heading = candidates.reduce<string | undefined>(
    (best, t) => (!best || t.length > best.length ? t : best),
    undefined
  );

  return heading ?? frame.name;
}

/** Returns the direct child frames of the fetched node — these are the screens to screenshot. */
export function extractTopLevelFrames(nodes: Record<string, { document: FigmaNode }>): { id: string; name: string }[] {
  const frames: { id: string; name: string }[] = [];
  for (const key of Object.keys(nodes)) {
    const doc = nodes[key].document;
    for (const child of doc.children ?? []) {
      if (['FRAME', 'COMPONENT', 'SECTION'].includes(child.type)) {
        frames.push({ id: child.id, name: deriveScreenTitle(child) });
      }
    }
  }
  return frames.slice(0, 10); // cap at 10 screenshots
}

/**
 * Extracts a content-based description of a frame for use in main_happy_path.
 * Reads the actual text inside the frame (headings, CTAs, labels) rather than
 * relying on the Figma frame name, which is often an internal design convention.
 */
function summarizeFrameContent(frame: FigmaNode): string {
  const texts: string[] = [];

  function walk(node: FigmaNode, depth: number) {
    if (depth > 5) return;
    if (node.type === 'TEXT' && node.characters) {
      const t = node.characters.trim();
      if (t.length > 2 && t.length <= 80) texts.push(t);
    }
    for (const child of node.children ?? []) walk(child, depth + 1);
  }

  walk(frame, 0);

  // Heading candidates: not all-caps, has a space or ≥ 8 chars
  const headings = texts.filter(
    (t) => (t.includes(' ') || t.length >= 8) && t !== t.toUpperCase()
  );

  // Longest heading = most likely a page/section title
  const title = headings.reduce<string | undefined>(
    (best, t) => (!best || t.length > best.length ? t : best),
    undefined
  );

  // Key action text: a short CTA/button label (≤ 40 chars, starts with or contains an action word)
  const action = texts.find(
    (t) =>
      t.length <= 40 &&
      t !== title &&
      ACTION_WORDS.some(
        (w) => t.toLowerCase().startsWith(w) || t.toLowerCase().includes(` ${w}`)
      )
  );

  if (!title) return frame.name;
  if (action) return `${title} — ${action}`;
  return title;
}

export function mapNodesToContext(nodes: Record<string, { document: FigmaNode }>): FigmaContextInput {
  const allFrames: string[] = [];
  const allTexts: string[] = [];

  // Track top-level frames with both their internal name (for state detection)
  // and their content-based summary (for main_happy_path)
  const topLevelFrames: { name: string; summary: string }[] = [];

  for (const key of Object.keys(nodes)) {
    const doc = nodes[key].document;
    for (const child of doc.children ?? []) {
      if (['FRAME', 'COMPONENT', 'SECTION'].includes(child.type)) {
        topLevelFrames.push({ name: child.name, summary: summarizeFrameContent(child) });
      }
      collectAll(child, { frames: allFrames, texts: allTexts });
    }
    if (doc.name) allFrames.unshift(doc.name);
  }

  // Deduplicate frame names while preserving order
  const seen = new Set<string>();
  const uniqueFrames = allFrames.filter((n) => {
    const k = n.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const notableStates = uniqueFrames.filter((n) =>
    STATE_WORDS.some((w) => n.toLowerCase().includes(w))
  );

  const keyInteractions = allTexts.filter((t) =>
    ACTION_WORDS.some((w) => t.toLowerCase().includes(w))
  );

  // Happy path: non-state frames, described by their content rather than frame name
  const happyPathFrames = topLevelFrames.filter(
    (f) => !STATE_WORDS.some((w) => f.name.toLowerCase().includes(w))
  );

  return {
    screens: uniqueFrames.join(', '),
    entry_point: happyPathFrames[0]?.summary ?? uniqueFrames[0] ?? '',
    main_happy_path: happyPathFrames.slice(0, 8).map((f) => f.summary).join(' → '),
    notable_states: notableStates.join(', '),
    key_interactions: [...new Set(keyInteractions)].slice(0, 10).join(' | '),
    annotations_or_notes: '',
    known_gaps: '',
  };
}
