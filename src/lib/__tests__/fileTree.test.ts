import { describe, expect, it } from 'vitest';
import { insertDir, insertFile, removeAt, renameAt, subtreePaths, findNode } from '../fileTree';
import type { FileNode } from '../types';

describe('fileTree', () => {
  it('keeps an empty folder that has no files', () => {
    const tree = insertDir([], 'empty/nested');
    expect(findNode(tree, 'empty')?.type).toBe('dir');
    expect(findNode(tree, 'empty/nested')?.children).toEqual([]);
  });

  it('creates parents for a nested file and sorts folders first', () => {
    const tree = insertFile(insertFile([], 'b.txt'), 'src/utils/a.ts');
    expect(tree.map((n) => n.name)).toEqual(['src', 'b.txt']);
    expect(findNode(tree, 'src/utils/a.ts')?.status).toBe('A');
  });

  it('renames a directory and every descendant path', () => {
    let tree = insertFile([], 'src/a.ts');
    tree = insertFile(tree, 'src/deep/b.ts');
    const renamed = renameAt(tree, 'src', 'lib');
    expect(findNode(renamed, 'lib/a.ts')).toBeTruthy();
    expect(findNode(renamed, 'lib/deep/b.ts')).toBeTruthy();
    expect(findNode(renamed, 'src')).toBeUndefined();
  });

  it('removes a node with its subtree and reports the paths', () => {
    let tree = insertFile([], 'src/a.ts');
    tree = insertFile(tree, 'src/deep/b.ts');
    expect(subtreePaths(tree, 'src').files.sort()).toEqual(['src/a.ts', 'src/deep/b.ts']);
    const removed = removeAt(tree, 'src');
    expect(removed).toEqual([]);
  });

  it('does not delete siblings when removing one file', () => {
    const tree = insertFile(insertFile([], 'a.ts'), 'b.ts');
    const left = removeAt(tree, 'a.ts') as FileNode[];
    expect(left.map((n) => n.path)).toEqual(['b.ts']);
  });
});
