import type { Terminal } from '@xterm/xterm';
import { ensureRuntime } from './index';
import { peekRuntime } from './webcontainer';

/**
 * Wires an xterm.js surface to the container's `jsh` shell: terminal input goes
 * straight to the process, and the process output (stdout, stderr and prompt)
 * is written back to the terminal.
 */
export async function attachShell(
  term: Terminal,
  files: Record<string, string> = {},
): Promise<() => void> {
  // The shell must see the project the editor is showing, so boot mounts it.
  await ensureRuntime(files);
  const container = peekRuntime();
  if (!container) throw new Error('The sandboxed runtime did not start.');
  const process = await container.spawn('jsh', {
    terminal: { cols: term.cols, rows: term.rows },
    env: { TERM: 'xterm-256color' },
  });
  const writer = process.input.getWriter();
  void process.output
    .pipeTo(
      new WritableStream<string>({
        write(data) {
          term.write(data);
        },
      }),
    )
    .catch(() => undefined);

  const data = term.onData((chunk) => {
    void writer.write(chunk);
  });
  const resize = term.onResize(({ cols, rows }) => process.resize({ cols, rows }));
  void process.exit.then((code) => {
    term.writeln(`\r\n[process exited with code ${code}]`);
  });

  return () => {
    data.dispose();
    resize.dispose();
    process.kill();
  };
}
