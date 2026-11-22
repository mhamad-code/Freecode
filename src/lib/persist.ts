import { openProfileDb, type KeyValueDB } from '../storage/db';
import type { FileNode, Session } from './types';
import {
  exportCheckpoints,
  restoreCheckpoints,
  type Checkpoint,
} from './checkpoints';
import { useStore, type Settings } from '../store';

/** The device-local profile: one browser, one project list, one history. */
export const PROFILE_ID = 'local';
export const SNAPSHOT_VERSION = 1;
const META_STORE = 'meta';
const META_KEY = 'profile';
const SAVE_DELAY_MS = 800;

export interface ProfileSnapshot {
  version: number;
  savedAt: string;
  activeSessionId: string;
  sessions: Session[];
  files: FileNode[];
  fileContents: Record<string, string>;
  binaryFiles?: Record<string, { size: number; type: string; data: string }>;
  checkpoints: Checkpoint[];
}

export interface SnapshotSource {
  activeSessionId: string;
  sessions: Session[];
  files: FileNode[];
  fileContents: Record<string, string>;
  binaryFiles?: Record<string, { size: number; type: string; data: string }>;
}

export function buildSnapshot(source: SnapshotSource): ProfileSnapshot {
  return {
    version: SNAPSHOT_VERSION,
    savedAt: new Date().toISOString(),
    activeSessionId: source.activeSessionId,
    sessions: source.sessions,
    files: source.files,
    fileContents: source.fileContents,
    binaryFiles: source.binaryFiles,
    checkpoints: exportCheckpoints(),
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isSession = (value: unknown): value is Session =>
  isRecord(value) && typeof value.id === 'string' && Array.isArray(value.messages);

/** A running turn cannot survive a reload: it becomes a stopped turn. */
function normalizeSessions(sessions: Session[]): Session[] {
  return sessions.filter(isSession).map((session) => {
    const idle = session.status === 'running' || session.status === 'waiting';
    return {
      ...session,
      queued: Array.isArray(session.queued) ? session.queued : [],
      status: idle ? 'idle' : session.status,
      messages: session.messages.map((message) => {
        if (message.kind !== 'assistant' || !message.turn.running) return message;
        return {
          ...message,
          turn: {
            ...message.turn,
            running: false,
            collapsed: true,
            permission: undefined,
            durationMs: message.turn.durationMs ?? Date.now() - message.turn.startedAt,
          },
        };
      }),
    };
  });
}

function isCheckpoint(value: unknown): value is Checkpoint {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.sessionId === 'string' &&
    isRecord(value.files) &&
    Object.values(value.files).every((text) => typeof text === 'string')
  );
}

export function isProfileSnapshot(value: unknown): value is ProfileSnapshot {
  if (!isRecord(value)) return false;
  if (typeof value.version !== 'number' || value.version > SNAPSHOT_VERSION) return false;
  if (!Array.isArray(value.sessions) || !value.sessions.every(isSession)) return false;
  if (value.fileContents !== undefined && !isRecord(value.fileContents)) return false;
  if (value.files !== undefined && !Array.isArray(value.files)) return false;
  return true;
}

export async function saveProfile(db: KeyValueDB, snapshot: ProfileSnapshot): Promise<void> {
  await db.put(META_STORE, snapshot, META_KEY);
}

export async function loadProfile(db: KeyValueDB): Promise<ProfileSnapshot | undefined> {
  const stored = await db.get(META_STORE, META_KEY);
  if (!isProfileSnapshot(stored)) return undefined;
  return {
    version: stored.version,
    savedAt: typeof stored.savedAt === 'string' ? stored.savedAt : '',
    activeSessionId: typeof stored.activeSessionId === 'string' ? stored.activeSessionId : '',
    sessions: normalizeSessions(stored.sessions),
    files: Array.isArray(stored.files) ? stored.files : [],
    fileContents: isRecord(stored.fileContents) ? (stored.fileContents as Record<string, string>) : {},
    binaryFiles: isRecord(stored.binaryFiles)
      ? (stored.binaryFiles as Record<string, { size: number; type: string; data: string }>)
      : undefined,
    checkpoints: Array.isArray(stored.checkpoints)
      ? stored.checkpoints.filter(isCheckpoint)
      : [],
  };
}

export interface SnapshotPayload {
  sessions: Session[];
  activeSessionId?: string;
  files?: FileNode[];
  fileContents?: Record<string, string>;
  binaryFiles?: Record<string, { size: number; type: string; data: string }>;
  checkpoints?: Checkpoint[];
  settings?: Partial<Settings>;
}

/** Applies a snapshot (from this device or an imported archive) to the store. */
export function applySnapshot(payload: SnapshotPayload): void {
  const sessions = normalizeSessions(payload.sessions);
  if (!sessions.length) return;
  restoreCheckpoints(payload.checkpoints ?? []);
  useStore.getState().hydrate({
    sessions,
    activeSessionId: payload.activeSessionId,
    files: payload.files,
    fileContents: payload.fileContents,
    binaryFiles: payload.binaryFiles,
    settings: payload.settings,
  });
}

/** Restores the persisted profile; returns false when there is nothing saved. */
export async function hydrateStore(db?: KeyValueDB): Promise<boolean> {
  try {
    const handle = db ?? (await openProfileDb(PROFILE_ID));
    const snapshot = await loadProfile(handle);
    if (!snapshot) return false;
    applySnapshot(snapshot);
    return true;
  } catch {
    // No IndexedDB (private mode, blocked storage): the app still runs, it just
    // does not survive a reload.
    return false;
  }
}

/**
 * Writes the profile after store changes, debounced, and once more when the tab
 * is hidden. Nothing here touches the provider keys: those stay in the vault.
 */
export function startPersistence(): () => void {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') return () => undefined;
  let db: Promise<KeyValueDB> | null = null;
  let timer: number | undefined;
  let saving = false;

  const handle = () => {
    db ??= openProfileDb(PROFILE_ID);
    return db;
  };

  const save = async () => {
    if (saving) {
      schedule();
      return;
    }
    saving = true;
    try {
      const state = useStore.getState();
      await saveProfile(await handle(), buildSnapshot(state));
    } catch {
      // Quota or a closed database: keep the app usable, try again next change.
    } finally {
      saving = false;
    }
  };

  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = window.setTimeout(() => {
      timer = undefined;
      void save();
    }, SAVE_DELAY_MS);
  };

  const flush = () => {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
    void save();
  };

  const unsubscribe = useStore.subscribe(schedule);
  window.addEventListener('pagehide', flush);
  return () => {
    unsubscribe();
    window.removeEventListener('pagehide', flush);
    if (timer) clearTimeout(timer);
  };
}
