// ─── Source-agnostic extraction engine ────────────────────────────────────────
// Receives an array of { path, content } from any reader (local fs or GitHub),
// scores each file by interaction-relevance, applies a character budget, and
// returns formatted text suitable for pasting into the LLM prompt.

export interface SourceFile {
  path: string;
  content: string;
}

// ─── Filter constants (exported so readers can apply them early) ───────────────

export const SKIP_DIRS = [
  'node_modules', '.git', '.next', 'dist', 'build', 'out',
  'coverage', '.turbo', '.vercel', '__pycache__', 'vendor',
];

export const SKIP_PATTERNS = [
  '.test.', '.spec.', '.stories.', '.d.ts',
  'jest.config', 'vitest.config', 'next.config', 'tailwind.config',
  'postcss.config', 'tsconfig', 'eslint', '.prettierrc',
];

export const INCLUDE_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js'];

export const PRIORITY_DIRS = [
  'components', 'app', 'pages',
  'hooks', 'features', 'screens', 'views',
  'src',
  'lib', 'utils', 'store',
];

// ─── Scoring ──────────────────────────────────────────────────────────────────

function scoreFile(file: SourceFile): number {
  const { path, content } = file;
  const lowerPath = path.toLowerCase();
  const parts = lowerPath.split('/');

  // Exclusions
  if (SKIP_PATTERNS.some((p) => lowerPath.includes(p))) return -999;
  if (parts.some((p) => ['__tests__', '__mocks__', 'fixtures', '__snapshots__'].includes(p))) return -999;

  let score = 0;

  // Directory priority
  if (parts.some((p) => ['components', 'app', 'pages'].includes(p))) score += 40;
  else if (parts.some((p) => ['hooks', 'features', 'screens', 'views'].includes(p))) score += 30;
  else if (parts.some((p) => p === 'src')) score += 25;
  else if (parts.some((p) => ['lib', 'utils', 'store'].includes(p))) score += 10;

  // Extension
  if (lowerPath.endsWith('.tsx')) score += 20;
  else if (lowerPath.endsWith('.jsx')) score += 15;
  else if (lowerPath.endsWith('.ts')) score += 10;
  else if (lowerPath.endsWith('.js')) score += 5;

  // Index files in named folders are often entry points
  const fileName = parts[parts.length - 1];
  if ((fileName === 'index.tsx' || fileName === 'index.ts') && parts.length > 1) score += 5;

  // Content signals (only scored if content is available)
  if (content) {
    if (content.includes('useState') || content.includes('useReducer')) score += 8;
    if (content.includes('onClick') || content.includes('onSubmit')) score += 8;
    if (
      content.includes('useRouter') ||
      content.includes('useNavigate') ||
      content.includes('usePathname')
    ) score += 6;
    if (content.includes('onChange')) score += 4;
    // Count occurrences of 'if (' — ≥3 means real conditional logic
    const ifCount = (content.match(/if\s*\(/g) ?? []).length;
    if (ifCount >= 3) score += 5;
  }

  return score;
}

// ─── Score without content (for pre-filtering before fetch) ──────────────────

export function scoreFileByPath(filePath: string): number {
  return scoreFile({ path: filePath, content: '' });
}

// ─── Main extraction function ─────────────────────────────────────────────────

export function extractInteractionContent(
  files: SourceFile[],
  source?: string,
  budgetChars = 15_000,
): string {
  // Score and sort
  const scored = files
    .map((f) => ({ file: f, score: scoreFile(f) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  const totalFiles = files.length;
  const included: string[] = [];
  let charsUsed = 0;
  let fileCount = 0;

  for (const { file } of scored) {
    if (fileCount >= 30) break;

    const header = `=== ${file.path} ===\n`;
    const body = file.content;
    const block = header + body + '\n\n';

    if (charsUsed + block.length <= budgetChars) {
      included.push(block);
      charsUsed += block.length;
      fileCount++;
    } else {
      // Truncate this file to fit the remaining budget
      const remaining = budgetChars - charsUsed - header.length - 40;
      if (remaining > 200) {
        const truncated = header + body.slice(0, remaining) + '\n// ... [truncated]\n\n';
        included.push(truncated);
        charsUsed += truncated.length;
        fileCount++;
      }
      break;
    }
  }

  if (included.length === 0) return '';

  const sourceLabel = source
    ? `Source: ${source}`
    : 'Source: (local)';

  const header = `${sourceLabel}\nFiles analyzed: ${totalFiles} total, ${fileCount} included\n\n`;

  return header + included.join('');
}
