import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.stubGlobal('localStorage', {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
});

const bridge = vi.hoisted(() => ({ removeProjectFiles: vi.fn(async () => 0) }));

vi.mock('../lib/projectBridge', () => ({
  removeProjectFiles: bridge.removeProjectFiles,
  projectFsFor: vi.fn(),
}));

const { useStore } = await import('../store');
const { captureCheckpoint, clearCheckpoints } = await import('../lib/checkpoints');

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
                },
              },
            ],
          }
        : s,
    ),
  });
};

beforeEach(() => {
  bridge.removeProjectFiles.mockClear();
  clearCheckpoints();
  useStore.setState({ files: [], fileContents: {}, openFilePath: null });
});

describe('restoring a checkpoint and the agent project FS', () => {
  it('drops files created after the checkpoint from ProjectFS as well', async () => {
    useStore.getState().createFile('index.html');
    useStore.getState().saveFile('index.html', '<h1>before</h1>');
    const checkpoint = captureCheckpoint('x', 'Before this message', useStore.getState().fileContents);
    seedTurn(checkpoint.id, 't1');
    const sid = useStore.getState().activeSessionId;

    useStore.getState().writeProjectFile('index.html', '<h1>after</h1>');
    useStore.getState().writeProjectFile('notes.md', 'written by the agent');
    useStore.getState().writeProjectFile('src/extra/new.ts', 'export const x = 1;');

    useStore.getState().restoreCheckpoint('t1', 'code');
    await Promise.resolve();

    expect(bridge.removeProjectFiles).toHaveBeenCalledTimes(1);
    expect(bridge.removeProjectFiles).toHaveBeenCalledWith(sid, ['notes.md', 'src/extra/new.ts']);
  });

  it('does not touch ProjectFS when only the conversation is restored', async () => {
    useStore.getState().createFile('index.html');
    useStore.getState().saveFile('index.html', 'v1');
    const checkpoint = captureCheckpoint('x', 'Before this message', useStore.getState().fileContents);
    seedTurn(checkpoint.id, 't1');
    useStore.getState().writeProjectFile('notes.md', 'kept');

    useStore.getState().restoreCheckpoint('t1', 'chat');
    await Promise.resolve();

    expect(bridge.removeProjectFiles).not.toHaveBeenCalled();
    expect(useStore.getState().fileContents['notes.md']).toBe('kept');
  });
});
