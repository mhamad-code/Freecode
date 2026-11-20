import { parseOpenAIStream, toOpenAIRequest } from './adapters/openaiCompatible';
import { parseAnthropicStream, toAnthropicRequest } from './adapters/anthropic';
import { withBackoff, type RetryOptions } from './backoff';
import { SerialQueue } from './queue';
import { isStale, parseCatalog, reconcileModels } from './catalog';
import { resolveModel } from './capabilities';
import { ProviderError, networkError, statusToError } from './errors';
import { markKeyFailed, pickKey, type RotationMode } from './keys';
import { parseSSE, sseData } from './sse';
import type {
  ChatRequest,
  Delta,
  ModelInfo,
  ModelResult,
  ProviderConfig,
} from './types';

export interface RegistryDeps {
  fetchImpl?: typeof fetch;
  now?: () => number;
  getSecret?: (providerId: string, keyId: string) => Promise<string | undefined>;
  rotation?: RotationMode;
  firstByteTimeoutMs?: number;
  idleTimeoutMs?: number;
  /** Shared by tests/UI to observe the per-provider queue. */
  queue?: SerialQueue;
  /** 429/5xx retry policy. Retry-After always wins, up to maxWaitMs. */
  retry?: RetryOptions;
}

function joinUrl(base: string, path: string): string {
  if (!path) return base.replace(/\/$/, '');
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

function guardIdle(
  stream: ReadableStream<Uint8Array>,
  onIdle: () => void,
  idleMs: number,
): ReadableStream<Uint8Array> {
  const reader = stream.getReader();
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const idle = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          onIdle();
          reject(new Error('idle-timeout'));
        }, idleMs);
      });
      try {
        const read = await Promise.race([reader.read(), idle]);
        if (timer) clearTimeout(timer);
        if (read.done) controller.close();
        else controller.enqueue(read.value);
      } catch (err) {
        if (timer) clearTimeout(timer);
        controller.error(err);
      }
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
}

export class ProviderRegistry {
  private configs: ProviderConfig[];
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => number;
  private readonly getSecret?: RegistryDeps['getSecret'];
  private readonly rotation: RotationMode;
  private readonly firstByteTimeoutMs: number;
  private readonly idleTimeoutMs: number;
  private readonly queue: SerialQueue;
  private readonly retry: RetryOptions;
  private readonly cursors = new Map<string, number>();

  constructor(configs: ProviderConfig[], deps: RegistryDeps = {}) {
    this.configs = configs;
    this.fetchImpl = deps.fetchImpl ?? ((...args) => fetch(...args));
    this.now = deps.now ?? (() => Date.now());
    this.getSecret = deps.getSecret;
    this.rotation = deps.rotation ?? 'failure';
    this.firstByteTimeoutMs = deps.firstByteTimeoutMs ?? 60000;
    this.idleTimeoutMs = deps.idleTimeoutMs ?? 90000;
    this.queue = deps.queue ?? new SerialQueue();
    this.retry = { ...deps.retry };
  }

  list(): ProviderConfig[] {
    return this.configs;
  }

  get(id: string): ProviderConfig | undefined {
    return this.configs.find((p) => p.id === id);
  }

  models(id: string): ModelInfo[] {
    return this.get(id)?.models.filter((m) => !m.retired) ?? [];
  }

