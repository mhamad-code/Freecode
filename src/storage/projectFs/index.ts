export interface FSStat {
  path: string;
  type: 'file' | 'dir';
  size: number;
  mtime: number;
}

export interface ProjectFS {
  list(dir: string): Promise<FSStat[]>;
  read(path: string): Promise<Uint8Array>;
  write(path: string, data: Uint8Array | string): Promise<void>;
  remove(path: string, opts?: { recursive?: boolean }): Promise<void>;
  mkdir(path: string): Promise<void>;
  stat(path: string): Promise<FSStat | undefined>;
  walk(): Promise<FSStat[]>;
  snapshot(): Promise<Record<string, string>>;
  usage(): Promise<{ bytes: number; files: number }>;
}

const MAX_PATH = 4096;

/** POSIX-safe path: relative, no `..`, no backslashes, no NUL. */
export function safePath(path: string): string {
  if (typeof path !== 'string' || path.length === 0) return '';
  if (path.length > MAX_PATH) throw new Error('Path is too long');
  if (path.includes('\0')) throw new Error('Path contains a NUL byte');
  if (path.includes('\\')) throw new Error('Backslashes are not allowed');
  if (path.startsWith('/')) throw new Error('Absolute paths are not allowed');
  const parts: string[] = [];
  for (const seg of path.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') throw new Error('Path traversal is not allowed');
    parts.push(seg);
  }
  return parts.join('/');
}

export const parentPath = (path: string): string => {
  const idx = path.lastIndexOf('/');
  return idx === -1 ? '' : path.slice(0, idx);
};

export const baseName = (path: string): string => {
  const idx = path.lastIndexOf('/');
  return idx === -1 ? path : path.slice(idx + 1);
};

export async function sha256Hex(data: Uint8Array): Promise<string> {
  const buffer = await crypto.subtle.digest('SHA-256', data as unknown as ArrayBuffer);
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function encode(data: Uint8Array | string): Uint8Array {
  return typeof data === 'string' ? new TextEncoder().encode(data) : data;
}

export function decode(data: Uint8Array): string {
  return new TextDecoder().decode(data);
}

export function hasOpfs(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.storage !== 'undefined' &&
    typeof navigator.storage.getDirectory === 'function'
  );
}

export { MemoryFS } from './memory';
export { OpfsFS } from './opfs';
export { IdbFS } from './idb';

export async function createProjectFs(profileId: string, projectId: string): Promise<ProjectFS> {
  const { OpfsFS } = await import('./opfs');
  const { IdbFS } = await import('./idb');
  if (hasOpfs()) return new OpfsFS(profileId, projectId);
  return new IdbFS(profileId, projectId);
}
