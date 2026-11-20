import { markModelHealth } from '../engine/providers/catalog';
import type { ProviderError } from '../engine/providers/errors';
import type { ModelHealth, ProviderConfig } from '../engine/providers/types';
import {
  buildCatalog,
  flattenCatalog,
  isVisibleByDefault,
  modelKind,
  pickDefaultModel,
  probeOrder,
  type CatalogModel,
  type PriceTier,
} from './modelCatalog';
import { catalogUrl, diagnoseEndpoint, type Diagnostic } from './providerDiagnostics';
import { loadProviders, registryFor, saveProviders } from './providersStore';
import { recordRequest } from './requestCounter';

export interface ProbeOutcome {
  status: ModelHealth;
  error?: string;
  code?: string;
}

export class NoWorkingModelError extends Error {
  readonly code = 'no-model';
  readonly skipped: { modelId: string; status: ModelHealth }[];

  constructor(skipped: { modelId: string; status: ModelHealth }[] = []) {
    super('No working free model right now');
    this.name = 'NoWorkingModelError';
    this.skipped = skipped;
  }
}

const PROBE_TOOLS = [
  {
    name: 'noop',
    description: 'Does nothing. Used to check tool support.',
    parameters: { type: 'object', properties: {} },
  },
];

const errorCode = (err: unknown): string => {
  const code = (err as ProviderError)?.code;
  return typeof code === 'string' ? code : 'network';
};

/** Maps a probe failure to its health state. */
export function healthForErrorCode(code: string): ModelHealth {
  if (code === 'auth' || code === 'quota') return 'needs-key';
  if (code === 'unsupported-tools') return 'no-tools';
  return 'failed';
}

/** One tiny real request decides whether a model can be used at all. */
export async function probeModel(
  providerId: string,
  modelId: string,
  deps: { list?: ProviderConfig[] } = {},
): Promise<ProbeOutcome> {
  const list = deps.list ?? loadProviders();
  const registry = registryFor(list);
  recordRequest(providerId);
  try {
    await registry.chat(providerId, {
      model: modelId,
      messages: [
        { role: 'system', text: 'Reply with the single word OK.' },
        { role: 'user', text: 'ping' },
      ],
      tools: PROBE_TOOLS,
      maxTokens: 8,
      temperature: 0,
    });
    return { status: 'ok' };
  } catch (err) {
    const code = errorCode(err);
    const message = err instanceof Error ? err.message : String(err);
    const status = healthForErrorCode(code);
    return {
      status,
      code,
      error: status === 'failed' ? `${code}: ${message}` : message,
    };
  }
}

export function recordHealth(
  list: ProviderConfig[],
  providerId: string,
  modelId: string,
  outcome: ProbeOutcome,
  now = Date.now(),
): ProviderConfig[] {
  return list.map((p) =>
    p.id === providerId
      ? {
          ...p,
          models: markModelHealth(p.models, modelId, outcome.status, now, outcome.error),
        }
      : p,
  );
}

export interface WorkingChoice {
  providerId: string;
  modelId: string;
}

export interface ResolveResult {
  choice: WorkingChoice | null;
  skipped: { modelId: string; status: ModelHealth }[];
  probed: number;
}

/**
 * Returns a model that passed a real request. Untested models are probed in
 * order (free + tools first) and models that need a key are skipped.
 */
export async function resolveWorkingModel(
  preferred?: string,
  maxProbes = 3,
): Promise<ResolveResult> {
  let list = loadProviders();
  const now = Date.now();
  const catalog = flattenCatalog(buildCatalog(list, false));
  const all = flattenCatalog(buildCatalog(list, true));
  const skipped: { modelId: string; status: ModelHealth }[] = [];
  const ordered: CatalogModel[] = [];
  // An explicitly selected model is honoured even when it is hidden by default
  // ("Show all"), because the user picked it on purpose.
  const preferredHit = preferred
    ? all.find((m) => m.id === preferred && m.kind === 'chat')
    : undefined;
  if (preferredHit) ordered.push(preferredHit);
  for (const model of probeOrder(catalog)) {
    if (!ordered.some((m) => m.id === model.id && m.providerId === model.providerId)) ordered.push(model);
  }

  let probed = 0;
  let replyOnly: WorkingChoice | null = null;
  for (const model of ordered) {
    if (probed >= maxProbes && !replyOnly) break;
    const provider = list.find((p) => p.id === model.providerId);
    if (!provider) continue;
    if (provider.cooldownUntil && provider.cooldownUntil > now) continue;
    if (model.health === 'ok') {
      return { choice: { providerId: model.providerId, modelId: model.id }, skipped, probed };
    }
    if (model.health === 'no-tools' && !replyOnly) {
      replyOnly = { providerId: model.providerId, modelId: model.id };
      if (probed >= maxProbes) break;
      continue;
    }
    if (probed >= maxProbes) break;
    const outcome = await probeModel(model.providerId, model.id, { list });
    probed += 1;
    list = recordHealth(list, model.providerId, model.id, outcome);
    saveProviders(list);
    if (outcome.status === 'ok') {
      return { choice: { providerId: model.providerId, modelId: model.id }, skipped, probed };
    }
    skipped.push({ modelId: model.id, status: outcome.status });
    if (outcome.status === 'no-tools' && !replyOnly) {
      replyOnly = { providerId: model.providerId, modelId: model.id };
    }
  }
  return { choice: replyOnly, skipped, probed };
}

