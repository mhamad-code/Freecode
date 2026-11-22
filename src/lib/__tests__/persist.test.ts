import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.stubGlobal('localStorage', {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
});

const { buildSnapshot, hydrateStore, loadProfile, saveProfile, isProfileSnapshot } =
  await import('../persist');
const { checkpointsFor, clearCheckpoints } = await import('../checkpoints');
const { useStore } = await import('../../store');

type Db = import('../../storage/db').KeyValueDB;
type Snapshot = import('../persist').ProfileSnapshot;

const fakeDb = (): Db => {
  const rows = new Map<string, unknown>();
  const key = (store: string) => `k:${store}`;
  return {
    async get(store) {
      return rows.get(key(store));
    },
    async put(store, value) {
      rows.set(key(store), value);
      return value;
    },
    async delete(store) {
      rows.delete(key(store));
    },
    async getAll(store) {
      return rows.has(key(store)) ? [rows.get(key(store))] : [];
    },
    async getAllFromIndex() {
      return [];
    },
    async clear(store) {
      rows.delete(key(store));
    },
  };
};

const session = (id: string) => ({
  id,
  title: id,
  project: '',
  status: 'idle' as const,
  mode: 'build' as const,
  draft: '',
  queued: [],
  model: '',
  effort: 'high' as const,
  updatedAt: 1,
  messages: [],
});

beforeEach(() => {
  clearCheckpoints();
  useStore.setState({
    files: [],
    fileContents: {},
    activeSessionId: 'a',
    sessions: [session('a')],
  });
});

describe('profile persistence', () => {
  it('saves and loads chats, files and checkpoints', async () => {
    const db = fakeDb();
    const snapshot = buildSnapshot({
      activeSessionId: 'b',
      sessions: [session('a'), session('b')],
      files: [{ name: 'x.ts', path: 'x.ts', type: 'file' }],
      fileContents: { 'x.ts': 'export {}' },
    });
    await saveProfile(db, snapshot);

    const loaded = await loadProfile(db);
    expect(loaded?.sessions.map((s) => s.id)).toEqual(['a', 'b']);
    expect(loaded?.activeSessionId).toBe('b');
    expect(loaded?.fileContents).toEqual({ 'x.ts': 'export {}' });
    expect(isProfileSnapshot(loaded)).toBe(true);
  });

  it('hydrates the store and the checkpoint history', async () => {
    const db = fakeDb();
    await saveProfile(
      db,
      buildSnapshot({
        activeSessionId: 'b',
        sessions: [session('a'), session('b')],
        files: [],
        fileContents: { 'index.html': '<h1>saved</h1>' },
      }),
    );
    // write a checkpoint into the snapshot directly
    const saved = (await db.get('meta', 'profile')) as Snapshot;
    await saveProfile(db, {
      ...saved,
      checkpoints: [
        { id: 'cp1', sessionId: 'b', label: 'Before', at: 1, seq: 1, files: { 'a.ts': 'x' } },
      ],
    });

    expect(await hydrateStore(db)).toBe(true);
    const state = useStore.getState();
    expect(state.sessions.map((s) => s.id)).toEqual(['a', 'b']);
    expect(state.activeSessionId).toBe('b');
    expect(state.fileContents['index.html']).toBe('<h1>saved</h1>');
    expect(state.files.map((n) => n.path)).toEqual(['index.html']);
    expect(checkpointsFor('b').map((c) => c.id)).toEqual(['cp1']);
  });

  it('marks a turn that was running when the tab closed as stopped', async () => {
    const db = fakeDb();
    await saveProfile(db, {
      version: 1,
      savedAt: '',
      activeSessionId: 'a',
      sessions: [
        {
          ...session('a'),
          status: 'running',
          messages: [
            {
              id: 't1',
              role: 'assistant',
              kind: 'assistant',
              turn: {
                id: 't1',
                blocks: [],
                final: '',
                followUps: [],
                running: true,
                startedAt: 1,
                collapsed: false,
              },
            },
          ],
        },
      ],
      files: [],
      fileContents: {},
      checkpoints: [],
    } as never);

    const loaded = await loadProfile(db);
    expect(loaded?.sessions[0].status).toBe('idle');
    const message = loaded?.sessions[0].messages[0];
    expect(message?.kind === 'assistant' && message.turn.running).toBe(false);
    expect(message?.kind === 'assistant' && message.turn.collapsed).toBe(true);
  });

  it('ignores a profile written by a newer build', async () => {
    const db = fakeDb();
    await db.put('meta', { version: 99, sessions: [] }, 'profile');
    expect(await loadProfile(db)).toBeUndefined();
    expect(await hydrateStore(db)).toBe(false);
  });
});
