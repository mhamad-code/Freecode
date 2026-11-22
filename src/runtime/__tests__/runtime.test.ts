import { describe, expect, it } from 'vitest';
import { previewServerSource, PREVIEW_PORT } from '../previewServer';
import { runtimeSnapshot, resetRuntimeState, setRuntime } from '../state';
import { treeFromFiles } from '../workspace';

const files = import.meta.glob('/src/**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const isTest = (path: string) => /\.test\.tsx?$/.test(path) || path.includes('/__tests__/');

describe('workspace tree', () => {
  it('nests files by path and keeps contents', () => {
    const tree = treeFromFiles({
      'index.html': '<h1>hi</h1>',
      'src/main.ts': 'console.log(1)',
      'src/lib/util.ts': 'export {}',
    });
    expect(Object.keys(tree).sort()).toEqual(['index.html', 'src']);
    expect(tree['index.html']).toEqual({ file: { contents: '<h1>hi</h1>' } });
    const src = tree.src as { directory: Record<string, unknown> };
    expect(Object.keys(src.directory).sort()).toEqual(['lib', 'main.ts']);
    const lib = src.directory.lib as { directory: Record<string, unknown> };
    expect(lib.directory['util.ts']).toEqual({ file: { contents: 'export {}' } });
  });

  it('ignores empty paths and reuses an existing directory node', () => {
    const tree = treeFromFiles({ '': 'x', 'a/b': '1', 'a/c': '2' });
    expect(Object.keys(tree)).toEqual(['a']);
    const a = tree.a as { directory: Record<string, unknown> };
    expect(Object.keys(a.directory).sort()).toEqual(['b', 'c']);
  });
});

describe('preview server source', () => {
  it('is valid JavaScript that listens on the requested port', () => {
    const source = previewServerSource(4321);
    expect(() => new Function(source)).not.toThrow();
    expect(source).toContain('server.listen(4321');
  });

  it('defaults to the preview port and serves files without caching', () => {
    const source = previewServerSource();
    expect(PREVIEW_PORT).toBe(5173);
    expect(source).toContain('server.listen(5173');
    expect(source).toContain('no-store');
    expect(source).toContain("'.html': 'text/html; charset=utf-8'");
    // Path traversal is rejected before touching the disk.
    expect(source).toContain('startsWith(ROOT + path.sep)');
  });

  it('falls back to a listing instead of inventing an app', () => {
    const source = previewServerSource();
    expect(source).toContain('function listing(');
    expect(source).toContain('index.html</code>');
  });
});

describe('runtime state', () => {
  it('merges patches and resets to idle', () => {
    resetRuntimeState();
    expect(runtimeSnapshot().phase).toBe('idle');
    setRuntime({ phase: 'booting' });
    setRuntime({ files: 3 });
    expect(runtimeSnapshot()).toMatchObject({ phase: 'booting', files: 3 });
    resetRuntimeState();
    expect(runtimeSnapshot()).toMatchObject({ phase: 'idle', files: 0, previewUrl: null });
  });
});

describe('lazy runtime guard', () => {
  it('scans the app sources', () => {
    expect(Object.keys(files).length).toBeGreaterThan(20);
    expect(files['/src/runtime/webcontainer.ts']).toBeTruthy();
  });

  it('never statically imports the WebContainer client', () => {
    const offenders: string[] = [];
    for (const [path, text] of Object.entries(files)) {
      if (isTest(path)) continue;
      if (/^\s*import\s+(?!type\b)[^;]*from\s+['"]@webcontainer\/api['"]/m.test(text)) offenders.push(path);
    }
    expect(offenders).toEqual([]);
  });

  it('loads the client through a dynamic import inside the runtime module', () => {
    const source = files['/src/runtime/webcontainer.ts'];
    expect(source).toContain("await import('@webcontainer/api')");
  });

  it('keeps the terminal and preview panels on the runtime facade', () => {
    const pane = files['/src/components/ToolPane.tsx'];
    expect(pane).toContain("from '../runtime'");
    expect(pane).not.toContain("from '@webcontainer/api'");
  });
});
