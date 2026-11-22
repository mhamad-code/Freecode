import { useEffect, useRef } from 'react';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import { attachShell } from '../runtime/terminal';

/**
 * A real xterm.js instance. With `shell` it is wired to the WebContainer's
 * `jsh` process, so commands really run. Without a runtime (no cross-origin
 * isolation) it stays an honest renderer: the command is echoed and answered
 * with `noRuntime` instead of fake output.
 */

const token = (name: string, fallbackVar?: string): string | undefined => {
  const style = getComputedStyle(document.documentElement);
  const value = style.getPropertyValue(name).trim();
  if (value) return value;
  if (fallbackVar) return style.getPropertyValue(fallbackVar).trim() || undefined;
  return undefined;
};

function readTheme() {
  const fontFamily = token('--font-mono');
  return {
    fontFamily,
    theme: {
      background: token('--panel'),
      foreground: token('--text'),
      cursor: token('--accent'),
      cursorAccent: token('--panel'),
      selectionBackground: token('--elevated'),
      black: token('--bg'),
      brightBlack: token('--muted'),
      white: token('--text'),
      brightWhite: token('--text'),
      green: token('--success'),
      brightGreen: token('--success'),
      yellow: token('--warning'),
      brightYellow: token('--warning'),
      red: token('--danger'),
      brightRed: token('--danger'),
      blue: token('--accent'),
      brightBlue: token('--accent'),
    },
  };
}

export interface XTermProps {
  prompt: string;
  /** Printed when no shell can be attached. */
  banner: string;
  /** Answer to every entered command when no shell can be attached. */
  noRuntime: string;
  /** Attach the container shell instead of the local echo. */
  shell: boolean;
  /** Printed while the container shell starts. */
  starting: string;
  /** Printed if the container shell cannot start. */
  failed: string;
  /** Project files mounted into the container before the shell starts. */
  files?: Record<string, string>;
}

export default function XTerm({ prompt, banner, noRuntime, shell, starting, failed, files }: XTermProps) {
  const host = useRef<HTMLDivElement>(null);
  const answer = useRef(noRuntime);
  answer.current = noRuntime;
  const filesRef = useRef(files ?? {});
  filesRef.current = files ?? {};

  useEffect(() => {
    if (!host.current) return;
    const { fontFamily, theme } = readTheme();
    const term = new Terminal({
      convertEol: true,
      cursorBlink: true,
      fontSize: 13,
      lineHeight: 1.35,
      scrollback: 2000,
      fontFamily,
      theme,
      allowProposedApi: true,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(host.current);
    fit.fit();

    let disposed = false;
    let detach: (() => void) | undefined;

    if (shell) {
      term.writeln(starting);
      attachShell(term, filesRef.current)
        .then((cleanup) => {
          if (disposed) {
            cleanup();
            return;
          }
          detach = cleanup;
        })
        .catch((error: unknown) => {
          if (disposed) return;
          term.writeln(failed);
          term.writeln(String(error instanceof Error ? error.message : error));
        });
    } else {
      term.writeln(banner);
      term.write(prompt);
      let buffer = '';
      const data = term.onData((input) => {
        for (const ch of input) {
          if (ch === '\r' || ch === '\n') {
            term.write('\r\n');
            const command = buffer.trim();
            buffer = '';
            if (command) term.writeln(answer.current);
            term.write(prompt);
          } else if (ch === '\u007f') {
            if (buffer) {
              buffer = buffer.slice(0, -1);
              term.write('\b \b');
            }
          } else if (ch === '\u0003') {
            buffer = '';
            term.write('^C\r\n');
            term.write(prompt);
          } else if (ch === '\u000c') {
            term.clear();
            term.write(prompt);
          } else if (ch >= ' ') {
            buffer += ch;
            term.write(ch);
          }
        }
      });
      detach = () => data.dispose();
    }

    const observer = new ResizeObserver(() => {
      try {
        fit.fit();
      } catch {
        // the host can be detached while a tab closes; the next fit recovers
      }
    });
    observer.observe(host.current);

    // Theme switching rewrites the CSS variables; follow them live.
    const repaint = () => {
      const next = readTheme();
      term.options.theme = next.theme;
      if (next.fontFamily) term.options.fontFamily = next.fontFamily;
    };
    const mutations = new MutationObserver(repaint);
    mutations.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'data-theme', 'class'] });

    return () => {
      disposed = true;
      observer.disconnect();
      mutations.disconnect();
      detach?.();
      term.dispose();
    };
  }, [banner, prompt, shell, starting, failed]);

  return <div ref={host} className="h-full min-h-0 w-full px-2 py-1.5" style={{ background: 'var(--panel)' }} />;
}
