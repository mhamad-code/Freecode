import { describe, expect, it } from 'vitest';

/**
 * F2 guard: the CodeMirror editor and the xterm terminal are heavy. They are
 * only allowed to reach the app through `lazy(() => import(...))`, so the first
 * paint never pays for them.
 */
const files = import.meta.glob('/src/**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

describe('heavy renderers stay lazy', () => {
  it('ToolPane reaches CodeEditor and XTerm only through dynamic imports', () => {
    const pane = files['/src/components/ToolPane.tsx'];
    expect(pane).toBeTruthy();
    expect(pane).toContain("lazy(() => import('./CodeEditor'))");
    expect(pane).toContain("lazy(() => import('./XTerm'))");
    expect(pane).not.toMatch(/import\s+\w+\s+from\s+'\.\/(CodeEditor|XTerm)'/);
  });

  it('no other module imports the editor or the terminal statically', () => {
    const offenders = Object.entries(files)
      .filter(([path]) => !/\/(CodeEditor|XTerm)\.tsx$/.test(path))
      .filter(([, source]) => /from\s+'[^']*(CodeEditor|XTerm)'/.test(source))
      .map(([path]) => path);
    expect(offenders).toEqual([]);
  });
});
