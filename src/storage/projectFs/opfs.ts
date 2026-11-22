import {
  baseName,
  parentPath,
  safePath,
  sha256Hex,
  type FSStat,
  type ProjectFS,
} from './index';

async function writable(handle: FileSystemFileHandle): Promise<FileSystemWritableFileStream> {
  return handle.createWritable();
}

type DirEntries = {
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
};

export class OpfsFS implements ProjectFS {
  private readonly root: Promise<FileSystemDirectoryHandle>;

  constructor(profileId: string, projectId: string) {
    this.root = (async () => {
      const storage = navigator.storage as StorageManager;
      const origin = await storage.getDirectory();
      const profiles = await origin.getDirectoryHandle('profiles', { create: true });
      const profile = await profiles.getDirectoryHandle(profileId, { create: true });
      const projects = await profile.getDirectoryHandle('projects', { create: true });
      const project = await projects.getDirectoryHandle(projectId, { create: true });
      return project.getDirectoryHandle('tree', { create: true });
    })();
  }

  private async dir(path: string, create: boolean): Promise<FileSystemDirectoryHandle> {
    let handle = await this.root;
    for (const segment of safePath(path).split('/').filter(Boolean)) {
      handle = await handle.getDirectoryHandle(segment, { create });
    }
    return handle;
  }

  private async fileHandle(path: string, create: boolean): Promise<FileSystemFileHandle> {
    const safe = safePath(path);
    if (!safe) throw new Error('A file path is required');
    const parent = await this.dir(parentPath(safe), create);
    return parent.getFileHandle(baseName(safe), { create });
  }

  async list(dir: string): Promise<FSStat[]> {
    const handle = await this.dir(dir, false);
    const out: FSStat[] = [];
    const base = safePath(dir);
    for await (const [name, entry] of (handle as unknown as DirEntries).entries()) {
      const path = safePath(base ? `${base}/${name}` : name);
      if (entry.kind === 'directory') {
        out.push({ path, type: 'dir', size: 0, mtime: 0 });
      } else {
        const file = await (entry as FileSystemFileHandle).getFile();
        out.push({ path, type: 'file', size: file.size, mtime: file.lastModified });
      }
    }
    return out.sort((a, b) => a.path.localeCompare(b.path));
  }

  async read(path: string): Promise<Uint8Array> {
    const handle = await this.fileHandle(path, false);
    const file = await handle.getFile();
    return new Uint8Array(await file.arrayBuffer());
  }

  async write(path: string, data: Uint8Array | string): Promise<void> {
    const handle = await this.fileHandle(path, true);
    const stream = await writable(handle);
    const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
    await stream.write(bytes as unknown as FileSystemWriteChunkType);
    await stream.close();
  }

  async remove(path: string, opts: { recursive?: boolean } = {}): Promise<void> {
    const safe = safePath(path);
    if (!safe) throw new Error('Cannot remove the root');
    const parent = await this.dir(parentPath(safe), false);
    await parent.removeEntry(baseName(safe), { recursive: opts.recursive ?? false });
  }

  async mkdir(path: string): Promise<void> {
    await this.dir(path, true);
  }

  async stat(path: string): Promise<FSStat | undefined> {
    const safe = safePath(path);
    try {
      const handle = await this.fileHandle(safe, false);
      const file = await handle.getFile();
      return { path: safe, type: 'file', size: file.size, mtime: file.lastModified };
    } catch {
      try {
        await this.dir(safe, false);
        return { path: safe, type: 'dir', size: 0, mtime: 0 };
      } catch {
        return undefined;
      }
    }
  }

  private async walkDir(handle: FileSystemDirectoryHandle, prefix: string, out: FSStat[]) {
    for await (const [name, entry] of (handle as unknown as DirEntries).entries()) {
      const path = safePath(prefix ? `${prefix}/${name}` : name);
      if (entry.kind === 'directory') {
        await this.walkDir(entry as FileSystemDirectoryHandle, path, out);
      } else {
        const file = await (entry as FileSystemFileHandle).getFile();
        out.push({ path, type: 'file', size: file.size, mtime: file.lastModified });
      }
    }
  }

  async walk(): Promise<FSStat[]> {
    const out: FSStat[] = [];
    await this.walkDir(await this.root, '', out);
    return out.sort((a, b) => a.path.localeCompare(b.path));
  }

  async snapshot(): Promise<Record<string, string>> {
    const out: Record<string, string> = {};
    for (const file of await this.walk()) {
      out[file.path] = await sha256Hex(await this.read(file.path));
    }
    return out;
  }

  async usage(): Promise<{ bytes: number; files: number }> {
    const files = await this.walk();
    return { bytes: files.reduce((sum, f) => sum + f.size, 0), files: files.length };
  }
}
