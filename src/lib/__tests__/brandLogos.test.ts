import { describe, expect, it } from 'vitest';
import { INTEGRATION_CATALOG } from '../integrations';
import { NO_BRAND_LOGO, brandColor, logoFor } from '../brandLogos';
import { builtinFreeProviders } from '../../engine/providers/builtin/freeProviders';
import { PRESETS } from '../../engine/providers/builtin/presets';

const SURFACE_IDS = [
  ...INTEGRATION_CATALOG.map((i) => i.id),
  ...builtinFreeProviders().map((p) => p.id),
  ...PRESETS.map((p) => p.id),
];

describe('brand logos', () => {
  it('resolves a real mark for every integration', () => {
    const missing = INTEGRATION_CATALOG.filter((i) => !logoFor(i.id)).map((i) => i.id);
    expect(missing).toEqual(['slack']);
  });

  it('covers the provider surfaces and only falls back where documented', () => {
    const missing = SURFACE_IDS.filter((id) => !logoFor(id));
    expect(missing.sort()).toEqual([...NO_BRAND_LOGO].sort());
  });

  it('ships a path and a six-digit brand colour for every mark', () => {
    for (const id of SURFACE_IDS) {
      if (!logoFor(id)) continue;
      expect(logoFor(id)!.path.length).toBeGreaterThan(10);
      expect(brandColor(id)).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('documented gaps never get a look-alike mark', () => {
    for (const id of NO_BRAND_LOGO) expect(logoFor(id)).toBeUndefined();
  });
});
