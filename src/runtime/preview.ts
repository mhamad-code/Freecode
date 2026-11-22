import type { WebContainerProcess } from '@webcontainer/api';
import { PREVIEW_PORT, PREVIEW_SCRIPT, previewServerSource } from './previewServer';
import { setRuntime } from './state';
import { peekRuntime } from './webcontainer';

let serverProcess: WebContainerProcess | null = null;

const message = (error: unknown): string =>
  error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown runtime error';

function waitForServer(container: NonNullable<ReturnType<typeof peekRuntime>>): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      off();
      reject(new Error(`The preview server did not report port ${PREVIEW_PORT} in time.`));
    }, 20_000);
    const off = container.on('server-ready', (port, url) => {
      if (port !== PREVIEW_PORT) return;
      window.clearTimeout(timer);
      off();
      resolve(url);
    });
  });
}

/** Starts (or restarts) the static preview server inside the container. */
export async function startPreview(): Promise<string> {
  const container = peekRuntime();
  if (!container) throw new Error('The runtime is not booted yet.');
  setRuntime({ previewPhase: 'starting', previewError: null });
  try {
    await container.fs.mkdir('.freecode', { recursive: true }).catch(() => undefined);
    await container.fs.writeFile(PREVIEW_SCRIPT, previewServerSource());
    if (serverProcess) serverProcess.kill();
    serverProcess = null;
    const ready = waitForServer(container);
    const process = await container.spawn('node', [PREVIEW_SCRIPT]);
    serverProcess = process;
    void process.exit.then((code) => {
      if (serverProcess !== process) return;
      serverProcess = null;
      if (code !== 0) {
        setRuntime({ previewPhase: 'error', previewUrl: null, previewError: `The preview server exited with code ${code}.` });
      }
    });
    const url = await ready;
    setRuntime({ previewPhase: 'running', previewUrl: url, previewError: null });
    return url;
  } catch (error) {
    setRuntime({ previewPhase: 'error', previewUrl: null, previewError: message(error) });
    throw error;
  }
}

export function stopPreview(): void {
  serverProcess?.kill();
  serverProcess = null;
  setRuntime({ previewPhase: 'idle', previewUrl: null, previewError: null });
}
