import type { ModelInfo } from './types';

export const CATALOG_TTL = 60 * 60 * 1000;

type Rec = Record<string, unknown>;

function asRecord(value: unknown): Rec | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Rec)
    : null;
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function num(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value)))
    return Number(value);
  return undefined;
}

function entries(json: unknown): Rec[] {
  const rec = asRecord(json);
  const data = rec?.data ?? rec?.models ?? json;
  if (!Array.isArray(data)) return [];
  return data.map(asRecord).filter((x): x is Rec => x !== null);
}

function baseModel(id: string, label?: string): ModelInfo {
  return {
    id,
    label: label ?? id,
    tools: 'unknown',
    reasoning: 'unknown',
    vision: 'unknown',
    provenance: { tools: 'inferred', reasoning: 'inferred', vision: 'inferred' },
  };
}

export function parseOpenAICatalog(json: unknown): ModelInfo[] {
  return entries(json)
    .map((m) => {
      const id = str(m.id);
      if (!id) return null;
      const model = baseModel(id, str(m.name));
      const ctx = num(m.context_length) ?? num(m.context_window);
      if (ctx) model.contextWindow = ctx;
      return model;
    })
    .filter((m): m is ModelInfo => m !== null);
}

function supports(parameters: unknown, name: string): boolean {
  return Array.isArray(parameters) && parameters.includes(name);
}

export function parseOpenRouterCatalog(json: unknown): ModelInfo[] {
  return entries(json)
    .map((m) => {
      const id = str(m.id);
      if (!id) return null;
      const model = baseModel(id, str(m.name));
      const ctx = num(m.context_length);
      if (ctx) model.contextWindow = ctx;
      const pricing = asRecord(m.pricing);
      const inCost = num(pricing?.prompt);
      const outCost = num(pricing?.completion);
      if (inCost !== undefined || outCost !== undefined) {
        model.pricing = { in: inCost, out: outCost };
        if ((inCost ?? 0) === 0 && (outCost ?? 0) === 0) model.free = true;
      }
      if (id.endsWith(':free')) model.free = true;
      if (supports(m.supported_parameters, 'tools')) {
        model.tools = true;
        model.provenance.tools = 'provider';
      }
      if (
        supports(m.supported_parameters, 'reasoning') ||
        supports(m.supported_parameters, 'include_reasoning')
      ) {
        model.reasoning = true;
        model.provenance.reasoning = 'provider';
      }
      const arch = asRecord(m.architecture);
      const modalities = arch?.input_modalities;
      if (Array.isArray(modalities) && modalities.includes('image')) {
        model.vision = true;
        model.provenance.vision = 'provider';
      }
      return model;
    })
    .filter((m): m is ModelInfo => m !== null);
}

export function parseKiloCatalog(json: unknown): ModelInfo[] {
  return entries(json)
    .map((m) => {
      const id = str(m.id);
      if (!id) return null;
      const model = baseModel(id, str(m.name));
      const ctx = num(m.context_length) ?? num(m.context_window);
      if (ctx) model.contextWindow = ctx;
      const free = /:free\b/.test(id) || /(^|[/-])free($|[/-])/i.test(id) || id === 'kilo-auto/free';
      if (free) model.free = true;
      if (supports(m.supported_parameters, 'tools')) {
        model.tools = true;
        model.provenance.tools = 'provider';
      }
      return model;
    })
    .filter((m): m is ModelInfo => m !== null);
}

export function parseCatalog(
  parser: 'openai' | 'openrouter' | 'kilo',
  json: unknown,
): ModelInfo[] {
  if (parser === 'openrouter') return parseOpenRouterCatalog(json);
  if (parser === 'kilo') return parseKiloCatalog(json);
  return parseOpenAICatalog(json);
}

export function isStale(at: number | undefined, now = Date.now()): boolean {
  return !at || now - at > CATALOG_TTL;
}

/** Marks models present before but missing now as retired; keeps local flags. */
export function reconcileModels(prev: ModelInfo[], next: ModelInfo[]): ModelInfo[] {
  const byId = new Map(next.map((m) => [m.id, m]));
  for (const old of prev) {
    if (!byId.has(old.id)) byId.set(old.id, { ...old, retired: true });
    else {
      const fresh = byId.get(old.id)!;
      byId.set(old.id, {
        ...fresh,
        hidden: old.hidden,
        custom: old.custom,
      });
    }
  }
  return [...byId.values()];
}

/** Picks the default model for a keyless provider: prefer tools-capable, largest context. */
export function pickDefaultModel(models: ModelInfo[], preferId?: string): ModelInfo | null {
  const usable = models.filter((m) => !m.retired);
  if (preferId) {
    const preferred = usable.find((m) => m.id === preferId);
    if (preferred) return preferred;
  }
  const tools = usable.filter((m) => m.tools === true);
  const pool = tools.length ? tools : usable;
  if (!pool.length) return null;
  return [...pool].sort((a, b) => (b.contextWindow ?? 0) - (a.contextWindow ?? 0))[0];
}
