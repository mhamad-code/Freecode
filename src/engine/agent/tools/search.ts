export interface GrepMatch {
  path: string;
  line: number;
  column: number;
  text: string;
}

export interface GrepOptions {
  ignoreCase?: boolean;
  glob?: string;
  maxResults?: number;
}

export function globToRegExp(glob: string): RegExp {
  let out = '';
  for (let i = 0; i < glob.length; i++) {
    const ch = glob[i];
    if (ch === '*') {
      if (glob[i + 1] === '*') {
        out += '.*';
        i += 1;
        if (glob[i + 1] === '/') i += 1;
      } else out += '[^/]*';
    } else if (ch === '?') out += '[^/]';
    else out += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${out}$`);
}

export function grepFiles(
  files: Record<string, string>,
  pattern: string,
  opts: GrepOptions = {},
): GrepMatch[] {
  let re: RegExp;
  try {
    re = new RegExp(pattern, opts.ignoreCase ? 'i' : '');
  } catch {
    // Treat an invalid pattern as a literal string.
    re = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), opts.ignoreCase ? 'i' : '');
  }
  const glob = opts.glob ? globToRegExp(opts.glob) : null;
  const max = opts.maxResults ?? 200;
  const matches: GrepMatch[] = [];

  for (const path of Object.keys(files).sort()) {
    if (glob && !glob.test(path)) continue;
    const lines = files[path].split('\n');
    for (let i = 0; i < lines.length; i++) {
      const found = lines[i].match(re);
      if (found && found.index !== undefined) {
        matches.push({ path, line: i + 1, column: found.index + 1, text: lines[i] });
        if (matches.length >= max) return matches;
      }
    }
  }
  return matches;
}
