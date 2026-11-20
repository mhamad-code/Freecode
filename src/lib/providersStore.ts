import { builtinFreeProviders } from '../engine/providers/builtin/freeProviders';
import { presetConfig, type Preset } from '../engine/providers/builtin/presets';
import { ProviderRegistry } from '../engine/providers/registry';
import type { ProviderConfig } from '../engine/providers/types';
import type { KeyValueDB } from '../storage/db';
import { Vault } from '../storage/vault';
import { storeSecret } from '../storage/vaultDiagnostics';
import { cooldownFor, type Diagnostic } from './providerDiagnostics';

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

/** Stores the key first, independently of any connection test. */
export async function putProviderKey(
  providerId: string,
  value: string,
  deps: { db?: KeyValueDB } = {},
): Promise<void> {
  await storeSecret(profileId(), secretId(providerId, '0'), value, deps);
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

export interface FailureUpdate {
  failures: number;
  cooldownUntil?: number;
  lastDiagnostic?: ProviderConfig['lastDiagnostic'];
  corsStatus: ProviderConfig['corsStatus'];
}

/** Records one failure without losing the saved key or the catalog. */
export function recordProviderFailure(
  list: ProviderConfig[],
  providerId: string,
  diag: Diagnostic,
  now = Date.now(),
): ProviderConfig[] {
  return list.map((p) => {
    if (p.id !== providerId) return p;
    const failures = (p.failures ?? 0) + 1;
    const cooldown = cooldownFor(failures, diag.retryAfterMs, diag.at || now);
    const update: FailureUpdate = {
      failures,
      cooldownUntil: cooldown,
      corsStatus: diag.kind === 'cors' ? 'blocked' : p.corsStatus,
      lastDiagnostic: {
        kind: diag.kind,
        status: diag.status,
        at: diag.at,
        retryAfterMs: diag.retryAfterMs,
        message: diag.detail,
      },
    };
    return { ...p, ...update };
  });
}

export function clearProviderFailure(list: ProviderConfig[], providerId: string): ProviderConfig[] {
  return list.map((p) =>
    p.id === providerId
      ? {
          ...p,
          failures: 0,
          cooldownUntil: undefined,
          corsStatus: p.corsStatus === 'blocked' ? 'unknown' : p.corsStatus,
          lastDiagnostic: undefined,
        }
      : p,
  );
}

export function providerStatus(config: ProviderConfig): 'ready' | 'unreachable' | 'disabled' {
  if (!config.enabled) return 'disabled';
  if (config.corsStatus === 'blocked') return 'unreachable';
  if (config.models.length) return 'ready';
  return config.corsStatus === 'unknown' ? 'ready' : 'unreachable';
}
