import { uid } from './ids';
import type { FileNode } from './types';

/**
 * A checkpoint is a full snapshot of the project's text files taken before a
 * turn. It lives in memory: conversation history is not persisted yet, so a
 * checkpoint without its turn would be unreachable anyway (F6 persists both).
 */
export interface Checkpoint {
  id: string;
  sessionId: string;
  label: string;
  at: number;
  /** Monotonic tie-breaker: several checkpoints can share a millisecond. */
  seq: number;
  files: Record<string, string>;
}

export interface ContentDiff {
  added: string[];
  modified: string[];
  removed: string[];
  total: number;
}

const store = new Map<string, Checkpoint>();
const LIMIT_PER_SESSION = 20;
let sequence = 0;

export function diffContents(
  before: Record<string, string>,
  after: Record<string, string>,
): ContentDiff {
  const added: string[] = [];
  const modified: string[] = [];
  const removed: string[] = [];
  for (const [path, text] of Object.entries(after)) {
    if (!(path in before)) added.push(path);
    else if (before[path] !== text) modified.push(path);
  }
  for (const path of Object.keys(before)) {
    if (!(path in after)) removed.push(path);
  }
  return {
    added: added.sort(),
    modified: modified.sort(),
    removed: removed.sort(),
    total: added.length + modified.length + removed.length,
  };
}

export function captureCheckpoint(
  sessionId: string,
  label: string,
  files: Record<string, string>,
): Checkpoint {
  const checkpoint: Checkpoint = {
    id: uid(),
    sessionId,
    label,
    at: Date.now(),
    seq: ++sequence,
    files: { ...files },
  };
  store.set(checkpoint.id, checkpoint);
  const mine = checkpointsFor(sessionId);
  for (const old of mine.slice(0, Math.max(0, mine.length - LIMIT_PER_SESSION))) {
    store.delete(old.id);
  }
  return checkpoint;
}

export function getCheckpoint(id: string): Checkpoint | undefined {
  return store.get(id);
}

/** Oldest first, so the UI can render them in the order they were taken. */
export function checkpointsFor(sessionId: string): Checkpoint[] {
  return [...store.values()]
    .filter((c) => c.sessionId === sessionId)
    .sort((a, b) => a.at - b.at || a.seq - b.seq);
}

export function clearCheckpoints(): void {
  store.clear();
}

/** Every checkpoint, oldest first, for the profile snapshot and the archive. */
export function exportCheckpoints(): Checkpoint[] {
  return [...store.values()].sort((a, b) => a.at - b.at || a.seq - b.seq);
}

/** Replaces the in-memory history with a saved one (hydrate or import). */
export function restoreCheckpoints(list: Checkpoint[]): void {
  store.clear();
  for (const checkpoint of list) {
    if (!checkpoint || typeof checkpoint.id !== 'string') continue;
    store.set(checkpoint.id, { ...checkpoint, files: { ...checkpoint.files } });
    if (typeof checkpoint.seq === 'number') sequence = Math.max(sequence, checkpoint.seq);
  }
}

/** Rebuilds the file tree from a flat path → contents map. */
export function treeFromContents(contents: Record<string, string>): FileNode[] {
  const root: FileNode[] = [];
  for (const path of Object.keys(contents).sort()) {
    const parts = path.split('/').filter(Boolean);
    let level = root;
    let prefix = '';
    parts.forEach((name, index) => {
      prefix = prefix ? `${prefix}/${name}` : name;
      if (index === parts.length - 1) {
        level.push({ name, path: prefix, type: 'file' });
        return;
      }
      let dir = level.find((node) => node.type === 'dir' && node.path === prefix);
      if (!dir) {
        dir = { name, path: prefix, type: 'dir', children: [] };
        level.push(dir);
      }
      if (!dir.children) dir.children = [];
      level = dir.children;
    });
  }
  return root;
}
