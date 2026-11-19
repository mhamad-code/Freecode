import type { ProjectFS } from '../../storage/projectFs';

export interface Manifest {
  files: Record<string, string>;
}

export interface ManifestDiff {
  added: string[];
  modified: string[];
  removed: string[];
}

export const IGNORED = /^(node_modules|dist|build|\.cache|\.vite|\.next|coverage)\//;

export async function snapshotManifest(fs: ProjectFS): Promise<Manifest> {
  const files = await fs.snapshot();
  const filtered: Record<string, string> = {};
  for (const [path, hash] of Object.entries(files)) {
    if (IGNORED.test(path) || path === '.DS_Store') continue;
    filtered[path] = hash;
  }
  return { files: filtered };
}

export function diffManifest(prev: Manifest, next: Manifest): ManifestDiff {
  const added: string[] = [];
  const modified: string[] = [];
  const removed: string[] = [];
  for (const [path, hash] of Object.entries(next.files)) {
    const before = prev.files[path];
    if (before === undefined) added.push(path);
    else if (before !== hash) modified.push(path);
  }
  for (const path of Object.keys(prev.files)) {
    if (!(path in next.files)) removed.push(path);
  }
  return { added: added.sort(), modified: modified.sort(), removed: removed.sort() };
}