  private async headers(
    provider: ProviderConfig,
    secret: string | undefined,
  ): Promise<Record<string, string>> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (provider.protocol === 'anthropic') {
      if (!secret) throw new ProviderError('auth', 'No API key configured');
      headers['x-api-key'] = secret;
      headers['anthropic-version'] = '2023-06-01';
      headers['anthropic-dangerous-direct-browser-access'] = 'true';
      return headers;
    }
    if (provider.auth.type === 'bearer' && secret) {
      headers.Authorization = `Bearer ${secret}`;
    } else if (provider.auth.type === 'header') {
      const value = secret ?? provider.auth.anonymousToken;
      if (value && provider.auth.headerName) headers[provider.auth.headerName] = value;
    }
    for (const custom of provider.headers) {
      if (custom.enabled && this.getSecret) {
        const value = await this.getSecret(provider.id, `header:${custom.name}`);
        if (value) headers[custom.name] = value;
      }
    }
    return headers;
  }

  private async resolveSecret(
    provider: ProviderConfig,
  ): Promise<{ secret?: string; keyId?: string }> {
    if (!provider.keys.length) return {};
    const cursor = this.cursors.get(provider.id) ?? 0;
    const picked = pickKey(provider.keys, this.rotation, this.now(), cursor);
    if (!picked) throw new ProviderError('auth', 'All keys are disabled');
    this.cursors.set(provider.id, picked.cursor);
    const secret = await this.getSecret?.(provider.id, picked.key.id);
    return { secret, keyId: picked.key.id };
  }

  refreshCatalog(id: string): Promise<ModelInfo[]> {
    return this.queue.run(id, () => this.refreshCatalogOnce(id));
  }

  private async refreshCatalogOnce(id: string): Promise<ModelInfo[]> {
    const provider = this.get(id);
    if (!provider) throw new ProviderError('model-not-found', `Unknown provider ${id}`);
    if (!provider.catalog.path) return provider.models;
    const url = joinUrl(provider.baseUrl, provider.catalog.path);
    const { secret } = await this.resolveSecret(provider);
    const headers = await this.headers(provider, secret);
    // A GET with Content-Type triggers a CORS preflight that several free
    // catalogs reject, which looks like "Failed to fetch" in the browser.
    delete headers['Content-Type'];
    const res = await this.fetchImpl(url, { method: 'GET', headers });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw statusToError(res.status, body, res.headers);
    }
    const json = await res.json();
    const parsed = parseCatalog(provider.catalog.parser, json).map(resolveModel);
    provider.models = reconcileModels(provider.models, parsed);
    provider.lastCatalogAt = this.now();
    provider.corsStatus = 'ok';
    return provider.models;
  }

  async ensureCatalog(id: string): Promise<ModelInfo[]> {
    const provider = this.get(id);
    if (!provider) throw new ProviderError('model-not-found', `Unknown provider ${id}`);
    if (provider.models.length && !isStale(provider.lastCatalogAt, this.now())) {
      return provider.models;
    }
    return this.refreshCatalog(id);
  }

  /** One request per provider at a time; free services count requests per IP. */
  chat(
    id: string,
    req: ChatRequest,
    onDelta?: (delta: Delta) => void,
  ): Promise<ModelResult> {
    return this.queue.run(id, () => this.chatOnce(id, req, onDelta));
  }

  private async chatOnce(
    id: string,
    req: ChatRequest,
    onDelta?: (delta: Delta) => void,
  ): Promise<ModelResult> {
    let outputStarted = false;
    const emit = (delta: Delta) => {
      outputStarted = true;
      onDelta?.(delta);
    };
    return withBackoff(() => this.attemptChat(id, req, emit), {
      ...this.retry,
      // Once a byte of the answer exists, a retry would duplicate it.
      canRetry: () => !outputStarted && (this.retry.canRetry?.() ?? true),
    });
  }

  private async attemptChat(
    id: string,
    req: ChatRequest,
    onDelta?: (delta: Delta) => void,
  ): Promise<ModelResult> {
    const provider = this.get(id);
    if (!provider) throw new ProviderError('model-not-found', `Unknown provider ${id}`);
    if (!provider.baseUrl) throw new ProviderError('bad-request', 'This provider has no base URL');
    if (provider.corsStatus === 'blocked') {
      throw new ProviderError('cors', 'This service does not allow browser requests');
    }

    const { secret, keyId } = await this.resolveSecret(provider);
    const headers = await this.headers(provider, secret);
    const body =
      provider.protocol === 'anthropic'
        ? toAnthropicRequest(provider, req)
        : toOpenAIRequest(provider, req);
    const url =
      provider.protocol === 'anthropic'
        ? joinUrl(provider.baseUrl, '/v1/messages')
        : joinUrl(provider.baseUrl, '/chat/completions');

    const controller = new AbortController();
    let timedOut = false;
    const abortFromCaller = () => controller.abort();
    if (req.signal) {
      if (req.signal.aborted) controller.abort();
      else req.signal.addEventListener('abort', abortFromCaller, { once: true });
    }
    const firstTimer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.firstByteTimeoutMs);

    let res: Response;
    try {
      res = await this.fetchImpl(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
        redirect: provider.headers.some((h) => h.enabled) ? 'error' : 'follow',
      });
    } catch (err) {
      clearTimeout(firstTimer);
      if (timedOut) throw new ProviderError('timeout', 'No response from the provider');
      const mapped = networkError(err, typeof navigator === 'undefined' ? true : navigator.onLine);
      if (mapped.code === 'cors') provider.corsStatus = 'blocked';
      throw mapped;
    }
    clearTimeout(firstTimer);

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const err = statusToError(res.status, text, res.headers);
      if (keyId && (err.code === 'auth' || err.code === 'rate' || err.code === 'quota')) {
        provider.keys = markKeyFailed(provider.keys, keyId, this.now(), err.retryAfterMs);
      }
      throw err;
    }
    if (!res.body) throw new ProviderError('stream', 'The provider returned no body');

    const guarded = guardIdle(
      res.body,
      () => {
        timedOut = true;
        controller.abort();
      },
      this.idleTimeoutMs,
    );

    try {
      if (provider.protocol === 'anthropic') {
        return await parseAnthropicStream(parseSSE(guarded), onDelta);
      }
      return await parseOpenAIStream(sseData(guarded), onDelta);
    } catch (err) {
      if (err instanceof ProviderError) throw err;
      if (timedOut) throw new ProviderError('timeout', 'The stream stalled');
      if (req.signal?.aborted) throw new ProviderError('aborted', 'Stopped');
      throw new ProviderError('stream', err instanceof Error ? err.message : String(err));
    } finally {
      req.signal?.removeEventListener('abort', abortFromCaller);
    }
  }

  async testConnection(id: string): Promise<{ ok: boolean; models: number; error?: string }> {
    try {
      const models = await this.refreshCatalog(id);
      return { ok: true, models: models.filter((m) => !m.retired).length };
    } catch (err) {
      const message =
        err instanceof ProviderError
          ? `${err.code}${err.status ? ` (${err.status})` : ''}`
          : err instanceof Error
            ? err.message
            : String(err);
      return { ok: false, models: 0, error: message };
    }
  }
}
