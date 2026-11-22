import { describe, expect, it } from 'vitest';
import { checkPath, childPath, uniquePath } from '../pathValidation';

const empty = { files: [], folders: [] };

describe('checkPath', () => {
  it('accepts nested portable paths', () => {
    expect(checkPath('src/utils/a.ts', empty)).toEqual({ ok: true, path: 'src/utils/a.ts' });
    expect(checkPath('a', empty)).toEqual({ ok: true, path: 'a' });
  });

  it('rejects empty, backslash and control characters', () => {
    expect(checkPath('   ', empty)).toMatchObject({ ok: false, issue: 'empty' });
    expect(checkPath('a\\b.ts', empty)).toMatchObject({ ok: false, issue: 'backslash' });
    expect(checkPath('a\u0001b', empty)).toMatchObject({ ok: false, issue: 'control' });
  });

  it('rejects . and .. segments and empty segments', () => {
    expect(checkPath('.', empty)).toMatchObject({ ok: false, issue: 'dot' });
    expect(checkPath('..', empty)).toMatchObject({ ok: false, issue: 'dot' });
    expect(checkPath('src/../a', empty)).toMatchObject({ ok: false, issue: 'dot' });
    expect(checkPath('src//a', empty)).toMatchObject({ ok: false, issue: 'segment-empty' });
    expect(checkPath('/a', empty)).toMatchObject({ ok: false, issue: 'dot' });
  });

  it('rejects long segments and long paths', () => {
    expect(checkPath('a'.repeat(256), empty)).toMatchObject({ ok: false, issue: 'segment-long' });
    expect(checkPath(`${'a'.repeat(200)}/${'b'.repeat(200)}/${'c'.repeat(200)}/${'d'.repeat(200)}/${'e'.repeat(200)}/${'f'.repeat(200)}`, empty))
      .toMatchObject({ ok: false, issue: 'too-long' });
  });

  it('rejects duplicates case-insensitively and files used as folders', () => {
    expect(checkPath('Notes.md', { files: ['notes.md'], folders: [] })).toMatchObject({
      ok: false,
      issue: 'exists',
    });
    expect(checkPath('a.ts/b.ts', { files: ['a.ts'], folders: [] })).toMatchObject({
      ok: false,
      issue: 'parent-is-file',
    });
  });
});

describe('path helpers', () => {
  it('joins a parent without a leading slash', () => {
    expect(childPath('', 'a.ts')).toBe('a.ts');
    expect(childPath('src', 'a.ts')).toBe('src/a.ts');
  });

  it('keeps both files with a numbered suffix', () => {
    const taken = new Set(['a.ts', 'a (2).ts']);
    expect(uniquePath('a.ts', taken)).toBe('a (3).ts');
    expect(uniquePath('b.ts', taken)).toBe('b.ts');
  });
});
