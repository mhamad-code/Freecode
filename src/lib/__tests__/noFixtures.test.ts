import { describe, expect, it } from 'vitest';

/**
 * F0 guard: demo fixture strings must never reach production code paths.
 * They are allowed only inside src/lib/mock/ (loaded from ?mock=1) and in tests.
 */
const FIXTURE_STRINGS = [
  'VEXORA',
  'AndroidHarness',
  'Clone Website Request',
  'Design System Extractor',
  '24.7M',
  'mohammed-hamra',
  'feature/activity-ui',
  'ghp_2f9a7c4e1b',
  'sk-live-9f2b',
];

const files = import.meta.glob('/src/**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const isAllowed = (path: string) =>
  path.startsWith('/src/lib/mock/') || /\.test\.tsx?$/.test(path) || path.startsWith('/src/lib/__tests__/');

describe('production code has no demo fixtures', () => {
  it('scans at least the main app files', () => {
    expect(Object.keys(files).length).toBeGreaterThan(20);
  });

  it('contains no fixture strings outside src/lib/mock and tests', () => {
    const offenders: string[] = [];
    for (const [path, text] of Object.entries(files)) {
      if (isAllowed(path)) continue;
      for (const needle of FIXTURE_STRINGS) {
        if (text.includes(needle)) offenders.push(`${path}: ${needle}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('keeps the fixtures out of the statically imported module graph', () => {
    const store = files['/src/store.ts'];
    expect(store).toBeTruthy();
    // A `import type` is erased at build time; only value imports would ship fixtures.
    expect(store).not.toMatch(/^import (?!type ).*from '\.\/lib\/mock/m);
    expect(store).toContain("await import('./lib/mock/scenario')");
  });
});
