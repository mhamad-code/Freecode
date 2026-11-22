import { createProjectFs, decode, parentPath, type ProjectFS } from '../storage/projectFs';

/**
 * One persisted project FS per chat session. The agent's tools read and write
 * this FS, and every write is mirrored back into the store, which is what the
 * Files panel and the editor render.
 */
const bySession = new Map<string, Promise<ProjectFS>>();

export function projectFsFor(sessionId: string): Promise<ProjectFS> {
  const existing = bySession.get(sessionId);
  if (existing) return existing;
  const created = createProjectFs('local', `session-${sessionId}`);
  bySession.set(sessionId, created);
  // A failed open must not poison the cache forever.
  created.catch(() => bySession.delete(sessionId));
  return created;
}

/** Copies the store's files into the FS, skipping paths whose bytes match. */
export async function mountProjectFiles(
  fs: ProjectFS,
  files: Record<string, string>,
): Promise<number> {
  let written = 0;
  for (const [path, contents] of Object.entries(files)) {
    const stat = await fs.stat(path).catch(() => undefined);
    if (stat && decode(await fs.read(path)) === contents) continue;
    await fs.write(path, contents);
    written++;
  }
  return written;
}

/**
 * Deletes paths from the project FS and prunes folders that become empty, so
 * an agent turn cannot read a file the store no longer has. Returns the number
 * of files that were actually there.
 */
export async function removeProjectPaths(fs: ProjectFS, paths: string[]): Promise<number> {
  let removed = 0;
  for (const path of paths) {
    const stat = await fs.stat(path).catch(() => undefined);
    if (!stat) continue;
    await fs.remove(path, { recursive: true }).catch(() => undefined);
    if (stat.type === 'file') removed++;
    let parent = parentPath(path);
    while (parent) {
      const entries = await fs.list(parent).catch(() => []);
      if (entries.length) break;
      await fs.remove(parent).catch(() => undefined);
      parent = parentPath(parent);
    }
  }
  return removed;
}

/** Removes paths from the session's FS; a missing FS is not an error. */
export function removeProjectFiles(sessionId: string, paths: string[]): Promise<number> {
  if (!paths.length) return Promise.resolve(0);
  return projectFsFor(sessionId)
    .then((fs) => removeProjectPaths(fs, paths))
    .catch(() => 0);
}

export async function readProjectFile(fs: ProjectFS, path: string): Promise<string | undefined> {
  try {
    return decode(await fs.read(path));
  } catch {
    return undefined;
  }
}

/** Test-only: drop cached handles so a fresh profile starts clean. */
export function resetProjectFsCache(): void {
  bySession.clear();
}
