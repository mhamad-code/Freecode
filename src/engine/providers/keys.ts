import type { ProviderKeyRef } from './types';

export type RotationMode = 'failure' | 'round-robin';

export interface PickKeyResult {
  key: ProviderKeyRef;
  cursor: number;
}

/**
 * Picks the next usable key. Keys on cooldown are skipped unless every key is
 * on cooldown, in which case the one with the earliest cooldown is returned so
 * the caller can surface the wait time instead of failing silently.
 */
export function pickKey(
  keys: ProviderKeyRef[],
  mode: RotationMode,
  now: number,
  cursor = 0,
): PickKeyResult | null {
  const enabled = keys.filter((k) => k.enabled);
  if (!enabled.length) return null;
  const usable = enabled.filter((k) => !k.cooldownUntil || k.cooldownUntil <= now);
  if (!usable.length) {
    const earliest = [...enabled].sort(
      (a, b) => (a.cooldownUntil ?? 0) - (b.cooldownUntil ?? 0),
    )[0];
    return { key: earliest, cursor };
  }
  if (mode === 'failure') {
    return { key: usable[0], cursor };
  }
  const start = ((cursor % usable.length) + usable.length) % usable.length;
  for (let i = 0; i < usable.length; i++) {
    const idx = (start + i) % usable.length;
    return { key: usable[idx], cursor: idx + 1 };
  }
  return { key: usable[0], cursor };
}

export function markKeyFailed(
  keys: ProviderKeyRef[],
  id: string,
  now: number,
  retryAfterMs?: number,
): ProviderKeyRef[] {
  const cooldown = now + (retryAfterMs ?? 60 * 60 * 1000);
  return keys.map((k) => (k.id === id ? { ...k, cooldownUntil: cooldown } : k));
}

export function keyCount(keys: ProviderKeyRef[]): number {
  return keys.filter((k) => k.enabled).length;
}
