import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import type { Settings } from '../store';
import type { Session } from './types';
import { safePath } from '../storage/projectFs';
import type { Checkpoint } from './checkpoints';

/**
 * The `.freecode` archive: one ZIP with `manifest.json` (settings, sessions and
 * checkpoints) plus `files/<path>` for every project file.
 */
export const ARCHIVE_FORMAT = 'freecode';
export const ARCHIVE_VERSION = 1;
export const ARCHIVE_EXTENSION = '.freecode';
const MANIFEST = 'manifest.json';
const FILES_PREFIX = 'files/';

export interface ArchiveManifest {
  format: typeof ARCHIVE_FORMAT;
  version: number;
  createdAt: string;
  activeSessionId: string;
  settings?: Partial<Settings>;
  sessions: Session[];
  checkpoints: Checkpoint[];
}

export interface ArchivePayload {
  settings?: Partial<Settings>;
  activeSessionId: string;
  sessions: Session[];
  checkpoints: Checkpoint[];
  files: Record<string, string>;
}

export interface Archive {
  manifest: ArchiveManifest;
  files: Record<string, string>;
}

/** Archive paths never escape the project root. */
function archivePath(path: string): string | null {
  try {
    return safePath(path) || null;
  } catch {
    return null;
  }
}

export function buildArchive(payload: ArchivePayload): Uint8Array {
  const manifest: ArchiveManifest = {
    format: ARCHIVE_FORMAT,
    version: ARCHIVE_VERSION,
    createdAt: new Date().toISOString(),
    activeSessionId: payload.activeSessionId,
    settings: payload.settings,
    sessions: payload.sessions,
    checkpoints: payload.checkpoints,
  };
  const entries: Record<string, Uint8Array> = {
    [MANIFEST]: strToU8(JSON.stringify(manifest, null, 2)),
  };
  for (const [path, contents] of Object.entries(payload.files)) {
    const safe = archivePath(path);
    if (!safe) continue;
    entries[`${FILES_PREFIX}${safe}`] = strToU8(contents);
  }
  return zipSync(entries, { level: 6 });
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function isArchive(bytes: Uint8Array): boolean {
  return bytes.length > 1 && bytes[0] === 0x50 && bytes[1] === 0x4b;
}

export function readArchive(bytes: Uint8Array): Archive {
  if (!isArchive(bytes)) throw new Error('This is not a Freecode archive.');
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(bytes);
  } catch {
    throw new Error('The archive is damaged and cannot be read.');
  }
  const raw = entries[MANIFEST];
  if (!raw) throw new Error('The archive has no manifest.');
  let manifest: unknown;
  try {
    manifest = JSON.parse(strFromU8(raw));
  } catch {
    throw new Error('The archive manifest is not valid JSON.');
  }
  if (!isRecord(manifest) || manifest.format !== ARCHIVE_FORMAT) {
    throw new Error('This is not a Freecode archive.');
  }
  if (typeof manifest.version !== 'number' || manifest.version > ARCHIVE_VERSION) {
    throw new Error('This archive needs a newer version of Freecode.');
  }
  if (!Array.isArray(manifest.sessions)) {
    throw new Error('The archive manifest has no sessions.');
  }

  const files: Record<string, string> = {};
  for (const [name, data] of Object.entries(entries)) {
    if (!name.startsWith(FILES_PREFIX) || name.endsWith('/')) continue;
    const safe = archivePath(name.slice(FILES_PREFIX.length));
    if (!safe) continue;
    files[safe] = strFromU8(data);
  }

  return {
    manifest: {
      format: ARCHIVE_FORMAT,
      version: manifest.version,
      createdAt: typeof manifest.createdAt === 'string' ? manifest.createdAt : '',
      activeSessionId:
        typeof manifest.activeSessionId === 'string' ? manifest.activeSessionId : '',
      settings: isRecord(manifest.settings)
        ? (manifest.settings as Partial<Settings>)
        : undefined,
      sessions: manifest.sessions as Session[],
      checkpoints: Array.isArray(manifest.checkpoints)
        ? (manifest.checkpoints as Checkpoint[])
        : [],
    },
    files,
  };
}

export function archiveName(date = new Date()): string {
  return `freecode-${date.toISOString().slice(0, 10)}${ARCHIVE_EXTENSION}`;
}

export function downloadArchive(name: string, bytes: Uint8Array): void {
  const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
