import { describe, expect, it } from 'vitest';
import { Z_INDEX } from '../../lib/layers';
import { THEMES, colorAlpha, cssVars, opaqueColor } from '../registry';

const luminance = (hex: string): number => {
  const h = hex.replace('#', '');
  const channels = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe('floating surfaces', () => {
  it('every theme exposes a fully opaque popover colour', () => {
    const translucent: string[] = [];
    for (const theme of THEMES) {
      const popover = cssVars(theme)['--popover'];
      const alpha = colorAlpha(popover);
      if (alpha === null || alpha < 1 || /rgba?\(|hsla?\(/i.test(popover)) {
        translucent.push(`${theme.id}: ${popover}`);
      }
    }
    expect(translucent).toEqual([]);
  });

  it('keeps popover text readable on the popover surface', () => {
    const low: string[] = [];
    for (const theme of THEMES) {
      const vars = cssVars(theme);
      const ratio = contrast(vars['--popover'], vars['--popover-ink']);
      if (ratio < 4.5) low.push(`${theme.id}: ${ratio.toFixed(2)}`);
    }
    expect(low).toEqual([]);
  });

  it('flattens translucent panels over the backdrop', () => {
    expect(opaqueColor('rgba(12,20,16,.72)', '#2b3a33')).toBe('#151f1a');
    expect(opaqueColor('#121214', '#0b0b0c')).toBe('#121214');
    expect(colorAlpha(opaqueColor('rgba(255,250,244,.72)', '#f1e6d8'))).toBe(1);
  });

  it('orders the z-index tokens: panel < popover < dialog < toast', () => {
    expect(Z_INDEX.panel).toBeLessThan(Z_INDEX.popover);
    expect(Z_INDEX.popover).toBeLessThan(Z_INDEX.dialog);
    expect(Z_INDEX.dialog).toBeLessThan(Z_INDEX.toast);
  });
});
