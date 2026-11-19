export type ThemeMode = 'dark' | 'light';

export type ThemeTokens = {
  bg: string;
  bgImage?: string;
  panel: string;
  panel2: string;
  elevated: string;
  inverse: string;
  inverseInk: string;
  line: string;
  lineStrong: string;
  text: string;
  muted: string;
  faint: string;
  accent: string;
  accentInk: string;
  glassBlur?: string;
  info?: string;
  success?: string;
  cmd?: string;
  danger?: string;
};

export type ThemePreset = {
  id: string;
  label: string;
  mode: ThemeMode;
  locked?: boolean;
  glass?: boolean;
  gradient?: boolean;
  bgImage?: string;
  tokens: ThemeTokens;
  /** six swatches used by the palette board */
  palette: string[];
};

export const THEMES: ThemePreset[] = [
  {
    id: 'dark',
    label: 'Dark',
    mode: 'dark',
    palette: ['#0b0b0c', '#1b1b1e', '#2c2c30', '#8e8e93', '#6bb34f', '#f2f2f3'],
    tokens: {
      bg: '#0b0b0c',
      panel: '#121214',
      panel2: '#0e0e10',
      elevated: '#1b1b1e',
      inverse: '#e9e7df',
      inverseInk: '#1b1b1a',
      line: '#2c2c30',
      lineStrong: '#3b3b40',
      text: '#f2f2f3',
      muted: '#8e8e93',
      faint: '#5f5f64',
      accent: '#6bb34f',
      accentInk: '#12301a',
    },
  },
  {
    id: 'light',
    label: 'Light',
    mode: 'light',
    palette: ['#ecebe6', '#ffffff', '#dcdad2', '#6b6b66', '#5a9e3f', '#1b1b1a'],
    tokens: {
      bg: '#ecebe6',
      panel: '#fafaf8',
      panel2: '#f4f3ee',
      elevated: '#ffffff',
      inverse: '#22221f',
      inverseInk: '#fafaf8',
      line: '#dcdad2',
      lineStrong: '#c9c6bb',
      text: '#1b1b1a',
      muted: '#6b6b66',
      faint: '#9b9a93',
      accent: '#5a9e3f',
      accentInk: '#ffffff',
    },
  },
  {
    id: 'og-shine',
    label: 'OG Shine',
    mode: 'dark',
    palette: ['#050505', '#151515', '#262626', '#8a8a8a', '#2ee6b0', '#f5f5f5'],
    tokens: {
      bg: '#050505',
      panel: '#0c0c0c',
      panel2: '#090909',
      elevated: '#151515',
      inverse: '#e8efe9',
      inverseInk: '#04150f',
      line: '#262626',
      lineStrong: '#353535',
      text: '#f5f5f5',
      muted: '#8a8a8a',
      faint: '#5b5b5b',
      accent: '#2ee6b0',
      accentInk: '#04261c',
    },
  },
  {
    id: 'alpine',
    label: 'Alpine',
    mode: 'dark',
    locked: true,
    glass: true,
    bgImage:
      'radial-gradient(120% 70% at 12% 0%, rgba(190,220,205,.28) 0%, rgba(120,160,140,.10) 35%, transparent 62%), radial-gradient(90% 60% at 85% 100%, rgba(30,60,44,.65) 0%, transparent 70%), linear-gradient(180deg,#2b3a33 0%,#1c2b24 45%,#0f1a16 100%)',
    palette: ['#2b3a33', '#3d5347', '#6f8d7a', '#9fb0a4', '#8fd19a', '#eef3ee'],
    tokens: {
      bg: '#2b3a33',
      panel: 'rgba(12,20,16,.72)',
      panel2: 'rgba(10,17,13,.8)',
      elevated: 'rgba(255,255,255,.06)',
      inverse: '#dfeadf',
      inverseInk: '#0c2214',
      line: 'rgba(255,255,255,.12)',
      lineStrong: 'rgba(255,255,255,.2)',
      text: '#eef3ee',
      muted: '#9fb0a4',
      faint: '#74897c',
      accent: '#8fd19a',
      accentInk: '#0c2214',
      glassBlur: '16px',
    },
  },
  {
    id: 'dune',
    label: 'Dune',
    mode: 'light',
    locked: true,
    glass: true,
    bgImage:
      'radial-gradient(80% 50% at 20% 0%, rgba(255,255,255,.7) 0%, transparent 60%), linear-gradient(165deg,#f1e6d8 0%,#eccfb2 40%,#ddb183 68%,#c98a55 100%)',
    palette: ['#8a5a33', '#c98a55', '#e2c4a0', '#d8b48c', '#c0623a', '#2b1d12'],
    tokens: {
      bg: '#f1e6d8',
      panel: 'rgba(255,250,244,.72)',
      panel2: 'rgba(255,250,244,.8)',
      elevated: 'rgba(255,255,255,.55)',
      inverse: '#3a2617',
      inverseInk: '#fff8ef',
      line: 'rgba(80,50,30,.16)',
      lineStrong: 'rgba(80,50,30,.28)',
      text: '#2b1d12',
      muted: '#7a6552',
      faint: '#9c8873',
      accent: '#c0623a',
      accentInk: '#ffffff',
      glassBlur: '16px',
    },
  },
  {
    id: 'tide',
    label: 'Tide',
    mode: 'dark',
    locked: true,
    glass: true,
    bgImage:
      'radial-gradient(90% 60% at 15% 0%, rgba(120,220,215,.28) 0%, transparent 60%), radial-gradient(120% 70% at 50% 110%, rgba(31,181,176,.5) 0%, transparent 65%), linear-gradient(180deg,#0a2530 0%,#0e4a55 60%,#1fb5b0 100%)',
    palette: ['#0a2530', '#0e4a55', '#0c7075', '#0f969c', '#7fe0d0', '#e9f7f7'],
    tokens: {
      bg: '#0a2530',
      panel: 'rgba(6,22,28,.72)',
      panel2: 'rgba(5,19,24,.8)',
      elevated: 'rgba(255,255,255,.06)',
      inverse: '#dcfbf7',
      inverseInk: '#04302b',
      line: 'rgba(255,255,255,.12)',
      lineStrong: 'rgba(255,255,255,.2)',
      text: '#e9f7f7',
      muted: '#8fb8bb',
      faint: '#5f8c90',
      accent: '#7fe0d0',
      accentInk: '#04302b',
      glassBlur: '16px',
    },
  },
  {
    id: 'blossom',
    label: 'Blossom',
    mode: 'light',
    locked: true,
    glass: true,
    bgImage:
      'radial-gradient(70% 45% at 85% 5%, rgba(255,255,255,.9) 0%, transparent 60%), radial-gradient(60% 40% at 10% 10%, rgba(255,255,255,.6) 0%, transparent 60%), linear-gradient(160deg,#fbeef0 0%,#f7dde2 50%,#f2cfd6 100%)',
    palette: ['#8a3050', '#c8566e', '#f2cfd6', '#e7a8b5', '#c8566e', '#3a1a22'],
    tokens: {
      bg: '#fbeef0',
      panel: 'rgba(255,250,251,.74)',
      panel2: 'rgba(255,250,251,.82)',
      elevated: 'rgba(255,255,255,.6)',
      inverse: '#3a1a22',
      inverseInk: '#fff5f7',
      line: 'rgba(120,40,60,.14)',
      lineStrong: 'rgba(120,40,60,.26)',
      text: '#3a1a22',
      muted: '#8a6068',
      faint: '#ab868c',
      accent: '#c8566e',
      accentInk: '#ffffff',
      glassBlur: '16px',
    },
  },
  {
    id: 'ember',
    label: 'Ember',
    mode: 'dark',
    gradient: true,
    bgImage: 'linear-gradient(160deg,#a8420f 0%,#3a1608 35%,#120905 70%,#070403 100%)',
    palette: ['#a8420f', '#3a1608', '#251710', '#b69a88', '#ff8a3d', '#fbf1ea'],
    tokens: {
      bg: '#1a0b05',
      panel: 'rgba(22,12,8,.86)',
      panel2: 'rgba(20,10,6,.9)',
      elevated: '#251710',
      inverse: '#f7e3d4',
      inverseInk: '#2a1204',
      line: '#4a2c1c',
      lineStrong: '#5e3924',
      text: '#fbf1ea',
      muted: '#b69a88',
      faint: '#8b7364',
      accent: '#ff8a3d',
      accentInk: '#2a1204',
      cmd: '#e0b341',
    },
  },
  {
    id: 'rose',
    label: 'Rose',
    mode: 'dark',
    bgImage:
      'radial-gradient(70% 50% at 100% 0%, rgba(128,0,33,.35) 0%, transparent 60%), radial-gradient(70% 50% at 0% 100%, rgba(128,0,33,.35) 0%, transparent 60%)',
    palette: ['#800021', '#881144', '#D43A66', '#C24366', '#FF6984', '#FFE4D8'],
    tokens: {
      bg: '#12040a',
      panel: '#1c0811',
      panel2: '#16060d',
      elevated: '#2a0e1a',
      inverse: '#ffe4d8',
      inverseInk: '#3a0612',
      line: '#4a1a2c',
      lineStrong: '#62243a',
      text: '#ffe4d8',
      muted: '#c58a98',
      faint: '#8f5c68',
      accent: '#ff6984',
      accentInk: '#3a0612',
    },
  },
  {
    id: 'graphite',
    label: 'Graphite',
    mode: 'dark',
    palette: ['#0B0B0B', '#1A1A1A', '#333333', '#6B6B6B', '#D9D9D9', '#FFFFFF'],
    tokens: {
      bg: '#0b0b0b',
      panel: '#141414',
      panel2: '#101010',
      elevated: '#1a1a1a',
      inverse: '#ffffff',
      inverseInk: '#0b0b0b',
      line: '#333333',
      lineStrong: '#444444',
      text: '#ffffff',
      muted: '#9a9a9a',
      faint: '#6b6b6b',
      accent: '#ffffff',
      accentInk: '#0b0b0b',
      info: '#8fb4d9',
      success: '#9ecfa8',
      cmd: '#c9b48d',
    },
  },
  {
    id: 'violet',
    label: 'Violet',
    mode: 'dark',
    bgImage:
      'radial-gradient(80% 55% at 0% 50%, rgba(106,47,200,.28) 0%, transparent 60%), radial-gradient(80% 55% at 100% 50%, rgba(106,47,200,.28) 0%, transparent 60%)',
    palette: ['#0B0720', '#25134D', '#6A2FC8', '#9D71E8', '#D1B8FF', '#F2E9FF'],
    tokens: {
      bg: '#0b0720',
      panel: '#140b30',
      panel2: '#110927',
      elevated: '#25134d',
      inverse: '#f2e9ff',
      inverseInk: '#0b0720',
      line: '#3a2470',
      lineStrong: '#4d3090',
      text: '#f2e9ff',
      muted: '#a897d6',
      faint: '#7a6aa8',
      accent: '#9d71e8',
      accentInk: '#0b0720',
    },
  },
  {
    id: 'lagoon',
    label: 'Lagoon',
    mode: 'dark',
    bgImage:
      'radial-gradient(80% 55% at 0% 0%, rgba(15,150,156,.26) 0%, transparent 60%), radial-gradient(80% 55% at 100% 100%, rgba(15,150,156,.26) 0%, transparent 60%)',
    palette: ['#05161A', '#072E33', '#0C7075', '#0F969C', '#6DA5C0', '#294D61'],
    tokens: {
      bg: '#05161a',
      panel: '#08242a',
      panel2: '#061e23',
      elevated: '#072e33',
      inverse: '#e6f7f8',
      inverseInk: '#031a1c',
      line: '#134a52',
      lineStrong: '#1a6069',
      text: '#e6f7f8',
      muted: '#7fb0b6',
      faint: '#548186',
      accent: '#0f969c',
      accentInk: '#031a1c',
    },
  },
];

