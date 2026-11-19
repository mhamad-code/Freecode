import { describe, expect, it } from 'vitest';
import { decode, safePath, type ProjectFS } from '../projectFs';
import { MemoryFS } from '../projectFs/memory';

describe('safePath', () => {
  it('normalizes separators and dot segments', () => {
    expect(safePath('src//lib/./a.ts')).toBe('src/lib/a.ts');
    expect(safePath('')).toBe('');
  });

  it('rejects traversal, absolute paths and backslashes', () => {
    expect(() => safePath('../etc/passwd')).toThrow();
    expect(() => safePath('/etc/passwd')).toThrow();
    expect(() => safePath('src\\lib\\a.ts')).toThrow();
    expect(() => safePath('a\0b')).toThrow();
  });
});

async function contract(name: string, fs: ProjectFS) {
  describe(`${name} ProjectFS contract`, () => {
    it('writes, reads and lists', async () => {
      await fs.write('src/index.ts', 'hello');
      await fs.mkdir('src/lib');
      await fs.write('src/lib/util.ts', 'export {}');
      expect(decode(await fs.read('src/index.ts'))).toBe('hello');
      const entries = await fs.list('src');
      expect(entries.map((e) => e.path)).toEqual(['src/index.ts', 'src/lib']);
      expect(entries.find((e) => e.path === 'src/lib')?.type).toBe('dir');
    });

    it('walks and snapshots', async () => {
      const walk = await fs.walk();
      expect(walk.map((f) => f.path)).toContain('src/lib/util.ts');
      const snapshot = await fs.snapshot();
      expect(Object.keys(snapshot)).toHaveLength(walk.length);
      expect(snapshot['src/index.ts']).toMatch(/^[a-f0-9]{64}$/);
    });

    it('computes usage', async () => {
      const usage = await fs.usage();
      expect(usage.files).toBeGreaterThan(0);
      expect(usage.bytes).toBeGreaterThan(0);
    });

    it('refuses a non-empty recursive delete without the flag', async () => {
      await expect(fs.remove('src')).rejects.toThrow();
      await fs.remove('src', { recursive: true });
      expect(await fs.stat('src')).toBeUndefined();
    });

    it('reports stat types', async () => {
      await fs.write('a.txt', 'x');
      expect((await fs.stat('a.txt'))?.type).toBe('file');
      expect((await fs.stat('missing'))).toBeUndefined();
    });
  });
}

contract('MemoryFS', new MemoryFS());
