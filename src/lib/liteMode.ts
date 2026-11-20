import type { LiteSetting } from '../engine/providers/lite';

const KEY = 'fc.lite';

export function getLiteSetting(): LiteSetting {
  try {
    const raw = localStorage.getItem(KEY);
    return raw === 'on' || raw === 'off' ? raw : 'auto';
  } catch {
    return 'auto';
  }
}

export function setLiteSetting(value: LiteSetting): void {
  try {
    localStorage.setItem(KEY, value);
  } catch {
    // storage unavailable; the setting simply does not persist
  }
  try {
    window.dispatchEvent(new Event('fc:lite'));
  } catch {
    // no window (tests)
  }
}
