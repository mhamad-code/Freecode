export interface EditResult {
  content: string;
  matches: number;
  fuzzy: boolean;
}

export class EditError extends Error {
  constructor(
    message: string,
    readonly matches: number,
  ) {
    super(message);
    this.name = 'EditError';
  }
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = haystack.indexOf(needle, index + needle.length);
  }
  return count;
}

function splitLines(text: string): string[] {
  return text.replace(/\r\n/g, '\n').split('\n');
}

function indentOf(line: string): string {
  return line.match(/^\s*/)?.[0] ?? '';
}

function reindent(newStr: string, targetIndent: string, sourceIndent: string): string {
  return splitLines(newStr)
    .map((line) => {
      if (!line.trim()) return line;
      if (sourceIndent && line.startsWith(sourceIndent)) {
        return targetIndent + line.slice(sourceIndent.length);
      }
      return targetIndent + line;
    })
    .join('\n');
}

/**
 * Replaces `oldStr` in `content`. Requires a unique match unless `replaceAll`
 * is set. Falls back to a whitespace-normalized, indentation-rebased match.
 */
export function applyEdit(
  content: string,
  oldStr: string,
  newStr: string,
  replaceAll = false,
): EditResult {
  if (!oldStr) throw new EditError('old_str is empty', 0);
  const matches = countOccurrences(content, oldStr);
  if (matches === 1) {
    return { content: content.replace(oldStr, newStr), matches, fuzzy: false };
  }
  if (matches > 1) {
    if (!replaceAll) {
      throw new EditError(
        `Found ${matches} matches for old_str; add surrounding context to make it unique`,
        matches,
      );
    }
    return { content: content.split(oldStr).join(newStr), matches, fuzzy: false };
  }

  // Fuzzy: match a contiguous block of lines ignoring indentation and trailing space.
  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  const trailing = content.endsWith('\n');
  const lines = splitLines(content);
  const needle = splitLines(oldStr).map((l) => l.trim());
  const wanted = needle.join('\n');
  if (!wanted) throw new EditError('old_str is empty after normalization', 0);

  const hits: number[] = [];
  for (let start = 0; start + needle.length - 1 < lines.length; start++) {
    const window = lines.slice(start, start + needle.length);
    if (window.map((l) => l.trim()).join('\n') === wanted) {
      hits.push(start);
      if (hits.length > 1 && !replaceAll) break;
    }
  }
  if (hits.length === 0) throw new EditError('No match found for old_str', 0);
  if (hits.length > 1 && !replaceAll) {
    throw new EditError(
      `Found ${hits.length} normalized matches; add surrounding context`,
      hits.length,
    );
  }

  const replacements = replaceAll ? hits : [hits[0]];
  const output = [...lines];
  for (let i = replacements.length - 1; i >= 0; i--) {
    const start = replacements[i];
    const targetIndent = indentOf(lines[start]);
    const sourceIndent = indentOf(splitLines(oldStr)[0]);
    const replacement = splitLines(reindent(newStr, targetIndent, sourceIndent));
    output.splice(start, needle.length, ...replacement);
  }

  let joined = output.join(eol);
  if (trailing && !joined.endsWith(eol)) joined += eol;
  return { content: joined, matches: replacements.length, fuzzy: true };
}

/** Tracks which files the model has read in this run and their hashes. */
export class WriteGuard {
  private readonly hashes = new Map<string, string>();
  private readonly drafts = new Set<string>();

  markRead(path: string, hash: string): void {
    this.hashes.set(path, hash);
  }

  hashOf(path: string): string | undefined {
    return this.hashes.get(path);
  }

  markDraft(path: string): void {
    this.drafts.add(path);
  }

  clearDraft(path: string): void {
    this.drafts.delete(path);
  }

  check(path: string, currentHash: string | undefined): { ok: true } | { ok: false; reason: string } {
    if (this.drafts.has(path)) {
      return { ok: false, reason: 'The user has an unsaved draft of this file in the editor.' };
    }
    if (currentHash === undefined) return { ok: true };
    const known = this.hashes.get(path);
    if (known === undefined) {
      return { ok: false, reason: 'Read this file before writing to it.' };
    }
    if (known !== currentHash) {
      return { ok: false, reason: 'File changed since you read it — read it again.' };
    }
    return { ok: true };
  }
}
