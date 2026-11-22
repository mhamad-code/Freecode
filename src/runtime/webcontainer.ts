import type { WebContainer } from '@webcontainer/api';

/**
 * WebContainers need a cross-origin isolated page (COOP/COEP) and
 * SharedArrayBuffer. The package itself is loaded on demand so the app entry
 * chunk never carries the runtime client.
 */

export type RuntimeSupport = 'full' | 'no-isolation' | 'no-sab';

export function runtimeSupport(): RuntimeSupport {
  if (typeof SharedArrayBuffer === 'undefined') return 'no-sab';
  const isolated = typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated;
  return isolated ? 'full' : 'no-isolation';
}

let instance: WebContainer | null = null;
let booting: Promise<WebContainer> | null = null;

/** The booted container, if any. */
export function peekRuntime(): WebContainer | null {
  return instance;
}

export function bootRuntime(): Promise<WebContainer> {
  if (instance) return Promise.resolve(instance);
  if (booting) return booting;
  booting = (async () => {
    if (runtimeSupport() !== 'full') {
      throw new Error('The page is not cross-origin isolated, so the runtime cannot boot.');
    }
    const { WebContainer } = await import('@webcontainer/api');
    instance = await WebContainer.boot({ coep: 'credentialless', workdirName: 'project' });
    return instance;
  })();
  booting.catch(() => {
    booting = null;
  });
  return booting;
}

export function teardownRuntime(): void {
  instance?.teardown();
  instance = null;
  booting = null;
}
