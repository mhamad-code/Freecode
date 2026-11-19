import { openProfileDb, type KeyValueDB } from '../db';
import { MemoryFS, type MemorySnapshot } from './memory';
import type { FSStat, ProjectFS } from './index';

export class IdbFS implements ProjectFS {
  private mem: MemoryFS | null = null;
  private db: KeyValueDB | null = null;
  private readonly key: string;
  private readonly loading: Promise<void>;

  constructor(profileId: string, projectId: string) {
    this.key = `${profileId}:${projectId}`;
    this.loading = this.load(profileId);
  }

  private async load(profileId: string): Promise<void> {
    this.db = await openProfileDb(profileId);
    const record = (await this.db.get('projectFs', this.key)) as
      | { snapshot?: MemorySnapshot }
      | undefined;
    this.mem = record?.snapshot ? MemoryFS.fromJSON(record.snapshot) : new MemoryFS();
  }

  private async fs(): Promise<MemoryFS> {
    await this.loading;
    if (!this.mem) throw new Error('ProjectFS failed to initialise');
    return this.mem;
  }

  private async persist(): Promise<void> {
    if (!this.db || !this.mem) return;
    await this.db.put('projectFs', { snapshot: this.mem.toJSON() }, this.key);
  }

  async list(dir: string): Promise<FSStat[]> {
    return (await this.fs()).list(dir);
  }

  async read(path: string): Promise<Uint8Array> {
    return (await this.fs()).read(path);
  }

  async write(path: string, data: Uint8Array | string): Promise<void> {
    const fs = await this.fs();
    await fs.write(path, data);
    await this.persist();
  }

  async remove(path: string, opts?: { recursive?: boolean }): Promise<void> {
    const fs = await this.fs();
    await fs.remove(path, opts);
    await this.persist();
  }

  async mkdir(path: string): Promise<void> {
    const fs = await this.fs();
    await fs.mkdir(path);
    await this.persist();
  }

  async stat(path: string): Promise<FSStat | undefined> {
    return (await this.fs()).stat(path);
  }

  async walk(): Promise<FSStat[]> {
    return (await this.fs()).walk();
  }

  async snapshot(): Promise<Record<string, string>> {
    return (await this.fs()).snapshot();
  }

  async usage(): Promise<{ bytes: number; files: number }> {
    return (await this.fs()).usage();
  }
}
