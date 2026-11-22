import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.stubGlobal('localStorage', {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
});

const { useStore } = await import('../store');
const { captureCheckpoint, clearCheckpoints } = await import('../lib/checkpoints');
const { treeFromContents } = await import('../lib/checkpoints');

const seedTurn = (checkpointId: string, turnId: string) => {
  const state = useStore.getState();
  const sid = state.activeSessionId;
  useStore.setState({
    sessions: state.sessions.map((s) =>
      s.id === sid
        ? {
            ...s,
            status: 'error',
            messages: [
              { id: 'u1', role: 'user', kind: 'user', text: 'build it', at: 1 },
              {
                id: turnId,
                role: 'assistant',
                kind: 'assistant',
                turn: {
                  id: turnId,
                  blocks: [],
                  final: '',
                  followUps: [],
                  running: false,
                  startedAt: 2,
                  collapsed: false,
                  checkpoint: { id: checkpointId, label: 'Before this message', files: 1 },
                  recovery: { changed: 2 },
                },
              },
            ],
          }
        : s,
    ),
  });
};

beforeEach(() => {
  clearCheckpoints();
  useStore.setState({ files: [], fileContents: {}, openFilePath: null });
});

describe('project files and checkpoints', () => {
  it('applies an agent write to the tree and to the editor contents', () => {
    useStore.getState().writeProjectFile('src/app.ts', 'export const a = 1;\n');
    const state = useStore.getState();
    expect(state.fileContents['src/app.ts']).toBe('export const a = 1;\n');
    expect(state.files.map((n) => n.path)).toEqual(['src']);
    expect(state.files[0].children?.map((n) => n.path)).toEqual(['src/app.ts']);
    expect(state.files[0].children?.[0].status).toBe('A');

    useStore.getState().writeProjectFile('src/app.ts', 'export const a = 2;\n');
    const again = useStore.getState();
    expect(again.fileContents['src/app.ts']).toBe('export const a = 2;\n');
    expect(treeFromContents(again.fileContents).map((n) => n.path)).toEqual(['src']);
  });

  it('restores files from the checkpoint and drops files created after it', () => {
    useStore.getState().createFile('index.html');
    useStore.getState().saveFile('index.html', '<h1>v1</h1>');
    const checkpoint = captureCheckpoint('x', 'Before this message', useStore.getState().fileContents);
    seedTurn(checkpoint.id, 't1');

    // What the agent did during the run.
    useStore.getState().writeProjectFile('index.html', '<h1>v2</h1>');
    useStore.getState().writeProjectFile('notes.md', 'written by the agent');

    useStore.getState().restoreCheckpoint('t1', 'code');

    const restored = useStore.getState();
    expect(restored.fileContents).toEqual({ 'index.html': '<h1>v1</h1>' });
    expect('notes.md' in restored.fileContents).toBe(false);
    expect(restored.files.map((n) => n.path)).toEqual(['index.html']);
    // The turn and its conversation stay, but the recovery offer is gone.
    const turn = restored.sessions[0].messages[1];
    expect(turn.kind).toBe('assistant');
    if (turn.kind === 'assistant') expect(turn.turn.recovery).toBeUndefined();
  });

  it('restoring conversation removes the turn and its user message', () => {
    useStore.getState().createFile('index.html');
    useStore.getState().saveFile('index.html', 'v1');
    const checkpoint = captureCheckpoint('x', 'Before this message', useStore.getState().fileContents);
    seedTurn(checkpoint.id, 't1');

    useStore.getState().restoreCheckpoint('t1', 'chat');
    const messages = useStore.getState().sessions[0].messages;
    expect(messages).toHaveLength(0);
    expect(useStore.getState().fileContents['index.html']).toBe('v1');
  });
});

describe('steering queue', () => {
  it('queues a message typed during a run instead of dropping it', () => {
    const state = useStore.getState();
    const sid = state.activeSessionId;
    useStore.setState({
      sessions: state.sessions.map((s) => (s.id === sid ? { ...s, status: 'running' } : s)),
    });
    useStore.getState().send('  also add a footer  ');
    const session = useStore.getState().sessions[0];
    expect(session.queued).toEqual(['also add a footer']);
    expect(session.messages).toHaveLength(0);
    expect(session.status).toBe('running');

    useStore.getState().removeQueued(0);
    expect(useStore.getState().sessions[0].queued).toEqual([]);
  });
});
