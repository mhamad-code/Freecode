import { describe, expect, it } from 'vitest';
import { parseOpenAIStream, sanitizeSchema, toOpenAIRequest } from '../adapters/openaiCompatible';
import { parseAnthropicStream, toAnthropicRequest } from '../adapters/anthropic';
import { ProviderError } from '../errors';
import type { ChatRequest, Delta, ProviderConfig } from '../types';

async function* gen(items: string[]): AsyncGenerator<string> {
  for (const item of items) yield item;
}

function provider(overrides: Partial<ProviderConfig> = {}): ProviderConfig {
  return {
    id: 'test',
    label: 'Test',
    kind: 'custom',
    protocol: 'openai-compatible',
    baseUrl: 'https://example.com/v1',
    enabled: true,
    order: 0,
    auth: { type: 'bearer' },
    keys: [],
    headers: [],
    catalog: { path: '/models', parser: 'openai' },
    quirks: { supportsStreamUsage: true, supportsParallelTools: true, strictTemplates: false },
    corsStatus: 'ok',
    models: [],
    ...overrides,
  };
}

const baseRequest: ChatRequest = {
  model: 'test-model',
  messages: [
    { role: 'system', text: 'be brief' },
    { role: 'user', text: 'hi' },
  ],
};

describe('openai-compatible adapter', () => {
  it('merges system messages into a single leading system message', () => {
    const body = toOpenAIRequest(provider(), {
      ...baseRequest,
      messages: [
        { role: 'user', text: 'hi' },
        { role: 'system', text: 'late note' },
      ],
    });
    const messages = body.messages as { role: string }[];
    expect(messages[0].role).toBe('system');
    expect(messages.filter((m) => m.role === 'system')).toHaveLength(1);
  });

  it('streams text, reasoning, tool calls and usage', async () => {
    const deltas: Delta[] = [];
    const result = await parseOpenAIStream(
      gen([
        JSON.stringify({ choices: [{ delta: { content: 'Hel' } }] }),
        JSON.stringify({ choices: [{ delta: { content: 'lo' } }] }),
        JSON.stringify({ choices: [{ delta: { reasoning_content: 'hmm' } }] }),
        JSON.stringify({
          choices: [
            {
              delta: {
                tool_calls: [
                  { index: 0, id: 'c1', function: { name: 'read_file', arguments: '{"path":' } },
                ],
              },
            },
          ],
        }),
        JSON.stringify({
          choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: '"a.ts"}' } }] } }],
        }),
        JSON.stringify({ choices: [{ delta: {}, finish_reason: 'tool_calls' }] }),
        JSON.stringify({ choices: [], usage: { prompt_tokens: 10, completion_tokens: 3 } }),
        '[DONE]',
      ]),
      (d) => deltas.push(d),
    );
    expect(result.text).toBe('Hello');
    expect(result.thinking).toBe('hmm');
    expect(result.toolCalls).toEqual([
      { id: 'c1', name: 'read_file', arguments: '{"path":"a.ts"}' },
    ]);
    expect(result.usage).toEqual({ inTok: 10, outTok: 3, cacheTok: undefined });
    expect(result.endedEarly).toBeFalsy();
    expect(deltas.some((d) => d.type === 'thinking')).toBe(true);
  });

  it('extracts inline think tags across chunks', async () => {
    const result = await parseOpenAIStream(
      gen([
        JSON.stringify({ choices: [{ delta: { content: 'A<thi' } }] }),
        JSON.stringify({ choices: [{ delta: { content: 'nking>B</thi' } }] }),
        JSON.stringify({ choices: [{ delta: { content: 'nking>C' } }] }),
        '[DONE]',
      ]),
    );
    expect(result.text).toBe('AC');
    expect(result.thinking).toBe('B');
  });

  it('stringifies object tool arguments', async () => {
    const result = await parseOpenAIStream(
      gen([
        JSON.stringify({
          choices: [
            {
              delta: {
                tool_calls: [
                  { index: 0, id: 'x', function: { name: 'grep', arguments: { pattern: 'a' } } },
                ],
              },
            },
          ],
        }),
        '[DONE]',
      ]),
    );
    expect(result.toolCalls[0].arguments).toBe('{"pattern":"a"}');
  });

  it('throws on a mid-stream error payload', async () => {
    await expect(
      parseOpenAIStream(gen([JSON.stringify({ error: { message: 'nope' } })])),
    ).rejects.toBeInstanceOf(ProviderError);
  });

  it('flags a stream that ends without a finish reason', async () => {
    const result = await parseOpenAIStream(
      gen([JSON.stringify({ choices: [{ delta: { content: 'partial' } }] })]),
    );
    expect(result.endedEarly).toBe(true);
    expect(result.text).toBe('partial');
  });

  it('drops $schema and (strict) additionalProperties', () => {
    expect(sanitizeSchema({ $schema: 'x', type: 'object' }, false)).toEqual({ type: 'object' });
    expect(sanitizeSchema({ type: 'object', additionalProperties: true }, true)).toEqual({
      type: 'object',
    });
  });
});

describe('anthropic adapter', () => {
  it('maps tool results into user blocks', () => {
    const body = toAnthropicRequest(provider({ protocol: 'anthropic' }), {
      model: 'claude',
      messages: [
        { role: 'assistant', text: 'ok', toolCalls: [{ id: 't1', name: 'x', arguments: '{}' }] },
        { role: 'tool', toolCallId: 't1', text: 'result' },
      ],
    });
    const messages = body.messages as { role: string; content: { type: string }[] }[];
    expect(messages.at(-1)?.role).toBe('user');
    expect(messages.at(-1)?.content[0].type).toBe('tool_result');
  });

  it('streams text, tool input and usage', async () => {
    const events = [
      {
        data: JSON.stringify({
          type: 'message_start',
          message: { usage: { input_tokens: 12, cache_read_input_tokens: 4 } },
        }),
      },
      { data: JSON.stringify({ type: 'content_block_start', index: 0, content_block: { type: 'text' } }) },
      {
        data: JSON.stringify({
          type: 'content_block_delta',
          index: 0,
          delta: { type: 'text_delta', text: 'Hi' },
        }),
      },
      {
        data: JSON.stringify({
          type: 'content_block_start',
          index: 1,
          content_block: { type: 'tool_use', id: 't1', name: 'grep' },
        }),
      },
      {
        data: JSON.stringify({
          type: 'content_block_delta',
          index: 1,
          delta: { type: 'input_json_delta', partial_json: '{"q":"a"}' },
        }),
      },
      {
        data: JSON.stringify({
          type: 'message_delta',
          delta: { stop_reason: 'tool_use' },
          usage: { output_tokens: 7 },
        }),
      },
      { data: JSON.stringify({ type: 'message_stop' }) },
    ];
    async function* stream() {
      for (const e of events) yield e;
    }
    const result = await parseAnthropicStream(stream());
    expect(result.text).toBe('Hi');
    expect(result.toolCalls).toEqual([{ id: 't1', name: 'grep', arguments: '{"q":"a"}' }]);
    expect(result.usage).toEqual({ inTok: 12, outTok: 7, cacheTok: 4 });
  });
});
