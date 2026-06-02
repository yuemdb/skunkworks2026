import { NextRequest, NextResponse } from 'next/server';
import { readLocalPrototype } from '@/lib/prototype/localReader';
import { readGitHubPrototype } from '@/lib/prototype/githubReader';
import { readGitClonePrototype } from '@/lib/prototype/gitCloneReader';
import { extractInteractionContent } from '@/lib/prototype/extractor';
import type { SourceFile } from '@/lib/prototype/extractor';

// Extend route timeout for large repos / slow clones
export const maxDuration = 60;

const MAX_CONTENT_CHARS = 12_000;

export async function POST(req: NextRequest) {
  let source: string;
  try {
    ({ source } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!source?.trim()) {
    return NextResponse.json({ error: 'source is required' }, { status: 400 });
  }

  source = source.trim();

  const isGitHub = source.startsWith('https://github.com/');
  const isGitSSH = source.startsWith('git@') || source.startsWith('git://');
  const isLocal = source.startsWith('/');

  if (!isGitHub && !isGitSSH && !isLocal) {
    return NextResponse.json(
      {
        error:
          'Provide an absolute local path (/path/to/project), a GitHub URL (https://github.com/owner/repo), or an SSH URL (git@github.com:owner/repo.git).',
      },
      { status: 400 },
    );
  }

  let files: SourceFile[];
  let skippedCount = 0;

  try {
    if (isLocal) {
      files = await readLocalPrototype(source);
    } else if (isGitSSH) {
      files = await readGitClonePrototype(source);
    } else {
      const token = process.env.GITHUB_TOKEN;
      const result = await readGitHubPrototype(source, token);
      files = result.files;
      skippedCount = result.skippedCount;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to read prototype';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (files.length === 0) {
    return NextResponse.json(
      {
        error:
          'No relevant code files found. Check the path or that the project has .tsx/.ts/.jsx/.js files.',
      },
      { status: 422 },
    );
  }

  let content = extractInteractionContent(files, source);

  // Post-extraction truncation: guard against context window overflow when
  // combined with PRFAQ + designer logic + Figma context in the compile prompt.
  if (content.length > MAX_CONTENT_CHARS) {
    content = content.slice(0, MAX_CONTENT_CHARS) + '\n\n// ... [budget exceeded, additional files omitted]';
  }

  // Surface skipped files so the user sees it in the textarea before compiling
  if (skippedCount > 0) {
    content +=
      `\n\n// Note: ${skippedCount} file${skippedCount === 1 ? '' : 's'} ` +
      `skipped due to GitHub rate limiting. Add a GITHUB_TOKEN env var for better results.`;
  }

  return NextResponse.json({ content });
}
