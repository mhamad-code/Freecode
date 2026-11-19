import { describe, expect, it } from 'vitest';
import { applyEdit, EditError, WriteGuard } from '../tools/edit';
import { grepFiles } from '../tools/search';
import { diffManifest } from '../checkpoints';
import { buildSystemPrompt } from '../prompt';
import { runAgent, type AgentEvent, type ModelFn } from '../loop';

describe('applyEdit', () => {
  it('replaces a unique exact match', () => {
    const result = applyEdit('const a = 1;\nconst b = 2;\n', 'const b = 2;', 'const b = 3;');
    expect(result.content).toBe('const a = 1;\nconst b = 3;\n');
    expect(result.fuzzy).toBe(false);
  });

  it('rejects multiple matches unless replaceAll is set', () => {
    expect(() => applyEdit('a\na\n', 'a', 'b')).toThrow(EditError);
    expect(applyEdit('a\na\n', 'a', 'b', true).content).toBe('b\nb\n');
  });

  it('falls back to a whitespace-normalized match and rebases indentation', () => {
    const content = 'function x() {\n\treturn 1;\n}\n';
    const result = applyEdit(content, '  return 1;', '  return 2;');
    expect(result.fuzzy).toBe(true);
    expect(result.content).toContain('\treturn 2;');
  });

  it('throws when nothing matches', () => {
    expect(() => applyEdit('abc', 'zzz', 'y')).toThrow(EditError);
  });

  it('preserves a trailing newline', () => {
    expect(applyEdit('a\n', 'a', 'b').content.endsWith('\n')).toBe(true);
  });
});

describe('WriteGuard', () => {
  it('requires a read before overwriting an existing file', () => {
    const guard = new WriteGuard();
    expect(guard.check('a.ts', 'hash').ok).toBe(false);
    guard.markRead('a.ts', 'hash');
    expect(guard.check('a.ts', 'hash').ok).toBe(true);
  });

  it('detects a hash change since the read', () => {
    const guard = new WriteGuard();
    guard.markRead('a.ts', 'old');
    const check = guard.check('a.ts', 'new');
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.reason).toMatch(/changed/);
  });

  it('blocks writes while a draft exists', () => {
    const guard = new WriteGuard();
    guard.markRead('a.ts', 'h');
    guard.markDraft('a.ts');
    expect(guard.check('a.ts', 'h').ok).toBe(false);
  });
});

describe('checkpoint manifest diff', () => {
  it('reports added, modified and removed files', () => {
    const diff = diffManifest(
      { files: { 'a.ts': '1', 'b.ts': '2' } },
      { files: { 'a.ts': '9', 'c.ts': '3' } },
    );
    expect(diff).toEqual({ added: ['c.ts'], modified: ['a.ts'], removed: ['b.ts'] });
  });
});

describe('grepFiles', () => {
  const files = {
    'src/a.ts': 'const x = 1;\nconst todo = 2;',
    'src/b.tsx': 'export const y = 3;',
    'README.md': 'todo list',
  };

  it('finds matches with line and column numbers', () => {
    const matches = grepFiles(files, 'todo', { glob: 'src/*.ts' });
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({ path: 'src/a.ts', line: 2, column: 7 });
  });

  it('supports case-insensitive search', () => {
    expect(grepFiles(files, 'TODO', { ignoreCase: true })).toHaveLength(2);
  });
});

describe('buildSystemPrompt', () => {
  it('states the limited runtime and mode', () => {
    const prompt = buildSystemPrompt({
      projectRoot: 'project',
      runtime: 'limited',
      permissionMode: 'ask',
      mode: 'plan',
      instructions: 'Use tabs.',
    });
    expect(prompt).toContain('limited');
    expect(prompt).toContain('MODE: Plan');
    expect(prompt).toContain('Use tabs.');
  });
});

describe('runAgent', () => {
  it('runs a tool then produces a final answer', async () => {
    let turn = 0;
    const model: ModelFn = async (_req, onDelta) => {
      turn += 1;
      if (turn === 1) {
        onDelta({ type: 'text', text: 'working' });
        return {
          text: 'working',
          thinking: '',
          toolCalls: [{ id: 'c1', name: 'echo', arguments: '{"value":"hi"}' }],
        };
      }
      return { text: 'done', thinking: '', toolCalls: [] };
    };
    const events: AgentEvent[] = [];
    const result = await runAgent({
      model,
      modelId: 'test',
      messages: [{ role: 'user', text: 'go' }],
      tools: [
        {
          name: 'echo',
          description: 'echo a value',
          parameters: { type: 'object' },
          risk: 'low',
          run: async (args) => String(args.value),
        },
      ],
      permissionMode: 'risky',
      ask: async () => 'allow',
      onEvent: (e) => events.push(e),
    });
    expect(result.text).toBe('done');
    expect(events.some((e) => e.type === 'tool_start')).toBe(true);
    expect(events.some((e) => e.type === 'tool_end')).toBe(true);
    expect(events.some((e) => e.type === 'final')).toBe(true);
    expect(result.messages.some((m) => m.role === 'tool' && m.text === 'hi')).toBe(true);
  });

  it('asks before a risky tool and reports denial to the model', async () => {
    let turn = 0;
    const model: ModelFn = async () => {
      turn += 1;
      if (turn === 1) {
        return {
          text: '',
          thinking: '',
          toolCalls: [{ id: 'c1', name: 'write', arguments: '{}' }],
        };
      }
      return { text: 'stopped', thinking: '', toolCalls: [] };
    };
    let asked = 0;
    const result = await runAgent({
      model,
      modelId: 'test',
      messages: [{ role: 'user', text: 'go' }],
      tools: [
        {
          name: 'write',
          description: 'write',
          parameters: { type: 'object' },
          risk: 'medium',
          run: async () => 'written',
        },
      ],
      permissionMode: 'risky',
      ask: async () => {
        asked += 1;
        return 'deny';
      },
    });
    expect(asked).toBe(1);
    expect(result.messages.some((m) => m.role === 'tool' && /denied/i.test(m.text ?? ''))).toBe(
      true,
    );
  });
});
