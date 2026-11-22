import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import {
  ARCHIVE_FORMAT,
  archiveName,
  buildArchive,
  isArchive,
  readArchive,
} from '../archive';
import type { Session } from '../types';

const session: Session = {
  id: 's1',
  title: 'Build it',
  project: '',
  status: 'idle',
  mode: 'build',
  draft: '',
  queued: [],
  model: '',
  effort: 'high',
  updatedAt: 1,
  messages: [{ id: 'm1', role: 'user', kind: 'user', text: 'hi', at: 1 }],
};

describe('.freecode archive', () => {
  it('round-trips settings, sessions, checkpoints and files', () => {
    const bytes = buildArchive({
      settings: { accent: '#0a0a0a' },
      activeSessionId: 's1',
      sessions: [session],
      checkpoints: [
        { id: 'c1', sessionId: 's1', label: 'Before', at: 1, seq: 1, files: { 'a.ts': 'one' } },
      ],
      files: { 'index.html': '<h1>hi</h1>', 'src/app.ts': 'export {}' },
    });

    expect(isArchive(bytes)).toBe(true);
    const archive = readArchive(bytes);
    expect(archive.manifest.format).toBe(ARCHIVE_FORMAT);
    expect(archive.manifest.sessions).toHaveLength(1);
    expect(archive.manifest.activeSessionId).toBe('s1');
    expect(archive.manifest.checkpoints[0].files).toEqual({ 'a.ts': 'one' });
    expect(archive.files).toEqual({
      'index.html': '<h1>hi</h1>',
      'src/app.ts': 'export {}',
    });
    expect(archiveName(new Date('2026-11-22T10:00:00Z'))).toBe('freecode-2026-11-22.freecode');
  });

  it('drops archive paths that would escape the project', () => {
    const bytes = buildArchive({
      activeSessionId: 's1',
      sessions: [session],
      checkpoints: [],
      files: { '../evil.ts': 'x', '/abs.ts': 'y', 'ok/file.ts': 'z' },
    });
    expect(readArchive(bytes).files).toEqual({ 'ok/file.ts': 'z' });
  });

  it('reads files only from the files/ prefix', () => {
    const bytes = zipSync({
      'manifest.json': strToU8(
        JSON.stringify({ format: 'freecode', version: 1, sessions: [] }),
      ),
      'files/index.html': strToU8('<h1>x</h1>'),
      'notes.md': strToU8('not part of the project'),
    });
    expect(readArchive(bytes).files).toEqual({ 'index.html': '<h1>x</h1>' });
  });

  it('refuses other formats, newer versions and damaged archives', () => {
    expect(() => readArchive(strToU8('{"format":"freecode"}'))).toThrow(/not a Freecode archive/);
    expect(() =>
      readArchive(
        zipSync({
          'manifest.json': strToU8(
            JSON.stringify({ format: 'other', version: 1, sessions: [] }),
          ),
        }),
      ),
    ).toThrow(/not a Freecode archive/);
    expect(() =>
      readArchive(
        zipSync({
          'manifest.json': strToU8(
            JSON.stringify({ format: 'freecode', version: 99, sessions: [] }),
          ),
        }),
      ),
    ).toThrow(/newer version/);
    expect(() => readArchive(zipSync({ 'manifest.json': strToU8('nope') }))).toThrow(
      /not valid JSON/,
    );
  });
});
