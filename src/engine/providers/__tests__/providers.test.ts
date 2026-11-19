import { describe, expect, it } from 'vitest';
import { classifyStatus, parseRetryAfter, statusToError } from '../errors';
import { SlidingWindowCounter, parseRateHeaders } from '../rateLimit';
import { markKeyFailed, pickKey } from '../keys';
import { decideFallback } from '../fallback';
import {
  inferCapabilities,
  resolveModel,
} from '../capabilities';
import {
  parseOpenRouterCatalog,
  pickDefaultModel,
  reconcileModels,
} from '../catalog';
import {
  canSaveRule,
  classifyCommand,
  decide,
  normalizeRule,
} from '../../agent/permissions';
import type { ModelInfo, ProviderKeyRef } from '../types';

describe('provider errors', () => {
  it('classifies status codes', () => {
    expect(classifyStatus(401)).toBe('auth');
    expect(classifyStatus(402)).toBe('quota');
    expect(classifyStatus(429)).toBe('rate');
    expect(classifyStatus(404)).toBe('model-not-found');
    expect(classifyStatus(500)).toBe('server');
  });

  it('parses Retry-After in seconds', () => {
    expect(parseRetryAfter('3')).toBe(3000);
  });

  it('maps a 429 with Retry-After', () => {
    const err = statusToError(429, 'slow down', new Headers({ 'retry-after': '5' }));
    expect(err.code).toBe('rate');
    expect(err.retryAfterMs).toBe(5000);
  });

  it('recognizes context-length 400 bodies', () => {
    expect(statusToError(400, 'maximum context length exceeded').code).toBe('context-length');
  });
});

describe('rate limiting', () => {
  it('counts within a sliding window', () => {
    const counter = new SlidingWindowCounter(60000);
    counter.record(1000);
    counter.record(2000);
    expect(counter.count(3000)).toBe(2);
    expect(counter.remaining(5, 3000)).toBe(3);
    expect(counter.count(70000)).toBe(0);
  });

  it('parses rate headers', () => {
    const parsed = parseRateHeaders(
      new Headers({ 'x-ratelimit-remaining-requests': '9', 'x-ratelimit-limit-requests': '20' }),
    );
    expect(parsed).toEqual({ remaining: 9, limit: 20, resetAt: undefined });
  });
});

describe('key pool', () => {
  const keys: ProviderKeyRef[] = [
    { id: 'a', label: 'A', enabled: true },
    { id: 'b', label: 'B', enabled: true, cooldownUntil: 5000 },
  ];

  it('skips keys on cooldown', () => {
    expect(pickKey(keys, 'failure', 1000)?.key.id).toBe('a');
  });

  it('returns the earliest cooldown when all are cooling', () => {
    const all = keys.map((k) => ({ ...k, cooldownUntil: 9000 }));
    expect(pickKey(all, 'failure', 1000)?.key.id).toBe('a');
  });

  it('round-robins across usable keys', () => {
    const both: ProviderKeyRef[] = [
      { id: 'a', label: 'A', enabled: true },
      { id: 'b', label: 'B', enabled: true },
    ];
    const first = pickKey(both, 'round-robin', 1000, 0);
    const second = pickKey(both, 'round-robin', 1000, first?.cursor ?? 0);
    expect(first?.key.id).not.toBe(second?.key.id);
  });

  it('marks a key for cooldown', () => {
    const next = markKeyFailed(keys, 'a', 1000, 1000);
    expect(next[0].cooldownUntil).toBe(2000);
  });
});

