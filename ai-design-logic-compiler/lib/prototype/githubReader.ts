// ─── GitHub API reader ─────────────────────────────────────────────────────────
// Fetches source files from a public (or private with token) GitHub repo.
// Returns SourceFile[] plus a skippedCount for surfacing rate limit info in the UI.

import type { SourceFile } from './extractor';
import { SKIP_DIRS, SKIP_PATTERNS, INCLUDE_EXTENSIONS, scoreFileByPath } from './extractor';

export interface GitHubReadResult {
  files: SourceFile[];
  skippedCount: number;
}

interface GitHubTreeItem {
  path: string;
  type: string;
  size?: number;
  url: string;
}

function parseGitHubUrl(url: string): {
  owner: string;
  repo: string;
  ref: string;
  subpath: string;
} | null {
  // Matches:
  //   https://github.com/owner/repo
  //   https://github.com/owner/repo/tree/branch
  //   https://github.com/owner/repo/tree/branch/some/subpath
  const match = url.match(
    /^https:\/\/github\.com\/([^/]+)\/([^/]+)(?:\/tree\/([^/]+)(?:\/(.+))?)?(?:\.git)?$/,
  );
  if (!match) return null;
  return {
    owner: match[1],
    repo: match[2].replace(/\.git$/, ''),
    ref: match[3] ?? 'HEAD',
    subpath: match[4] ?? '',
  };
}

function makeHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

function shouldSkip(filePath: string): boolean {
  const parts = filePath.split('/');
  if (parts.some((p) => SKIP_DIRS.includes(p))) return true;
  if (parts.some((p) => ['__tests__', '__mocks__', 'fixtures', '__snapshots__'].includes(p))) return true;
  const fileName = parts[parts.length - 1];
  if (SKIP_PATTERNS.some((p) => fileName.includes(p))) return true;
  const ext = fileName.includes('.') ? '.' + fileName.split('.').pop()! : '';
  if (!INCLUDE_EXTENSIONS.includes(ext)) return true;
  return false;
}

async function fetchInBatches<T, R>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<R | null>,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const settled = await Promise.allSettled(batch.map(fn));
    for (const result of settled) {
      if (result.status === 'fulfilled' && result.value !== null) {
        results.push(result.value);
      }
    }
  }
  return results;
}

export async function readGitHubPrototype(
  repoUrl: string,
  token?: string,
): Promise<GitHubReadResult> {
  const parsed = parseGitHubUrl(repoUrl);
  if (!parsed) {
    throw new Error(
      'Invalid GitHub URL. Expected: https://github.com/owner/repo or .../tree/branch/subpath',
    );
  }

  const { owner, repo, ref, subpath } = parsed;
  const headers = makeHeaders(token);

  // Step 1: Fetch recursive file tree (one call)
  const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${ref}?recursive=1`;
  const treeRes = await fetch(treeUrl, { headers });

  if (treeRes.status === 404) {
    throw new Error(
      `Repository not found or private. Check the URL or add a GITHUB_TOKEN env var.`,
    );
  }
  if (treeRes.status === 403 || treeRes.status === 429) {
    throw new Error(
      `GitHub API rate limit exceeded. Add a GITHUB_TOKEN env var or wait before retrying.`,
    );
  }
  if (!treeRes.ok) {
    throw new Error(`GitHub API error: ${treeRes.status} ${treeRes.statusText}`);
  }

  const treeData = (await treeRes.json()) as { tree: GitHubTreeItem[]; truncated?: boolean };
  const allFiles = treeData.tree.filter((item) => item.type === 'blob');

  // Step 2: Client-side filter
  const filtered = allFiles.filter((item) => {
    if (subpath && !item.path.startsWith(subpath)) return false;
    return !shouldSkip(item.path);
  });

  // Step 3: Score by path only (no content yet), take top 40
  const scored = filtered
    .map((item) => ({ item, score: scoreFileByPath(item.path) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 40);

  // Step 4: Fetch content in batches of 10
  let skippedCount = 0;

  const fetchFile = async (
    treeItem: GitHubTreeItem,
  ): Promise<SourceFile | null> => {
    const contentUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${treeItem.path}?ref=${ref}`;
    let res: Response;
    try {
      res = await fetch(contentUrl, { headers });
    } catch {
      skippedCount++;
      return null;
    }
    if (res.status === 403 || res.status === 429) {
      skippedCount++;
      return null;
    }
    if (!res.ok) {
      skippedCount++;
      return null;
    }
    const data = (await res.json()) as { content?: string; encoding?: string };
    if (!data.content || data.encoding !== 'base64') {
      skippedCount++;
      return null;
    }
    const content = Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf-8');
    return { path: treeItem.path, content };
  };

  const files = await fetchInBatches(
    scored.map(({ item }) => item),
    10,
    fetchFile,
  );

  return { files, skippedCount };
}
