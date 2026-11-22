import { baseName, encode, parentPath, safePath, sha256Hex, type FSStat, type ProjectFS } from './index';

interface Entry {
  data: Uint8Array;
  mtime: number;
}

export interface MemorySnapshot {
  files: Record<string, { b64: string; mtime: number }>;
  dirs: string[];
}

function toB64(data: Uint8Array): string {
  let out = '';
  for (const byte of data) out += String.fromCharCode(byte);
  return btoa(out);
}

function fromB64(value: string): Uint8Array {
  const raw = atob(value);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export class MemoryFS implements ProjectFS {
  private files = new Map<string, Entry>();
  private dirs = new Set<string>();

  constructor() {
    this.dirs.add('');
  }

  private ensureParents(path: string) {
    let parent = parentPath(safePath(path));
    const chain: string[] = [];
    while (parent) {
      chain.push(parent);
      parent = parentPath(parent);
    }
    for (const dir of chain.reverse()) this.dirs.add(dir);
  }

  async list(dir: string): Promise<FSStat[]> {
    const root = safePath(dir);
    const prefix = root ? `${root}/` : '';
    const out = new Map<string, FSStat>();
    for (const path of this.dirs) {
      if (!path || !path.startsWith(prefix)) continue;
      const rest = path.slice(prefix.length);
      if (!rest || rest.includes('/')) continue;
      out.set(path, { path, type: 'dir', size: 0, mtime: 0 });
    }
    for (const [path, entry] of this.files) {
      if (!path.startsWith(prefix)) continue;
      const rest = path.slice(prefix.length);
      if (!rest || rest.includes('/')) continue;
      out.set(path, { path, type: 'file', size: entry.data.length, mtime: entry.mtime });
    }
    return [...out.values()].sort((a, b) => a.path.localeCompare(b.path));
  }

  async read(path: string): Promise<Uint8Array> {
    const entry = this.files.get(safePath(path));
    if (!entry) throw new Error(`File not found: ${path}`);
    return entry.data.slice();
  }

  async write(path: string, data: Uint8Array | string): Promise<void> {
    const safe = safePath(path);
    if (!safe) throw new Error('Cannot write to the root');
    this.ensureParents(safe);
    this.files.set(safe, { data: encode(data).slice(), mtime: Date.now() });
  }

  async remove(path: string, opts: { recursive?: boolean } = {}): Promise<void> {
    const safe = safePath(path);
    if (!safe) throw new Error('Cannot remove the root');
    const prefix = `${safe}/`;
    // The entry itself is deleted too; removing only its descendants left the
    // file in place (and persisted it back through the IndexedDB fallback).
    const exact = this.files.has(safe) ? [safe] : [];
    const children = [...this.files.keys()].filter((p) => p.startsWith(prefix));
    const childDirs = [...this.dirs].filter((p) => p === safe || p.startsWith(prefix));
    if ((exact.length || children.length || childDirs.length > 1) && !opts.recursive) {
      throw new Error('Directory is not empty; pass recursive to remove it');
    }
    for (const p of [...exact, ...children]) this.files.delete(p);
    for (const dir of childDirs) this.dirs.delete(dir);
  }

  async mkdir(path: string): Promise<void> {
    const safe = safePath(path);
    if (safe) this.ensureParents(safe);
    this.dirs.add(safe);
  }

  async stat(path: string): Promise<FSStat | undefined> {
    const safe = safePath(path);
    const entry = this.files.get(safe);
    if (entry) return { path: safe, type: 'file', size: entry.data.length, mtime: entry.mtime };
    if (this.dirs.has(safe)) return { path: safe, type: 'dir', size: 0, mtime: 0 };
    return undefined;
  }

  async walk(): Promise<FSStat[]> {
    return [...this.files.entries()]
      .map(([path, entry]) => ({
        path,
        type: 'file' as const,
        size: entry.data.length,
        mtime: entry.mtime,
      }))
      .sort((a, b) => a.path.localeCompare(b.path));
  }

  async snapshot(): Promise<Record<string, string>> {
    const out: Record<string, string> = {};
    for (const [path, entry] of this.files) out[path] = await sha256Hex(entry.data);
    return out;
  }

  async usage(): Promise<{ bytes: number; files: number }> {
    let bytes = 0;
    for (const entry of this.files.values()) bytes += entry.data.length;
    return { bytes, files: this.files.size };
  }

  toJSON(): MemorySnapshot {
    const files: MemorySnapshot['files'] = {};
    for (const [path, entry] of this.files) {
      files[path] = { b64: toB64(entry.data), mtime: entry.mtime };
    }
    return { files, dirs: [...this.dirs] };
  }

  static fromJSON(snapshot: MemorySnapshot): MemoryFS {
    const fs = new MemoryFS();
    for (const dir of snapshot.dirs) if (dir) fs.dirs.add(dir);
    for (const [path, entry] of Object.entries(snapshot.files ?? {})) {
      fs.files.set(safePath(path), { data: fromB64(entry.b64), mtime: entry.mtime });
    }
    return fs;
  }

  /** Convenience for tools: list every file path. */
  paths(): string[] {
    return [...this.files.keys()].sort();
  }

  nameOf(path: string): string {
    return baseName(path);
  }
}
