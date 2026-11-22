import { describe, expect, it } from 'vitest';
import { MemoryFS } from '../../storage/projectFs/memory';
import {
  mountProjectFiles,
  readProjectFile,
  removeProjectPaths,
} from '../projectBridge';

describe('removing restored paths from the project FS', () => {
  it('deletes the files a checkpoint does not know about', async () => {
    const fs = new MemoryFS();
    // What the store had when the checkpoint was taken.
    await mountProjectFiles(fs, { 'index.html': '<h1>before</h1>' });
    // What the turn added on top of it.
    await mountProjectFiles(fs, {
      'index.html': '<h1>after</h1>',
      'notes.md': 'written by the agent',
      'src/extra/new.ts': 'export const x = 1;',
    });

    const removed = await removeProjectPaths(fs, ['notes.md', 'src/extra/new.ts']);

    expect(removed).toBe(2);
    expect((await fs.walk()).map((f) => f.path)).toEqual(['index.html']);
    expect(await fs.stat('notes.md')).toBeUndefined();
    // Empty folders left behind by the deleted files are pruned too.
    expect(await fs.stat('src')).toBeUndefined();
    expect(await readProjectFile(fs, 'notes.md')).toBeUndefined();
  });

  it('keeps a folder that still holds a file, and ignores paths that are gone', async () => {
    const fs = new MemoryFS();
    await mountProjectFiles(fs, { 'src/app.ts': 'a', 'src/deep/gone.ts': 'b' });

    const removed = await removeProjectPaths(fs, ['src/deep/gone.ts', 'missing.md']);

    expect(removed).toBe(1);
    expect((await fs.walk()).map((f) => f.path)).toEqual(['src/app.ts']);
    expect((await fs.stat('src'))?.type).toBe('dir');
    expect(await fs.stat('src/deep')).toBeUndefined();
  });

  it('rewrites a restored file so the next turn reads the checkpoint contents', async () => {
    const fs = new MemoryFS();
    await mountProjectFiles(fs, { 'index.html': '<h1>before</h1>' });
    await mountProjectFiles(fs, { 'index.html': '<h1>after</h1>' });

    await mountProjectFiles(fs, { 'index.html': '<h1>before</h1>' });

    expect(await readProjectFile(fs, 'index.html')).toBe('<h1>before</h1>');
  });
});
