import { startPreview } from './preview';
import { setRuntime } from './state';
import { bootRuntime, peekRuntime, runtimeSupport } from './webcontainer';
import { mountWorkspace } from './workspace';

export { useRuntime, runtimeSnapshot, resetRuntimeState, type RuntimeSnapshot } from './state';
export { runtimeSupport, peekRuntime, teardownRuntime } from './webcontainer';
export { attachShell } from './terminal';
export { startPreview, stopPreview } from './preview';
export { syncFile, mountWorkspace } from './workspace';
export type { RuntimeSupport } from './webcontainer';

const message = (error: unknown): string =>
  error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown runtime error';

/**
 * Boots the WebContainer (once) and mounts the given project files into it.
 * Cross-origin isolation is re-checked first so the caller gets a clear error.
 */
export async function ensureRuntime(files: Record<string, string>): Promise<void> {
  if (runtimeSupport() !== 'full') {
    setRuntime({
      phase: 'unsupported',
      error: 'This page is not cross-origin isolated, so the sandboxed runtime cannot boot.',
    });
    throw new Error('The sandboxed runtime needs cross-origin isolation.');
  }
  if (peekRuntime()) return;
  setRuntime({ phase: 'booting', error: null });
  try {
    await bootRuntime();
    const count = await mountWorkspace(files);
    setRuntime({ phase: 'ready', files: count, error: null });
  } catch (error) {
    setRuntime({ phase: 'error', error: message(error) });
    throw error;
  }
}

/** Convenience for the preview button: runtime + mounted files + server. */
export async function startPreviewWithRuntime(files: Record<string, string>): Promise<string> {
  await ensureRuntime(files);
  return startPreview();
}
