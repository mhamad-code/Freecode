import { describe, expect, it } from 'vitest';
import {
  captureCheckpoint,
  checkpointsFor,
  clearCheckpoints,
  diffContents,
  getCheckpoint,
  treeFromContents,
} from '../checkpoints';

describe('checkpoint snapshots', () => {
  it('captures a copy, so later store writes do not mutate it', () => {
    clearCheckpoints();
    const files: Record<string, string> = {
      'index.html': '<h1>a</h1>',
      'src/app.ts': 'export const a = 1;',
    };
    const checkpoint = captureCheckpoint('s1', 'Before this message', files);
    files['index.html'] = '<h1>b</h1>';
    files['new.ts'] = 'export const b = 2;';

    const stored = getCheckpoint(checkpoint.id);
    expect(stored).toBeDefined();
    expect(stored?.files).toEqual({
      'index.html': '<h1>a</h1>',
      'src/app.ts': 'export const a = 1;',
    });
    expect(stored?.label).toBe('Before this message');
  });

  it('keeps checkpoints per session and returns them oldest first', () => {
    clearCheckpoints();
    const first = captureCheckpoint('s1', 'one', { 'a.txt': '1' });
    const second = captureCheckpoint('s1', 'two', { 'a.txt': '2' });
    captureCheckpoint('s2', 'other', { 'b.txt': '1' });

    const mine = checkpointsFor('s1');
    expect(mine.map((c) => c.id)).toEqual([first.id, second.id]);
    expect(checkpointsFor('s2')).toHaveLength(1);
  });

  it('caps the history per session', () => {
    clearCheckpoints();
    for (let i = 0; i < 25; i++) captureCheckpoint('s1', `cp ${i}`, { 'a.txt': String(i) });
    const mine = checkpointsFor('s1');
    expect(mine).toHaveLength(20);
    expect(mine[mine.length - 1].label).toBe('cp 24');
    expect(getCheckpoint(mine[0].id)).toBeDefined();
  });
});

describe('content diff', () => {
  it('reports added, modified and removed paths with a total', () => {
    const diff = diffContents(
      { 'a.txt': 'one', 'b.txt': 'two', 'gone.txt': 'x' },
      { 'a.txt': 'one', 'b.txt': 'changed', 'new.txt': 'y' },
    );
    expect(diff.added).toEqual(['new.txt']);
    expect(diff.modified).toEqual(['b.txt']);
    expect(diff.removed).toEqual(['gone.txt']);
    expect(diff.total).toBe(3);
  });

  it('is zero when nothing changed', () => {
    const files = { 'a.txt': 'one' };
    expect(diffContents(files, { ...files }).total).toBe(0);
  });
});

describe('treeFromContents', () => {
  it('rebuilds nested folders in path order', () => {
    const tree = treeFromContents({
      'src/routes/index.tsx': 'export {}',
      'src/app.ts': 'export {}',
      'index.html': '<h1></h1>',
    });
    expect(tree.map((n) => n.path)).toEqual(['index.html', 'src']);
    const src = tree.find((n) => n.path === 'src');
    expect(src?.type).toBe('dir');
    expect(src?.children?.map((n) => n.path)).toEqual(['src/app.ts', 'src/routes']);
    const routes = src?.children?.find((n) => n.path === 'src/routes');
    expect(routes?.children?.map((n) => n.path)).toEqual(['src/routes/index.tsx']);
  });

  it('returns an empty tree for an empty project', () => {
    expect(treeFromContents({})).toEqual([]);
  });
});
