import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;

const GLEAN_BASE = 'https://mongodb-be.glean.com';

function parseDocId(url: string): string | null {
  const match = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

interface GleanSnippet {
  text: string;
}

interface GleanResult {
  title?: string;
  url?: string;
  snippets?: GleanSnippet[];
}

interface GleanSearchResponse {
  results?: GleanResult[];
}

export async function POST(req: NextRequest) {
  const { url } = (await req.json()) as { url: string };

  if (!url?.trim()) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  const docId = parseDocId(url.trim());
  if (!docId) {
    return NextResponse.json(
      { error: 'Could not find a Google Doc ID in this URL. Make sure it\'s a docs.google.com link.' },
      { status: 400 }
    );
  }

  const gleanToken = process.env.GLEAN_TOKEN;
  if (!gleanToken) {
    return NextResponse.json(
      { error: 'GLEAN_TOKEN is not configured. Add it to .env.local.' },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(`${GLEAN_BASE}/api/v1/search`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${gleanToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: url.trim(),
        pageSize: 3,
        requestOptions: {
          facetBucketSize: 0,
          fetchAllSnippets: true,
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 401 || res.status === 403) {
        return NextResponse.json(
          { error: 'Glean auth failed. Check that GLEAN_TOKEN is valid.' },
          { status: 502 }
        );
      }
      return NextResponse.json({ error: `Glean error ${res.status}: ${text}` }, { status: 502 });
    }

    const data = (await res.json()) as GleanSearchResponse;

    // Find result whose URL matches the doc
    const match =
      data.results?.find((r) => r.url?.includes(docId)) ?? data.results?.[0];

    if (!match) {
      return NextResponse.json(
        {
          error:
            'Document not found in Glean. Make sure it\'s shared within MongoDB and has been indexed. Try opening it in Glean search first.',
        },
        { status: 404 }
      );
    }

    const snippets = match.snippets?.map((s) => s.text).filter(Boolean) ?? [];

    if (snippets.length === 0) {
      return NextResponse.json(
        { error: 'Document found but no content returned by Glean. The doc may not be fully indexed yet.' },
        { status: 422 }
      );
    }

    const title = match.title ? `# ${match.title}\n\n` : '';
    const content = title + snippets.join('\n\n');

    return NextResponse.json({ content });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to reach Glean' },
      { status: 502 }
    );
  }
}
