// ─── Git clone reader ──────────────────────────────────────────────────────────
// Clones a repo via SSH (or any git URL) into a temp directory, reads files
// with the local reader, then cleans up. Requires git in PATH and SSH keys
// configured for private repos.

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { readLocalPrototype } from './localReader';
import type { SourceFile } from './extractor';

export async function readGitClonePrototype(gitUrl: string): Promise<SourceFile[]> {
  // Sanity check — must look like a git URL
  if (!gitUrl.startsWith('git@') && !gitUrl.startsWith('git://')) {
    throw new Error('Expected a git URL starting with git@ or git://');
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proto-clone-'));

  try {
    execSync(
      `git clone --depth 1 --single-branch "${gitUrl}" "${tmpDir}"`,
      {
        timeout: 60_000,
        stdio: 'pipe', // suppress output
      },
    );
  } catch (err) {
    // Clean up before throwing
    fs.rmSync(tmpDir, { recursive: true, force: true });
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('Permission denied')) {
      throw new Error(
        'SSH authentication failed. Make sure your SSH key is added to GitHub and to your ssh-agent.',
      );
    }
    if (msg.includes('Repository not found') || msg.includes('not found')) {
      throw new Error('Repository not found. Check the SSH URL.');
    }
    throw new Error(`git clone failed: ${msg.split('\n')[0]}`);
  }

  try {
    const files = await readLocalPrototype(tmpDir);
    return files;
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}
