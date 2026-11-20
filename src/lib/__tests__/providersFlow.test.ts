import { afterEach, describe, expect, it, vi } from 'vitest';
import type { KeyValueDB } from '../../storage/db';
import { Vault } from '../../storage/vault';
import { storeSecret } from '../../storage/vaultDiagnostics';
import { healthForErrorCode, testProviderConnection } from '../modelProbe';
import { classifyStatus, statusToError } from '../../engine/providers/errors';
import { diagnoseEndpoint } from '../providerDiagnostics';
import { recordProviderFailure } from '../providersStore';
import { translate } from '../i18n';
import type { ProviderConfig } from '../../engine/providers/types';

class MemoryDb implements KeyValueDB {
  private stores = new Map<string, Map<unknown, unknown>>();

  private store(name: string) {
    let map = this.stores.get(name);
    if (!map) {
      map = new Map();
      this.stores.set(name, map);
    }
    return map;
  }

  async get(store: string, key: unknown) {
    return this.store(store).get(key);
  }
  async put(store: string, value: unknown, key?: unknown) {
    this.store(store).set(key ?? (value as { id?: unknown })?.id, value);
    return key;
  }
  async delete(store: string, key: unknown) {
    this.store(store).delete(key);
  }
  async getAll(store: string) {
    return [...this.store(store).values()];
  }
  async getAllFromIndex() {
    return [];
  }
  async clear(store: string) {
    this.store(store).clear();
  }
}

describe('probe health classification', () => {
  it('treats 401/402/403 as needs-key and a tools 400 as no-tools', () => {
    expect(classifyStatus(401)).toBe('auth');
    expect(healthForErrorCode('auth')).toBe('needs-key');
    expect(healthForErrorCode('quota')).toBe('needs-key');
    expect(healthForErrorCode('unsupported-tools')).toBe('no-tools');
    expect(healthForErrorCode('server')).toBe('failed');
    expect(healthForErrorCode('network')).toBe('failed');
  });

  it('maps an HTTP 400 about tools to unsupported-tools', () => {
    const err = statusToError(400, 'This model does not support tool calls');
    expect(err.code).toBe('unsupported-tools');
    expect(healthForErrorCode(err.code)).toBe('no-tools');
  });

  it('maps 403 to auth and 429 to rate with Retry-After', () => {
    expect(statusToError(403, 'forbidden').code).toBe('auth');
    const rate = statusToError(429, 'slow down', new Headers({ 'retry-after': '7' }));
    expect(rate.code).toBe('rate');
    expect(rate.retryAfterMs).toBe(7000);
  });
});

describe('provider diagnostics', () => {
  it('reports CORS when only the no-cors request succeeds', async () => {
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.mode === 'no-cors') return new Response(null, { status: 200 });
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;
    const diag = await diagnoseEndpoint('https://api.example.test/models', { fetchImpl });
    expect(diag.kind).toBe('cors');
  });

  it('reports a network failure when both requests fail', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;
    const diag = await diagnoseEndpoint('https://api.example.test/models', { fetchImpl });
    expect(diag.kind).toBe('network');
  });

  it('keeps the HTTP status and Retry-After', async () => {
    const fetchImpl = (async () =>
      new Response('nope', { status: 429, headers: { 'retry-after': '30' } })) as unknown as typeof fetch;
    const diag = await diagnoseEndpoint('https://api.example.test/models', { fetchImpl });
    expect(diag.kind).toBe('rate');
    expect(diag.status).toBe(429);
    expect(diag.retryAfterMs).toBe(30000);
  });

  it('cooldown preserves keys and records the cause', () => {
    const provider: ProviderConfig = {
      id: 'kilo-free',
      label: 'Kilo',
      kind: 'builtin-free',
      protocol: 'openai-compatible',
      baseUrl: 'https://api.kilo.ai/api/gateway',
      enabled: true,
      order: 0,
      auth: { type: 'none' },
      keys: [{ id: '0', label: 'key', enabled: true }],
      headers: [],
      catalog: { path: '/models', parser: 'kilo' },
      quirks: { supportsStreamUsage: true, supportsParallelTools: true, strictTemplates: false },
      corsStatus: 'ok',
      models: [],
    };
    const once = recordProviderFailure([provider], 'kilo-free', {
      kind: 'rate',
      status: 429,
      at: 1000,
      retryAfterMs: 5000,
      url: 'https://api.kilo.ai/api/gateway/models',
    });
    expect(once[0].keys).toHaveLength(1);
    expect(once[0].cooldownUntil).toBe(6000);
    const twice = recordProviderFailure(once, 'kilo-free', {
      kind: 'cors',
      at: 2000,
      url: 'https://api.kilo.ai/api/gateway/models',
    });
    expect(twice[0].corsStatus).toBe('blocked');
    expect(twice[0].keys).toHaveLength(1);
  });
});

