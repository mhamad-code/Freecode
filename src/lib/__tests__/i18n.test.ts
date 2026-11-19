import { describe, expect, it } from 'vitest';
import { ar, en } from '../i18n';

describe('i18n key parity', () => {
  it('has the same keys in English and Arabic', () => {
    const enKeys = new Set(Object.keys(en));
    const arKeys = new Set(Object.keys(ar));
    const missingInAr = [...enKeys].filter((k) => !arKeys.has(k)).sort();
    const missingInEn = [...arKeys].filter((k) => !enKeys.has(k)).sort();
    expect({ missingInAr, missingInEn }).toEqual({ missingInAr: [], missingInEn: [] });
  });

  it('has no empty translations', () => {
    const empty = [...Object.entries(en), ...Object.entries(ar)]
      .filter(([, value]) => !String(value).trim())
      .map(([key]) => key);
    expect(empty).toEqual([]);
  });
});
