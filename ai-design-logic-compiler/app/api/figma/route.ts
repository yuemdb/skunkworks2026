import { NextRequest, NextResponse } from 'next/server';
import { parseFigmaUrl, mapNodesToContext, extractTopLevelFrames } from '@/lib/figma';
import type { FigmaScreenshot } from '@/lib/figma';

export async function POST(req: NextRequest) {
  const token = process.env.FIGMA_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: 'FIGMA_ACCESS_TOKEN is not configured.' },
      { status: 501 }
    );
  }

  let url: string;
  try {
    ({ url } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = parseFigmaUrl(url);
  if (!parsed) {
    return NextResponse.json(
      { error: 'Could not parse Figma URL. Make sure it includes a node-id parameter.' },
      { status: 400 }
    );
  }

  const { fileKey, nodeId } = parsed;
  const apiUrl = `https://api.figma.com/v1/files/${fileKey}/nodes?ids=${encodeURIComponent(nodeId)}`;

  let figmaData: { nodes: Record<string, { document: object }> };
  try {
    const res = await fetch(apiUrl, {
      headers: { 'X-Figma-Token': token },
    });
    if (!res.ok) {
      const body = await res.text();
      return NextResponse.json(
        { error: `Figma API error: ${res.status} ${body}` },
        { status: 502 }
      );
    }
    figmaData = await res.json();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Figma API request failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nodes = figmaData.nodes as any;
  const context = mapNodesToContext(nodes);
  const topFrames = extractTopLevelFrames(nodes);

  // Fetch screenshots for top-level frames in one batch call
  let screenshots: FigmaScreenshot[] = [];
  if (topFrames.length > 0) {
    try {
      const ids = topFrames.map((f) => f.id).join(',');
      const imgRes = await fetch(
        `https://api.figma.com/v1/images/${fileKey}?ids=${encodeURIComponent(ids)}&format=png&scale=1`,
        { headers: { 'X-Figma-Token': token } }
      );
      if (imgRes.ok) {
        const imgData: { images: Record<string, string | null> } = await imgRes.json();
        screenshots = topFrames
          .filter((f) => imgData.images[f.id])
          .map((f) => ({ id: f.id, name: f.name, url: imgData.images[f.id]! }));
      }
    } catch {
      // screenshots are non-critical — fail silently
    }
  }

  return NextResponse.json({ context, screenshots });
}
