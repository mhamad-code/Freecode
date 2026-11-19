import type { ProviderConfig } from '../types';

/**
 * Endpoints and limits reported as of late 2026; they can change. Model ids are
 * never hard-coded — they are discovered from the live catalog (see catalog.ts).
 */
export function builtinFreeProviders(): ProviderConfig[] {
  return [
    {
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
      limits: { perHour: 200, note: 'Anonymous free models, about 200 requests/hour per IP.' },
      quirks: {
        supportsStreamUsage: true,
        supportsParallelTools: true,
        strictTemplates: false,
      },
      corsStatus: 'unknown',
      models: [],
    },
    {
      id: 'llm7',
      label: 'LLM7',
      kind: 'builtin-free',
      protocol: 'openai-compatible',
      baseUrl: 'https://api.llm7.io/v1',
      enabled: false,
      order: 1,
      auth: { type: 'none' },
      keys: [],
      headers: [],
      catalog: { path: '/models', parser: 'openai', freeFilter: 'none' },
      limits: { perMinute: 30, note: 'Anonymous, about 30 requests/min.' },
      quirks: {
        supportsStreamUsage: true,
        supportsParallelTools: false,
        strictTemplates: false,
      },
      corsStatus: 'unknown',
      models: [],
    },
    {
      id: 'ovh-anon',
      label: 'OVH AI Endpoints',
      kind: 'builtin-free',
      protocol: 'openai-compatible',
      baseUrl: 'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1',
      enabled: false,
      order: 2,
      auth: { type: 'header', headerName: 'Authorization', anonymousToken: 'Bearer anonymous' },
      keys: [],
      headers: [],
      catalog: { path: '/models', parser: 'openai', freeFilter: 'none' },
      limits: { perMinute: 2, note: 'About 2 requests/min. Chat only.' },
      quirks: {
        supportsStreamUsage: false,
        supportsParallelTools: false,
        strictTemplates: true,
      },
      corsStatus: 'unknown',
      models: [],
    },
  ];
}

export const FREE_PROVIDER_IDS = ['kilo-free', 'llm7', 'ovh-anon'] as const;

export const FREE_SERVICE_CONSENT =
  'This is a free shared service. Your prompts and project context are sent to a third party and may be logged there. Do not send secrets.';