type RGBA = { r: number; g: number; b: number; a: number };

const parseColor = (input: string): RGBA | null => {
  const value = input.trim();
  const hex = /^#([0-9a-f]{3,8})$/i.exec(value);
  if (hex) {
    const h = hex[1];
    if (h.length === 3 || h.length === 4) {
      const [r, g, b, a = 'f'] = h.split('');
      return { r: parseInt(r + r, 16), g: parseInt(g + g, 16), b: parseInt(b + b, 16), a: parseInt(a + a, 16) / 255 };
    }
    if (h.length === 6 || h.length === 8) {
      return {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16),
        a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1,
      };
    }
    return null;
  }
  const rgb = /^rgba?\(([^)]+)\)$/i.exec(value);
  if (rgb) {
    const parts = rgb[1].replace(/\//g, ' ').replace(/,/g, ' ').split(/\s+/).filter(Boolean).map(Number);
    if (parts.length >= 3 && parts.slice(0, 3).every((n) => Number.isFinite(n))) {
      return { r: parts[0], g: parts[1], b: parts[2], a: Number.isFinite(parts[3]) ? parts[3] : 1 };
    }
  }
  return null;
};

const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');

/**
 * Flattens a (possibly translucent) colour over an opaque backdrop and returns hex.
 * Floating surfaces must be fully opaque so chat text can never bleed through.
 */
