import type { ModelInfo } from './types';

interface Family {
  match: RegExp;
  tools: boolean;
  reasoning: boolean;
  vision: boolean;
  contextWindow?: number;
}

const FAMILIES: Family[] = [
  { match: /claude/i, tools: true, reasoning: true, vision: true, contextWindow: 200000 },
  { match: /(^|\/)o[134](-|$)/i, tools: true, reasoning: true, vision: true, contextWindow: 200000 },
  { match: /gpt-4(\.1|o)?/i, tools: true, reasoning: false, vision: true, contextWindow: 128000 },
  { match: /gemini/i, tools: true, reasoning: true, vision: true, contextWindow: 1000000 },
  { match: /deepseek/i, tools: true, reasoning: true, vision: false, contextWindow: 128000 },
  { match: /qwen|qwq/i, tools: true, reasoning: false, vision: false, contextWindow: 128000 },
  { match: /llama/i, tools: true, reasoning: false, vision: false, contextWindow: 128000 },
  { match: /mistral|mixtral/i, tools: true, reasoning: false, vision: false, contextWindow: 32000 },
  { match: /grok/i, tools: true, reasoning: false, vision: false, contextWindow: 131072 },
];

export function inferCapabilities(id: string): Partial<ModelInfo> {
  const family = FAMILIES.find((f) => f.match.test(id));
  if (!family) {
    return {
      tools: 'unknown',
      reasoning: 'unknown',
      vision: 'unknown',
      provenance: { tools: 'inferred', reasoning: 'inferred', vision: 'inferred' },
    };
  }
  return {
    tools: family.tools,
    reasoning: family.reasoning,
    vision: family.vision,
    contextWindow: family.contextWindow,
    provenance: { tools: 'inferred', reasoning: 'inferred', vision: 'inferred' },
  };
}

/** Provider-reported values win over inference; user/tested provenance is kept when present. */
export function resolveModel(reported: ModelInfo): ModelInfo {
  const inferred = inferCapabilities(reported.id);
  const pick = <T>(value: T | 'unknown' | undefined, fallback: T | 'unknown'): T | 'unknown' =>
    value === undefined || value === 'unknown' ? fallback : value;

  const tools = pick(reported.tools, inferred.tools ?? 'unknown');
  const reasoning = pick(reported.reasoning, inferred.reasoning ?? 'unknown');
  const vision = pick(reported.vision, inferred.vision ?? 'unknown');
  const provenance = { ...(inferred.provenance ?? { tools: 'inferred', reasoning: 'inferred', vision: 'inferred' }) };
  if (reported.provenance) {
    if (reported.tools !== 'unknown') provenance.tools = reported.provenance.tools;
    if (reported.reasoning !== 'unknown') provenance.reasoning = reported.provenance.reasoning;
    if (reported.vision !== 'unknown') provenance.vision = reported.provenance.vision;
  }

  return {
    ...reported,
    tools,
    reasoning,
    vision,
    contextWindow: reported.contextWindow ?? inferred.contextWindow,
    provenance,
  };
}
