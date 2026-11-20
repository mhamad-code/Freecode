import { describe, expect, it, vi } from 'vitest';
import { ProviderRegistry } from '../registry';
import type { ChatRequest, ProviderConfig } from '../types';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const encoder = new TextEncoder();

function sse(text: string): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`),
      );
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });
  return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } });
}

const provider = (id: string): ProviderConfig => ({
  id,
  label: id,
  kind: 'builtin-free',
  protocol: 'openai-compatible',
  baseUrl: `https://${id}.example.test/v1`,
  enabled: true,
  order: 0,
  auth: { type: 'none' },
  keys: [],
  headers: [],
  catalog: { path: '/models', parser: 'openai' },
  quirks: { supportsStreamUsage: true, supportsParallelTools: false, strictTemplates: false },
  corsStatus: 'unknown',
  models: [],
});

/** Minimal OpenAI-compatible endpoint: records requests, serves queued replies. */
class FakeOpenAI {
  requests: { url: string; body: ChatRequest & { stream?: boolean } }[] = [];
  active = 0;
  maxActive = 0;
  private replies: (() => Response | Promise<Response>)[] = [];

  reply(fn: () => Response | Promise<Response>): this {
    this.replies.push(fn);
    return this;
  }

  fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    this.active += 1;
    this.maxActive = Math.max(this.maxActive, this.active);
    try {
      this.requests.push({
        url: String(url),
        body: JSON.parse(String(init?.body ?? '{}')) as ChatRequest,
      });
      await delay(5);
      const next = this.replies.shift();
      if (!next) throw new Error('no reply queued');
      return await next();
    } finally {
      this.active -= 1;
    }
  }) as unknown as typeof fetch;
}

const request = (): ChatRequest => ({
  model: 'free-model',
  messages: [{ role: 'user', text: 'hello' }],
  maxTokens: 32,
});

describe('fake OpenAI-compatible server', () => {
  it('serves one request at a time for the same provider', async () => {
    const server = new FakeOpenAI().reply(() => sse('one')).reply(() => sse('two'));
    const registry = new ProviderRegistry([provider('kilo-free')], {
      fetchImpl: server.fetch,
      getSecret: async () => undefined,
    });

    const [a, b] = await Promise.all([
      registry.chat('kilo-free', request()),
      registry.chat('kilo-free', request()),
    ]);

    expect([a.text, b.text]).toEqual(['one', 'two']);
    expect(server.maxActive).toBe(1);
    expect(server.requests).toHaveLength(2);
  });

  it('allows different providers to run in parallel', async () => {
    const server = new FakeOpenAI().reply(() => sse('a')).reply(() => sse('b'));
    const registry = new ProviderRegistry([provider('kilo-free'), provider('llm7')], {
      fetchImpl: server.fetch,
      getSecret: async () => undefined,
    });

    await Promise.all([registry.chat('kilo-free', request()), registry.chat('llm7', request())]);
    expect(server.maxActive).toBe(2);
  });

  it('sends an OpenAI-compatible streaming body', async () => {
    const server = new FakeOpenAI().reply(() => sse('ok'));
    const registry = new ProviderRegistry([provider('kilo-free')], {
      fetchImpl: server.fetch,
      getSecret: async () => undefined,
    });
    await registry.chat('kilo-free', request());
    expect(server.requests[0].url).toBe('https://kilo-free.example.test/v1/chat/completions');
    expect(server.requests[0].body.stream).toBe(true);
    expect(server.requests[0].body.model).toBe('free-model');
  });

  it('retries a 429 after Retry-After', async () => {
    const sleep = vi.fn(async () => undefined);
    const server = new FakeOpenAI()
      .reply(() => new Response('slow down', { status: 429, headers: { 'retry-after': '2' } }))
      .reply(() => sse('recovered'));
    const registry = new ProviderRegistry([provider('llm7')], {
      fetchImpl: server.fetch,
      getSecret: async () => undefined,
      retry: { attempts: 2, sleep },
    });

    const result = await registry.chat('llm7', request());
    expect(result.text).toBe('recovered');
    expect(sleep).toHaveBeenCalledWith(2000);
    expect(server.requests).toHaveLength(2);
    expect(server.requests[0].body).toEqual(server.requests[1].body);
  });

  it('reports a long Retry-After instead of sleeping through it', async () => {
    const sleep = vi.fn(async () => undefined);
    const server = new FakeOpenAI().reply(
      () => new Response('quota', { status: 429, headers: { 'retry-after': '120' } }),
    );
    const registry = new ProviderRegistry([provider('llm7')], {
      fetchImpl: server.fetch,
      getSecret: async () => undefined,
      retry: { attempts: 3, sleep, maxWaitMs: 10000 },
    });

    await expect(registry.chat('llm7', request())).rejects.toMatchObject({
      code: 'rate',
      status: 429,
      retryAfterMs: 120000,
    });
    expect(sleep).not.toHaveBeenCalled();
    expect(server.requests).toHaveLength(1);
  });

  it('does not retry a 400, a 403 or a stream that already started', async () => {
    const sleep = vi.fn(async () => undefined);
    const server = new FakeOpenAI()
      .reply(() => new Response('bad', { status: 400 }))
      .reply(() => new Response('no', { status: 403 }))
      .reply(
        () =>
          new Response(
            new ReadableStream<Uint8Array>({
              start(controller) {
                controller.enqueue(
                  encoder.encode('data: {"choices":[{"delta":{"content":"partial"}}]}\n\n'),
                );
                controller.enqueue(encoder.encode('data: {"error":"rate limited"}\n\n'));
                controller.close();
              },
            }),
            { status: 200, headers: { 'content-type': 'text/event-stream' } },
          ),
      );
    const registry = new ProviderRegistry([provider('kilo-free')], {
      fetchImpl: server.fetch,
      getSecret: async () => undefined,
      retry: { attempts: 3, sleep },
    });

    await expect(registry.chat('kilo-free', request())).rejects.toMatchObject({ code: 'bad-request' });
    await expect(registry.chat('kilo-free', request())).rejects.toMatchObject({ code: 'auth' });
    const deltas: string[] = [];
    await expect(
      registry.chat('kilo-free', request(), (d) => deltas.push(d.text)),
    ).rejects.toBeTruthy();
    expect(deltas).toEqual(['partial']);
    expect(sleep).not.toHaveBeenCalled();
    expect(server.requests).toHaveLength(3);
  });
});