export const opaqueColor = (color: string, backdrop: string): string => {
  const fg = parseColor(color);
  const bg = parseColor(backdrop);
  if (!fg) return color;
  if (fg.a >= 1) return `#${toHex(fg.r)}${toHex(fg.g)}${toHex(fg.b)}`;
  if (!bg) return color;
  const base = bg.a >= 1 ? bg : { ...bg, a: 1 };
  const mix = (f: number, b: number) => f * fg.a + b * (1 - fg.a);
  return `#${toHex(mix(fg.r, base.r))}${toHex(mix(fg.g, base.g))}${toHex(mix(fg.b, base.b))}`;
};

/** Alpha of a colour string, or null when it cannot be parsed. */
export const colorAlpha = (color: string): number | null => parseColor(color)?.a ?? null;

export const THEME_BY_ID = (id: string) => THEMES.find((t) => t.id === id) ?? THEMES[0];
export const isThemeAvailable = (_id: string) => true;

export const cssVars = (t: ThemePreset): Record<string, string> => {
  const v: Record<string, string> = {};
  const map: Record<string, keyof ThemeTokens> = {
    '--bg': 'bg',
    '--panel': 'panel',
    '--panel-2': 'panel2',
    '--elevated': 'elevated',
    '--inverse': 'inverse',
    '--inverse-ink': 'inverseInk',
    '--line': 'line',
    '--line-strong': 'lineStrong',
    '--text': 'text',
    '--muted': 'muted',
    '--faint': 'faint',
    '--accent': 'accent',
    '--accent-ink': 'accentInk',
    '--glass-blur': 'glassBlur',
    '--info': 'info',
    '--success': 'success',
    '--cmd': 'cmd',
    '--danger': 'danger',
  };
  for (const [css, key] of Object.entries(map)) {
    const val = t.tokens[key];
    if (val) v[css] = val;
  }
  v['--popover'] = opaqueColor(t.tokens.panel, t.tokens.bg);
  v['--popover-ink'] = t.tokens.text;
  v['--bg-image'] = t.bgImage ? t.bgImage : 'none';
  return v;
};

export const applyTheme = (id: string, reducedMotion = false) => {
  const theme = THEME_BY_ID(id);
  const root = document.documentElement;
  root.classList.add('theme-switching');
  root.dataset.theme = theme.id;
  root.dataset.mode = theme.mode;
  const vars = cssVars(theme);
  for (const [k, val] of Object.entries(vars)) root.style.setProperty(k, val);
  // reset overrides from a previous theme
  const keep = new Set(Object.keys(vars));
  for (const prop of Array.from(root.style)) {
    if (prop.startsWith('--') && !keep.has(prop) && prop !== '--accent-override') root.style.removeProperty(prop);
  }
  root.classList.toggle('reduce-motion', reducedMotion);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme.tokens.bg);
  window.setTimeout(() => root.classList.remove('theme-switching'), 320);
};
