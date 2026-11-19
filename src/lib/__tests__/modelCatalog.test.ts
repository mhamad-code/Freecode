import { describe, expect, it } from 'vitest';
import { buildCatalog, findModel, flattenCatalog, pickDefaultModel } from '../modelCatalog';
import type { ModelInfo, ProviderConfig } from '../../engine/providers/types';

const model = (id: string, extra: Partial<ModelInfo> = {}): ModelInfo => ({
  id,
  label: id,
  tools: 'unknown',
  reasoning: 'unknown',
  vision: 'unknown',
  provenance: { tools: 'provider', reasoning: 'inferred', vision: 'inferred' },
  ...extra,
});

const provider = (id: string, models: ModelInfo[], extra: Partial<ProviderConfig> = {}): ProviderConfig => ({
  id,
  label: id,
  kind: 'builtin-free',
  protocol: 'openai-compatible',
  baseUrl: 'https://example.test',
  enabled: true,
  order: 0,
  auth: { type: 'none' },
  keys: [],
  headers: [],
  catalog: { path: '/models', parser: 'openai' },
  quirks: { supportsStreamUsage: false, supportsParallelTools: false, strictTemplates: false },
  corsStatus: 'ok',
  models,
  ...extra,
});

describe('model catalog', () => {
  it('hides keyless models without tools unless showAll is set', () => {
    const list = [provider('free', [model('chatty', { tools: false }), model('agent', { tools: true })])];
    const visible = flattenCatalog(buildCatalog(list));
    expect(visible).toHaveLength(1);
    expect(visible[0].free).toBe(true);
    expect(buildCatalog(list)[0].hidden).toBe(1);
    expect(flattenCatalog(buildCatalog(list, true))).toHaveLength(2);
  });

  it('keeps every model for providers that have a key', () => {
    const list = [
      provider('own', [model('no-tools', { tools: false })], {
        kind: 'custom',
        auth: { type: 'bearer' },
      }),
    ];
    expect(flattenCatalog(buildCatalog(list))).toHaveLength(1);
  });

  it('skips disabled and CORS-blocked providers', () => {
    const list = [
      provider('off', [model('a', { tools: true })], { enabled: false }),
      provider('blocked', [model('b', { tools: true })], { corsStatus: 'blocked' }),
    ];
    expect(buildCatalog(list)).toEqual([]);
  });

  it('prefers kilo-auto/free when it supports tools', () => {
    const models = flattenCatalog(
      buildCatalog([
        provider('kilo', [model('kilo-auto/free', { tools: true, free: true })]),
        provider('other', [model('big', { tools: true, free: true, contextWindow: 1_000_000 })]),
      ]),
    );
    expect(pickDefaultModel(models)?.id).toBe('kilo-auto/free');
  });

  it('falls back to the free tool model with the largest context', () => {
    const models = flattenCatalog(
      buildCatalog([
        provider(
          'p',
          [
            model('small', { tools: true, free: true, contextWindow: 32_000 }),
            model('large', { tools: true, free: true, contextWindow: 200_000 }),
            model('paid', { tools: true, free: false, contextWindow: 400_000 }),
          ],
          { kind: 'custom', auth: { type: 'bearer' } },
        ),
      ]),
    );
    expect(pickDefaultModel(models)?.id).toBe('large');
  });

  it('resolves a model id back to its provider', () => {
    const list = [provider('p', [model('m', { tools: true })])];
    expect(findModel(list, 'm')?.provider.id).toBe('p');
    expect(findModel(list, 'missing')).toBeNull();
  });
});
