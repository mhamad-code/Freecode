import { createProjectFs, decode, type ProjectFS } from '../storage/projectFs';

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
