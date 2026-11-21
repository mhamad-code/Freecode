import { useEffect, useRef } from 'react';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';

/**
 * The terminal is a real xterm.js instance, but there is still no shell behind
 * it: a typed command is echoed and answered with the honest "no runtime" line
 * instead of fake output. The Pyodide/WebContainer shell arrives with the
 * runtime phase.
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
  /** Printed once when the terminal opens. */
  banner: string;
  /** Answer to every entered command, because nothing executes yet. */
  noRuntime: string;
}

export default function XTerm({ prompt, banner, noRuntime }: XTermProps) {
  const host = useRef<HTMLDivElement>(null);
  const answer = useRef(noRuntime);
  answer.current = noRuntime;

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
      observer.disconnect();
      mutations.disconnect();
      data.dispose();
      term.dispose();
    };
  }, [banner, prompt]);

  return <div ref={host} className="h-full min-h-0 w-full px-2 py-1.5" style={{ background: 'var(--panel)' }} />;
}
