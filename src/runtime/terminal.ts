import type { Terminal } from '@xterm/xterm';
import { bootRuntime } from './webcontainer';

/**
 * Wires an xterm.js surface to the container's `jsh` shell: terminal input goes
 * straight to the process, and the process output (stdout, stderr and prompt)
 * is written back to the terminal.
 */
export async function attachShell(term: Terminal): Promise<() => void> {
  const container = await bootRuntime();
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
