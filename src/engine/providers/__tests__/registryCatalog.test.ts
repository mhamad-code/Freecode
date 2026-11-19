import { describe, expect, it } from 'vitest';
import { ProviderRegistry } from '../registry';
import type { ProviderConfig } from '../types';

const provider = (): ProviderConfig => ({
  id: 'kilo-free',
  label: 'Kilo Free',
  kind: 'builtin-free',
  protocol: 'openai-compatible',
  baseUrl: 'https://api.kilo.ai/api/gateway',
  enabled: true,
  order: 0,
  auth: { type: 'none' },
  keys: [],
  headers: [],
  catalog: { path: '/models', parser: 'kilo', freeFilter: 'suffix:free' },
  quirks: { supportsStreamUsage: true, supportsParallelTools: true, strictTemplates: false },
  corsStatus: 'unknown',
  models: [],
});

describe('catalog requests', () => {
  it('does not send Content-Type on a GET (avoids a CORS preflight)', async () => {
    const calls: RequestInit[] = [];
    const registry = new ProviderRegistry([provider()], {
      fetchImpl: async (_url, init) => {
        calls.push(init ?? {});
        return new Response(
          JSON.stringify({ data: [{ id: 'kilo-auto/free', name: 'Auto Free', supported_parameters: ['tools'] }] }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      },
      getSecret: async () => undefined,
    });

    const models = await registry.refreshCatalog('kilo-free');

    const headers = (calls[0].headers ?? {}) as Record<string, string>;
    expect(headers['Content-Type']).toBeUndefined();
    expect(headers.Authorization).toBeUndefined();
    expect(models.map((m) => m.id)).toEqual(['kilo-auto/free']);
    expect(models[0].tools).toBe(true);
    expect(models[0].free).toBe(true);
  });

  it('reports the URL it requests', async () => {
    const urls: string[] = [];
    const registry = new ProviderRegistry([provider()], {
      fetchImpl: async (url) => {
        urls.push(String(url));
        return new Response(JSON.stringify({ data: [] }), { status: 200 });
      },
      getSecret: async () => undefined,
    });
    await registry.refreshCatalog('kilo-free');
    expect(urls[0]).toBe('https://api.kilo.ai/api/gateway/models');
  });
});
