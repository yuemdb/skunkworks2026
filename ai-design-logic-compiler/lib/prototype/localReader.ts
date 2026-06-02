// ─── Local filesystem reader ───────────────────────────────────────────────────
// Server-side only — uses Node.js fs. Called from the /api/prototype route.

import fs from 'fs';
import path from 'path';
import type { SourceFile } from './extractor';
import { SKIP_DIRS, SKIP_PATTERNS, INCLUDE_EXTENSIONS } from './extractor';

function walk(
  dir: string,
  rootDir: string,
  results: SourceFile[],
  depth = 0,
): void {
  if (depth > 6) return;

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return; // unreadable directory — skip silently
  }

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.includes(entry.name)) continue;
      walk(path.join(dir, entry.name), rootDir, results, depth + 1);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (!INCLUDE_EXTENSIONS.includes(ext)) continue;
      if (SKIP_PATTERNS.some((p) => entry.name.includes(p))) continue;

      const fullPath = path.join(dir, entry.name);
      const relPath = path.relative(rootDir, fullPath);
      let content: string;
      try {
        content = fs.readFileSync(fullPath, 'utf-8');
      } catch {
        continue; // unreadable file — skip
      }
      results.push({ path: relPath, content });
    }
  }
}

export async function readLocalPrototype(folderPath: string): Promise<SourceFile[]> {
  // Security: must be absolute and must not contain ..
  if (!folderPath.startsWith('/')) {
    throw new Error('Path must be absolute (start with /).');
  }
  if (folderPath.includes('..')) {
    throw new Error("Path must be absolute and cannot contain '..'");
  }
  if (!fs.existsSync(folderPath)) {
    throw new Error(`Path not found: ${folderPath}`);
  }
  const stat = fs.statSync(folderPath);
  if (!stat.isDirectory()) {
    throw new Error(`Path is not a directory: ${folderPath}`);
  }

  const results: SourceFile[] = [];
  walk(folderPath, folderPath, results);
  return results;
}