export type ProviderTestState = 'ok' | 'no-tools' | 'needs-key' | 'failed' | 'connection-only';

export interface ProviderTestResult {
  state: ProviderTestState;
  models: number;
  modelId?: string;
  error?: string;
  diagnostic?: Diagnostic;
}

/**
 * Tests a provider with a model from its *own* catalog. The key is already
 * saved by the caller; this never reuses a model from another provider.
 */
export async function testProviderConnection(
  providerId: string,
  options: { fetchImpl?: typeof fetch } = {},
): Promise<ProviderTestResult> {
  const list = loadProviders();
  const provider = list.find((p) => p.id === providerId);
  if (!provider) return { state: 'failed', models: 0, error: 'Unknown provider' };

  const registry = registryFor(list);
  let diagnostic: Diagnostic | undefined;
  try {
    await registry.refreshCatalog(providerId);
    saveProviders(list);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    const code = errorCode(err);
    const status = (err as ProviderError)?.status;
    // An explicit HTTP rejection is the real cause; only transport failures
    // need the extra CORS/network probe.
    if (code === 'auth' || code === 'quota' || code === 'rate' || code === 'server') {
      diagnostic = {
        kind: code === 'rate' ? 'rate' : code === 'quota' || code === 'auth' ? 'auth' : 'server',
        status,
        at: Date.now(),
        url: catalogUrl(provider),
        detail,
      };
      return {
        state: code === 'rate' ? 'failed' : 'needs-key',
        models: provider.models.length,
        diagnostic,
        error: `${code}${status ? ` (${status})` : ''}: ${detail}`,
      };
    }
    diagnostic = await diagnoseEndpoint(catalogUrl(provider), {
      fetchImpl: options.fetchImpl,
      online: typeof navigator === 'undefined' ? true : navigator.onLine,
    });
    if (diagnostic.kind === 'ok') {
      return {
        state: 'connection-only',
        models: provider.models.length,
        diagnostic,
        error: detail,
      };
    }
    return {
      state: diagnostic.kind === 'auth' || diagnostic.kind === 'rate' ? 'needs-key' : 'failed',
      models: provider.models.length,
      diagnostic,
      error: `${diagnostic.kind}${diagnostic.status ? ` (${diagnostic.status})` : ''}: ${detail}`,
    };
  }

  const models = provider.models.filter((m) => !m.retired);
  const chat = flattenCatalog(
    buildCatalog([{ ...provider, enabled: true, models, corsStatus: 'ok' }], true).map((g) => ({
      ...g,
      models: g.models.filter((m) => m.kind === 'chat'),
    })),
  ).filter((m) => m.kind === 'chat');
  const tested = pickDefaultModel(chat.filter((m) => m.health === 'ok'));
  if (tested) return { state: 'ok', models: models.length, modelId: tested.id };
  const candidates = probeOrder(chat).slice(0, 3);
  if (!candidates.length) {
    return { state: 'connection-only', models: models.length, diagnostic };
  }

  let last: ProbeOutcome | undefined;
  let lastId: string | undefined;
  let current = list;
  for (const candidate of candidates) {
    const outcome = await probeModel(providerId, candidate.id, { list: current });
    last = outcome;
    lastId = candidate.id;
    current = recordHealth(current, providerId, candidate.id, outcome);
    saveProviders(current);
    if (outcome.status === 'ok') {
      return { state: 'ok', models: models.length, modelId: candidate.id };
    }
  }
  // A transport failure is diagnosed against the chat endpoint itself so the
  // UI can tell CORS apart from a network/DNS failure.
  if (last && (last.code === 'network' || last.code === 'cors' || last.code === 'timeout')) {
    diagnostic = await diagnoseEndpoint(`${provider.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      fetchImpl: options.fetchImpl,
      online: typeof navigator === 'undefined' ? true : navigator.onLine,
    });
  }
  return {
    state: last?.status ?? 'failed',
    models: models.length,
    modelId: lastId,
    error: last?.error,
    diagnostic,
  };
}

/** A model is usable without tools (reply only) when the probe saw "no tools". */
export function isReplyOnly(model: Pick<CatalogModel, 'health'>): boolean {
  return model.health === 'no-tools';
}

export function isHiddenByDefault(provider: ProviderConfig, modelId: string): boolean {
  const model = provider.models.find((m) => m.id === modelId);
  if (!model) return true;
  return modelKind(model) !== 'chat' || !isVisibleByDefault(model);
}

export type { PriceTier };
