import type { FileSystemTree } from '@webcontainer/api';
import { peekRuntime } from './webcontainer';

/** Turns the flat `path -> contents` map into a WebContainer file tree. */
export function treeFromFiles(files: Record<string, string>): FileSystemTree {
  const tree: FileSystemTree = {};
  for (const [path, contents] of Object.entries(files)) {
    const parts = path.split('/').filter(Boolean);
    if (!parts.length) continue;
    let level = tree;
    for (let i = 0; i < parts.length - 1; i++) {
      const dir = level[parts[i]];
      if (dir && 'directory' in dir) {
        level = dir.directory;
      } else {
        const next: FileSystemTree = {};
        level[parts[i]] = { directory: next };
        level = next;
      }
    }
    level[parts[parts.length - 1]] = { file: { contents } };
  }
  return tree;
}

/** Mounts the project files into the booted container and returns the count. */
export async function mountWorkspace(files: Record<string, string>): Promise<number> {
  const container = peekRuntime();
  if (!container) throw new Error('The runtime is not booted.');
  const tree = treeFromFiles(files);
  const count = Object.keys(files).length;
  if (count) await container.mount(tree);
  await container.fs.mkdir('.freecode', { recursive: true }).catch(() => undefined);
  return count;
}

/** Write-through for editor saves; a no-op until the runtime is booted. */
export async function syncFile(path: string, contents: string): Promise<void> {
  const container = peekRuntime();
  if (!container || !path) return;
  const safe = path.split('/').filter(Boolean).join('/');
  if (!safe) return;
  try {
    await container.fs.writeFile(safe, contents);
  } catch {
    // the container may be torn down mid-save; the next mount re-seeds it
  }
}

export async function removeFile(path: string): Promise<void> {
  const container = peekRuntime();
  if (!container || !path) return;
  try {
    await container.fs.rm(path, { recursive: true });
  } catch {
    // missing already
  }
}
