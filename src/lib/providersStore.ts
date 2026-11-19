import { builtinFreeProviders } from '../engine/providers/builtin/freeProviders';
import { presetConfig, type Preset } from '../engine/providers/builtin/presets';
import { ProviderRegistry } from '../engine/providers/registry';
import type { ProviderConfig } from '../engine/providers/types';
import { Vault } from '../storage/vault';

const STORAGE_KEY = 'fc.providers';

export function profileId(): string {
  try {
    return localStorage.getItem('fc.profile') || 'local';
  } catch {
    return 'local';
  }
}

export function loadProviders(): ProviderConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ProviderConfig[];
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch {
    // fall through to defaults
  }
  return builtinFreeProviders();
}

export function saveProviders(list: ProviderConfig[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // storage may be unavailable; the UI surfaces the failure separately
  }
  try {
    window.dispatchEvent(new Event('fc:providers'));
  } catch {
    // no window (tests); the event is only a UI refresh hint
  }
}

const secretId = (providerId: string, keyId: string) => `provider:${providerId}:key:${keyId}`;

export async function putProviderKey(providerId: string, value: string): Promise<void> {
  const vault = await Vault.open(profileId());
  await vault.put(secretId(providerId, '0'), value);
}

export async function removeProviderKey(providerId: string): Promise<void> {
  const vault = await Vault.open(profileId());
  await vault.delete(secretId(providerId, '0'));
}

export async function secretFor(providerId: string, keyId: string): Promise<string | undefined> {
  const vault = await Vault.open(profileId());
  return vault.get(secretId(providerId, keyId));
}

export function registryFor(list: ProviderConfig[]): ProviderRegistry {
  return new ProviderRegistry(list, {
    getSecret: (providerId, keyId) => secretFor(providerId, keyId),
  });
}

export function addPreset(list: ProviderConfig[], preset: Preset): ProviderConfig[] {
  const config = presetConfig(preset, list.length);
  config.keys = [{ id: '0', label: preset.keyLabel, enabled: true }];
  return [...list, config];
}

export function providerStatus(config: ProviderConfig): 'ready' | 'unreachable' | 'disabled' {
  if (!config.enabled) return 'disabled';
  if (config.corsStatus === 'blocked') return 'unreachable';
  if (config.models.length) return 'ready';
  return config.corsStatus === 'unknown' ? 'ready' : 'unreachable';
}
