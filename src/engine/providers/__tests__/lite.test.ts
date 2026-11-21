import { describe, expect, it } from 'vitest';
import {
  LITE_MAX_TOKENS,
  LITE_REDUCED_MAX_TOKENS,
  LITE_SYSTEM_PROMPT,
  liteReducedRetry,
  shouldUseLite,
  toLiteRequest,
  trimHistory,
} from '../lite';
import { ProviderError } from '../errors';
import type { ChatMessage, ChatRequest, ProviderConfig } from '../types';

const free = (limits: ProviderConfig['limits'], kind: ProviderConfig['kind'] = 'builtin-free') =>
  ({ kind, limits }) as Pick<ProviderConfig, 'kind' | 'limits' | 'lastDiagnostic'>;

const tools = [
  {
    name: 'read_file',
    description: 'Read a file',
    parameters: { type: 'object', properties: { path: { type: 'string' } } },
  },
];

const base = (): ChatRequest => ({
  model: 'm',
  messages: [
    { role: 'system', text: 'a very long agent system prompt' },
    { role: 'user', text: 'hello' },
    { role: 'assistant', text: 'hi' },
    { role: 'user', text: 'fix it' },
  ],
  tools,
  toolChoice: 'auto',
  reasoningEffort: 'high',
  maxTokens: 8000,
  temperature: 0.7,
});

describe('Lite output budget', () => {
  it('retries a rate-limited Lite turn once with a smaller budget', () => {
    const req = toLiteRequest(base());
    const rate = new ProviderError('rate', 'HTTP 429', { status: 429 });
    expect(req.maxTokens).toBe(LITE_MAX_TOKENS);
    expect(liteReducedRetry(req, rate, false)?.maxTokens).toBe(LITE_REDUCED_MAX_TOKENS);
  });

  it('does not retry after output, for other errors, or below the small budget', () => {
    const req = toLiteRequest(base());
    const rate = new ProviderError('rate', 'HTTP 429', { status: 429 });
    expect(liteReducedRetry(req, rate, true)).toBeNull();
    expect(liteReducedRetry(req, new ProviderError('server', 'HTTP 500', { status: 500 }), false)).toBeNull();
    expect(liteReducedRetry({ ...req, maxTokens: LITE_REDUCED_MAX_TOKENS }, rate, false)).toBeNull();
  });
});

describe('Lite mode selection', () => {
  it('auto covers tight free limits and recent 429s only', () => {
    expect(shouldUseLite('auto', free({ perMinute: 30 }))).toBe(true);
    expect(shouldUseLite('auto', free({ perMinute: 2 }))).toBe(true);
    expect(shouldUseLite('auto', free({ perHour: 60 }))).toBe(true);
    expect(shouldUseLite('auto', free({ perHour: 200 }))).toBe(false);
    expect(
      shouldUseLite('auto', {
        ...free({ perHour: 200 }),
        lastDiagnostic: { kind: 'rate', at: 0 },
      }),
    ).toBe(true);
    expect(shouldUseLite('auto', free(undefined, 'preset'))).toBe(false);
  });

  it('honours explicit on/off', () => {
    expect(shouldUseLite('on', free({ perHour: 200 }))).toBe(true);
    expect(shouldUseLite('off', free({ perMinute: 2 }))).toBe(false);
  });
});

describe('Lite request shaping', () => {
  it('drops tools, reasoning and the long prompt and caps output tokens', () => {
    const request = toLiteRequest(base());
    expect(request.tools).toBeUndefined();
    expect(request.toolChoice).toBeUndefined();
    expect(request.reasoningEffort).toBeUndefined();
    expect(request.maxTokens).toBe(LITE_MAX_TOKENS);
    expect(request.messages[0]).toEqual({ role: 'system', text: LITE_SYSTEM_PROMPT });
    expect(request.messages.filter((m) => m.role === 'system')).toHaveLength(1);
    expect(request.messages.map((m) => m.text)).toContain('fix it');
  });

  it('does not mutate the caller request', () => {
    const original = base();
    const request = toLiteRequest(original);
    expect(original.tools).toBe(tools);
    expect(original.maxTokens).toBe(8000);
    expect(original.messages[0].text).toBe('a very long agent system prompt');
    expect(request).not.toBe(original);
  });

  it('keeps only the newest messages and no orphan tool results', () => {
    const many: ChatMessage[] = [
      { role: 'tool', toolCallId: 'c0', text: 'orphan' },
      ...Array.from({ length: 12 }, (_, i) => ({ role: 'user' as const, text: `m${i}` })),
    ];
    expect(trimHistory(many).map((m) => m.text)).toEqual([
      'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'm10', 'm11',
    ]);
  });

  it('strips images and truncates oversized text', () => {
    const messages: ChatMessage[] = [
      { role: 'user', text: 'x'.repeat(9000), images: ['data:image/png;base64,AAAA'] },
    ];
    const [only] = trimHistory(messages);
    expect(only.images).toBeUndefined();
    expect(only.text?.length).toBe(6000);
  });

  it('keeps a small maxTokens untouched', () => {
    const request = toLiteRequest({ ...base(), maxTokens: 64 });
    expect(request.maxTokens).toBe(64);
  });
});