describe('fallback', () => {
  const ctx = {
    outputStarted: false,
    attempts: 0,
    maxRetries: 2,
    currentIndex: 0,
    chainLength: 2,
    stayWithinProvider: false,
  };

  it('never retries after output started', () => {
    expect(decideFallback('server', undefined, { ...ctx, outputStarted: true })).toEqual({
      action: 'fail',
      reason: 'output-started',
    });
  });

  it('switches immediately on quota', () => {
    expect(decideFallback('quota', undefined, ctx)).toEqual({ action: 'switch', index: 1 });
  });

  it('retries a rate limit before switching', () => {
    expect(decideFallback('rate', 1234, ctx)).toEqual({ action: 'retry', delayMs: 1234 });
  });

  it('switches when retries are exhausted', () => {
    expect(decideFallback('rate', undefined, { ...ctx, attempts: 2 })).toEqual({
      action: 'switch',
      index: 1,
    });
  });

  it('does not switch when staying within the provider', () => {
    expect(
      decideFallback('quota', undefined, { ...ctx, stayWithinProvider: true }),
    ).toEqual({ action: 'fail', reason: 'exhausted' });
  });
});

describe('catalog and capabilities', () => {
  it('parses an OpenRouter catalog with free/tools flags', () => {
    const models = parseOpenRouterCatalog({
      data: [
        {
          id: 'vendor/model:free',
          name: 'Free Model',
          context_length: 32000,
          pricing: { prompt: '0', completion: '0' },
          supported_parameters: ['tools', 'reasoning'],
          architecture: { input_modalities: ['text', 'image'] },
        },
      ],
    });
    expect(models[0]).toMatchObject({ id: 'vendor/model:free', free: true, tools: true });
    expect(models[0].provenance.tools).toBe('provider');
  });

  it('marks missing models retired', () => {
    const prev: ModelInfo[] = [
      { id: 'a', label: 'a', tools: true, reasoning: 'unknown', vision: 'unknown', provenance: { tools: 'inferred', reasoning: 'inferred', vision: 'inferred' } },
    ];
    const next = reconcileModels(prev, []);
    expect(next.find((m) => m.id === 'a')?.retired).toBe(true);
  });

  it('infers families and keeps reported values', () => {
    expect(inferCapabilities('claude-3-7-sonnet').tools).toBe(true);
    const resolved = resolveModel({
      id: 'claude-3-7',
      label: 'claude',
      tools: true,
      reasoning: true,
      vision: true,
      provenance: { tools: 'provider', reasoning: 'provider', vision: 'provider' },
    });
    expect(resolved.provenance.tools).toBe('provider');
  });

  it('picks the tools-capable model with the largest context', () => {
    const models: ModelInfo[] = [
      { id: 'small', label: 's', tools: true, reasoning: 'unknown', vision: 'unknown', contextWindow: 8000, provenance: { tools: 'inferred', reasoning: 'inferred', vision: 'inferred' } },
      { id: 'big', label: 'b', tools: true, reasoning: 'unknown', vision: 'unknown', contextWindow: 128000, provenance: { tools: 'inferred', reasoning: 'inferred', vision: 'inferred' } },
      { id: 'chat', label: 'c', tools: false, reasoning: 'unknown', vision: 'unknown', contextWindow: 200000, provenance: { tools: 'inferred', reasoning: 'inferred', vision: 'inferred' } },
    ];
    expect(pickDefaultModel(models)?.id).toBe('big');
  });
});

describe('permissions', () => {
  it('classifies command risk', () => {
    expect(classifyCommand('ls -la')).toBe('low');
    expect(classifyCommand('npm run build')).toBe('medium');
    expect(classifyCommand('rm -rf node_modules')).toBe('high');
    expect(classifyCommand('cat a && rm -rf b')).toBe('high');
    expect(classifyCommand('sudo apt install x')).toBe('high');
  });

  it('decides by mode and risk', () => {
    expect(decide('read-only', 'medium')).toBe('deny');
    expect(decide('risky', 'medium', { hasRule: true })).toBe('allow');
    expect(decide('ask', 'high', { hasRule: true })).toBe('ask');
    expect(decide('allow-all', 'medium', { untrustedContent: true })).toBe('ask');
  });

  it('never saves a rule for high-risk commands', () => {
    expect(canSaveRule('rm -rf x', 'high')).toBe(false);
    expect(canSaveRule('npm run build', 'medium')).toBe(true);
  });

  it('normalizes rules', () => {
    expect(normalizeRule('  npm   run build ')).toBe('npm run build');
  });
});
