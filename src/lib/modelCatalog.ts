import type { ModelInfo, ProviderConfig } from '../engine/providers/types';
import { classifyModel, type ModelKind } from '../engine/providers/modelKind';

export type PriceTier = 'free' | 'paid' | 'unverified';

export interface CatalogModel {
  id: string;
  label: string;
  providerId: string;
  providerLabel: string;
  keyless: boolean;
  kind: ModelKind;
  price: PriceTier;
  /** Catalog-declared free. Unknown pricing is not free. */
  free: boolean;
  tools: boolean;
  reasoning: boolean;
  health?: ModelInfo['health'];
  contextWindow?: number;
}

export interface CatalogGroup {
  providerId: string;
  label: string;
  keyless: boolean;
  models: CatalogModel[];
  /** Chat models hidden by default (paid/unverified/non-chat) unless "Show all" is on. */
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

export const modelKind = (model: ModelInfo): ModelKind => model.kind ?? classifyModel(model);

export function priceTier(model: ModelInfo): PriceTier {
  if (model.free === true) return 'free';
  const pricing = model.pricing;
  if (pricing && (pricing.in !== undefined || pricing.out !== undefined)) {
    return (pricing.in ?? 0) === 0 && (pricing.out ?? 0) === 0 ? 'free' : 'paid';
  }
  return 'unverified';
}

/** True when this model may be offered to the user without "Show all". */
export function isVisibleByDefault(model: ModelInfo): boolean {
  if (modelKind(model) !== 'chat') return false;
  if (model.health === 'needs-key' || model.health === 'failed') return false;
  return priceTier(model) !== 'unverified';
}

export function buildCatalog(providers: ProviderConfig[], showAll = false): CatalogGroup[] {
  const groups: CatalogGroup[] = [];
  for (const provider of providers) {
    if (!provider.enabled || provider.corsStatus === 'blocked') continue;
    const keyless = provider.auth.type === 'none';
    const visible: CatalogModel[] = [];
    let hidden = 0;
    for (const model of provider.models) {
      if (!usable(model)) continue;
      const kind = modelKind(model);
      const price = priceTier(model);
      // A model that failed or needs a key stays out of the default list even with "Show all".
      if (model.health === 'needs-key' || model.health === 'failed') continue;
      if (!showAll && !isVisibleByDefault(model)) {
        hidden += 1;
        continue;
      }
      visible.push({
        id: model.id,
        label: model.label || model.id,
        providerId: provider.id,
        providerLabel: provider.label,
        keyless,
        kind,
        price,
        free: price === 'free',
        tools: model.tools === true,
        reasoning: model.reasoning === true,
        health: model.health,
        contextWindow: model.contextWindow,
      });
    }
    if (visible.length || hidden) {
      groups.push({ providerId: provider.id, label: provider.label, keyless, models: visible, hidden });
    }
  }
  return groups;
}

export const flattenCatalog = (groups: CatalogGroup[]): CatalogModel[] => groups.flatMap((g) => g.models);

/**
 * The default model must have passed a real probe. Free and tools-capable
 * models win; `kilo-auto/free` wins over everything when it passed.
 */
export function pickDefaultModel(models: CatalogModel[]): CatalogModel | null {
  const tested = models.filter((m) => m.kind === 'chat' && m.health === 'ok');
  const kilo = tested.find((m) => m.id === 'kilo-auto/free' || m.id === 'kilo-auto');
  if (kilo) return kilo;
  if (!tested.length) return null;
  return [...tested].sort((a, b) => {
    const free = Number(b.free) - Number(a.free);
    if (free) return free;
    const tools = Number(b.tools) - Number(a.tools);
    if (tools) return tools;
    return (b.contextWindow ?? 0) - (a.contextWindow ?? 0);
  })[0];
}

/** Probe order: free chat models with tools first, then other free chat models. */
export function probeOrder(models: CatalogModel[]): CatalogModel[] {
  return [...models]
    .filter((m) => m.kind === 'chat')
    .sort((a, b) => {
      const free = Number(b.free) - Number(a.free);
      if (free) return free;
      const tools = Number(b.tools) - Number(a.tools);
      if (tools) return tools;
      return (b.contextWindow ?? 0) - (a.contextWindow ?? 0);
    });
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
