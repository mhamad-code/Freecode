import { describe, expect, it } from 'vitest';
import {
  buildCatalog,
  findModel,
  flattenCatalog,
  isVisibleByDefault,
  modelKind,
  pickDefaultModel,
  priceTier,
  probeOrder,
} from '../modelCatalog';
import { classifyModel } from '../../engine/providers/modelKind';
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

const freeChat = (id: string, extra: Partial<ModelInfo> = {}) =>
  model(id, { tools: true, free: true, ...extra });

describe('chat model classification', () => {
  it('falls back to name patterns when the catalog has no metadata', () => {
    expect(classifyModel({ id: 'whisper-large-v3-turbo' })).toBe('audio');
    expect(classifyModel({ id: 'text-embedding-3-small' })).toBe('embedding');
    expect(classifyModel({ id: 'openai/tts-1' })).toBe('audio');
    expect(classifyModel({ id: 'black-forest/flux-1' })).toBe('image');
    expect(classifyModel({ id: 'stability/stable-diffusion-xl' })).toBe('image');
    expect(classifyModel({ id: 'cohere/rerank-v3' })).toBe('rerank');
    expect(classifyModel({ id: 'omni-moderation-latest' })).toBe('moderation');
    expect(classifyModel({ id: 'claude-3-7-sonnet' })).toBe('chat');
  });

  it('prefers catalog metadata over the name', () => {
    expect(classifyModel({ id: 'some-image-tuned-chat', modalities: ['text'] })).toBe('chat');
    expect(classifyModel({ id: 'chat-model', modelType: 'embedding' })).toBe('embedding');
    expect(classifyModel({ id: 'chat-model', architecture: 'text->text' })).toBe('chat');
    expect(classifyModel({ id: 'voice-chat', modelType: 'chat' })).toBe('chat');
  });

  it('uses the stored kind once classified', () => {
    expect(modelKind(model('weird-name', { kind: 'image' }))).toBe('image');
  });
});

describe('free pricing', () => {
  it('only trusts the catalog', () => {
    expect(priceTier(model('a'))).toBe('unverified');
    expect(priceTier(model('b', { free: true }))).toBe('free');
    expect(priceTier(model('c', { pricing: { in: 0, out: 0 } }))).toBe('free');
    expect(priceTier(model('d', { pricing: { in: 0.1, out: 0.4 } }))).toBe('paid');
    expect(priceTier(model('e', { free: false, pricing: { in: 1, out: 2 } }))).toBe('paid');
  });
});

describe('model catalog', () => {
  it('shows chat models with a declared price and hides the rest by default', () => {
    const list = [
      provider('free', [
        freeChat('agent'),
        model('chat-no-tools', { free: true, tools: false }),
        model('unverified-chat', { tools: true }),
        model('whisper-large-v3', { free: true }),
        model('text-embedding-3', { free: true }),
      ]),
    ];
    const visible = flattenCatalog(buildCatalog(list));
    expect(visible.map((m) => m.id).sort()).toEqual(['agent', 'chat-no-tools']);
    expect(buildCatalog(list)[0].hidden).toBe(3);

    const all = flattenCatalog(buildCatalog(list, true));
    expect(all.map((m) => m.kind).sort()).toEqual(['audio', 'chat', 'chat', 'chat', 'embedding']);
    expect(all.find((m) => m.id === 'whisper-large-v3')?.kind).toBe('audio');
  });

  it('hides models that need a key or failed, even with Show all', () => {
    const list = [
      provider('free', [
        freeChat('needs-key', { health: 'needs-key' }),
        freeChat('failed', { health: 'failed' }),
        freeChat('reply-only', { health: 'no-tools' }),
      ]),
    ];
    const all = flattenCatalog(buildCatalog(list, true));
    expect(all.map((m) => m.id)).toEqual(['reply-only']);
  });

  it('does not call a keyless provider free without catalog proof', () => {
    const list = [provider('keyless', [model('mystery', { tools: true })])];
    expect(flattenCatalog(buildCatalog(list))).toEqual([]);
    expect(buildCatalog(list)[0].hidden).toBe(1);
    expect(isVisibleByDefault(model('mystery', { tools: true }))).toBe(false);
    expect(flattenCatalog(buildCatalog(list, true))[0].price).toBe('unverified');
  });

  it('skips disabled and CORS-blocked providers', () => {
    const list = [
      provider('off', [freeChat('a')], { enabled: false }),
      provider('blocked', [freeChat('b')], { corsStatus: 'blocked' }),
    ];
    expect(buildCatalog(list)).toEqual([]);
  });

  it('requires a passed test before choosing a default', () => {
    const untested = flattenCatalog(buildCatalog([provider('p', [freeChat('large', { contextWindow: 200_000 })])]));
    expect(pickDefaultModel(untested)).toBeNull();

    const tested = flattenCatalog(
      buildCatalog([
        provider('p', [
          freeChat('large', { contextWindow: 200_000, health: 'ok' }),
          freeChat('small', { contextWindow: 8_000, health: 'ok' }),
        ]),
      ]),
    );
    expect(pickDefaultModel(tested)?.id).toBe('large');
  });

  it('prefers a tested kilo-auto/free, then free tools with the largest context', () => {
    const kilo = flattenCatalog(
      buildCatalog([
        provider('kilo', [freeChat('kilo-auto/free', { health: 'ok' })]),
        provider('other', [freeChat('big', { health: 'ok', contextWindow: 1_000_000 })]),
      ]),
    );
    expect(pickDefaultModel(kilo)?.id).toBe('kilo-auto/free');

    const noKilo = flattenCatalog(
      buildCatalog([
        provider('p', [
          freeChat('small', { health: 'ok', contextWindow: 32_000 }),
          freeChat('large', { health: 'ok', contextWindow: 200_000 }),
        ]),
      ]),
    );
    expect(pickDefaultModel(noKilo)?.id).toBe('large');
  });

  it('probes free tool-capable chat models first', () => {
    const models = flattenCatalog(
      buildCatalog(
        [
          provider('p', [
            model('paid-tools', { tools: true, pricing: { in: 1, out: 1 } }),
            freeChat('free-no-tools', { tools: false }),
            freeChat('free-tools', { contextWindow: 1000 }),
          ]),
        ],
        true,
      ),
    );
    const order = probeOrder(models).map((m) => m.id);
    expect(order[0]).toBe('free-tools');
    expect(order.indexOf('free-no-tools')).toBeLessThan(order.indexOf('paid-tools'));
  });

  it('resolves a model id back to its provider', () => {
    const list = [provider('p', [model('m', { tools: true })])];
    expect(findModel(list, 'm')?.provider.id).toBe('p');
    expect(findModel(list, 'missing')).toBeNull();
  });
});
