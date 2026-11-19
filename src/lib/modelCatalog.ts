import type { ModelInfo, ProviderConfig } from '../engine/providers/types';

export interface CatalogModel {
  id: string;
  label: string;
  providerId: string;
  providerLabel: string;
  keyless: boolean;
  free: boolean;
  tools: boolean;
  reasoning: boolean;
  contextWindow?: number;
}

export interface CatalogGroup {
  providerId: string;
  label: string;
  keyless: boolean;
  models: CatalogModel[];
  /** Models without tool support that stay hidden unless "Show all" is on. */
  hidden: number;
}

export const isMockMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).get('mock') === '1';
  } catch {
    return false;
  }
};

const usable = (model: ModelInfo) => !model.hidden && !model.retired;

const supportsTools = (model: ModelInfo) => model.tools === true;

export function buildCatalog(providers: ProviderConfig[], showAll = false): CatalogGroup[] {
  const groups: CatalogGroup[] = [];
  for (const provider of providers) {
    if (!provider.enabled || provider.corsStatus === 'blocked') continue;
    const keyless = provider.auth.type === 'none';
    const visible: CatalogModel[] = [];
    let hidden = 0;
    for (const model of provider.models) {
      if (!usable(model)) continue;
      if (keyless && !showAll && !supportsTools(model)) {
        hidden += 1;
        continue;
      }
      visible.push({
        id: model.id,
        label: model.label || model.id,
        providerId: provider.id,
        providerLabel: provider.label,
        keyless,
        // Every model of a keyless provider is free to use.
        free: keyless || Boolean(model.free),
        tools: supportsTools(model),
        reasoning: model.reasoning === true,
        contextWindow: model.contextWindow,
      });
    }
    if (visible.length) groups.push({ providerId: provider.id, label: provider.label, keyless, models: visible, hidden });
  }
  return groups;
}

export const flattenCatalog = (groups: CatalogGroup[]): CatalogModel[] => groups.flatMap((g) => g.models);

/** kilo-auto/free when it supports tools, otherwise the free tool-capable model with the largest context. */
export function pickDefaultModel(models: CatalogModel[]): CatalogModel | null {
  const kilo = models.find((m) => m.id === 'kilo-auto/free' || m.id === 'kilo-auto');
  if (kilo && kilo.tools) return kilo;
  const candidates = models.filter((m) => m.free && m.tools);
  if (candidates.length) {
    return candidates.reduce((best, m) => ((m.contextWindow ?? 0) > (best.contextWindow ?? 0) ? m : best));
  }
  return models.find((m) => m.tools) ?? models[0] ?? null;
}

export function findModel(
  providers: ProviderConfig[],
  modelId: string,
): { provider: ProviderConfig; model: ModelInfo } | null {
  for (const provider of providers) {
    if (!provider.enabled) continue;
    const model = provider.models.find((m) => m.id === modelId && usable(m));
    if (model) return { provider, model };
  }
  return null;
}
