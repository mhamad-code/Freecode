const OPEN = '\u003cthinking\u003e';
const CLOSE = '\u003c/thinking\u003e';

function partialTagLength(buf: string, tag: string): number {
  for (let len = Math.min(tag.length - 1, buf.length); len > 0; len--) {
    if (buf.endsWith(tag.slice(0, len))) return len;
  }
  return 0;
}

/**
 * Separates inline thinking blocks from visible text, holding back partial tag
 * prefixes so a tag split across stream chunks is still detected.
 */
export class ThinkSplitter {
  private inThink = false;
  private pending = '';

  push(chunk: string): { text: string; thinking: string } {
    this.pending += chunk;
    let text = '';
    let thinking = '';
    for (;;) {
      const tag = this.inThink ? CLOSE : OPEN;
      const at = this.pending.indexOf(tag);
      if (at === -1) {
        const hold = partialTagLength(this.pending, tag);
        const safe = this.pending.slice(0, this.pending.length - hold);
        if (this.inThink) thinking += safe;
        else text += safe;
        this.pending = this.pending.slice(this.pending.length - hold);
        break;
      }
      const before = this.pending.slice(0, at);
      if (this.inThink) thinking += before;
      else text += before;
      this.pending = this.pending.slice(at + tag.length);
      this.inThink = !this.inThink;
    }
    return { text, thinking };
  }

  flush(): { text: string; thinking: string } {
    const rest = this.pending;
    this.pending = '';
    return this.inThink ? { text: '', thinking: rest } : { text: rest, thinking: '' };
  }
}