describe('provider tests use their own catalog model', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports a 403 catalog rejection as needs-key instead of a network guess', async () => {
    const fetchImpl = async () => new Response('{"error":"anonymous access refused"}', { status: 403 });
    const result = await testProviderConnection('ovh-anon', {
      fetchImpl: fetchImpl as typeof fetch,
    });
    expect(result.state).toBe('needs-key');
    expect(result.diagnostic?.kind).toBe('auth');
    expect(result.diagnostic?.status).toBe(403);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('probes a chat model discovered from the same provider, not another one', async () => {
    const chatBodies: Record<string, unknown>[] = [];
    const fetchImpl = async (url: string, init?: RequestInit) => {
      if (String(url).includes('/models')) {
        return new Response(
          JSON.stringify({
            data: [
              { id: 'llm7-chat', name: 'LLM7 chat' },
              { id: 'whisper-large-v3', name: 'Whisper' },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      chatBodies.push(JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>);
      return new Response('data: {"choices":[{"delta":{"content":"OK"}}]}\n\ndata: [DONE]\n\n', {
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
      });
    };
    vi.stubGlobal('fetch', fetchImpl);

    const result = await testProviderConnection('llm7', { fetchImpl: fetchImpl as typeof fetch });
    if (result.state !== 'ok') throw new Error(JSON.stringify(result));
    expect(result.state).toBe('ok');
    expect(result.modelId).toBe('llm7-chat');
    expect(chatBodies[0].model).toBe('llm7-chat');
  });
});

describe('key storage survives reload and failed tests', () => {
  it('stores a key first, then reads it back through a fresh vault', async () => {
    const db = new MemoryDb();
    await storeSecret('test-profile', 'provider:openrouter:key:0', 'sk-test-value', { db });
    const reopened = await Vault.open('test-profile', { db });
    expect(await reopened.get('provider:openrouter:key:0')).toBe('sk-test-value');
  });

  it('keeps the key when the provider test fails', async () => {
    const db = new MemoryDb();
    await storeSecret('test-profile', 'provider:openrouter:key:0', 'sk-kept', { db });
    const provider: ProviderConfig = {
      id: 'openrouter',
      label: 'OpenRouter',
      kind: 'preset',
      protocol: 'openai-compatible',
      baseUrl: 'https://openrouter.ai/api/v1',
      enabled: true,
      order: 0,
      auth: { type: 'bearer' },
      keys: [{ id: '0', label: 'key', enabled: true }],
      headers: [],
      catalog: { path: '/models', parser: 'openrouter' },
      quirks: { supportsStreamUsage: true, supportsParallelTools: true, strictTemplates: false },
      corsStatus: 'ok',
      models: [],
    };
    const afterFailure = recordProviderFailure([provider], 'openrouter', {
      kind: 'auth',
      status: 401,
      at: Date.now(),
      url: 'https://openrouter.ai/api/v1/models',
    });
    expect(afterFailure[0].keys[0].enabled).toBe(true);
    expect(await (await Vault.open('test-profile', { db })).get('provider:openrouter:key:0')).toBe('sk-kept');
  });
});

describe('error messages', () => {
  it('exists in English and Arabic', () => {
    for (const key of [
      'providers.diag.cors',
      'providers.diag.network',
      'providers.diag.auth',
      'providers.diag.rate',
      'model.noWorking',
      'model.replyOnly',
      'model.addKey',
      'vault.blocked',
      'providers.keySavedUntested',
    ]) {
      expect(translate('en', key)).not.toBe(key);
      expect(translate('ar', key)).not.toBe(key);
    }
    expect(translate('ar', 'providers.diag.rate', { s: 5 })).toContain('5');
  });
});
