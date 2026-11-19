export interface SSEMessage {
  data: string;
  event?: string;
  id?: string;
}

/**
 * Parses a Server-Sent Events stream. Handles partial chunks, multi-byte
 * characters split across reads, comment lines, multi-line `data:` fields and
 * streams that end without a trailing blank line.
 */
export async function* parseSSE(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<SSEMessage> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let event: string | undefined;
  let id: string | undefined;
  let data: string[] = [];

  const flush = (): SSEMessage | null => {
    if (!data.length) {
      event = undefined;
      id = undefined;
      return null;
    }
    const msg: SSEMessage = { data: data.join('\n'), event, id };
    data = [];
    event = undefined;
    id = undefined;
    return msg;
  };

  const consumeLine = (line: string): SSEMessage | null => {
    if (line === '') return flush();
    if (line.startsWith(':')) return null;
    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1);
    if (field === 'data') data.push(value);
    else if (field === 'event') event = value;
    else if (field === 'id') id = value;
    return null;
  };

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf('\n')) !== -1) {
        let line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        if (line.endsWith('\r')) line = line.slice(0, -1);
        const msg = consumeLine(line);
        if (msg) yield msg;
      }
    }
    buf += decoder.decode();
    if (buf.length) {
      const line = buf.endsWith('\r') ? buf.slice(0, -1) : buf;
      const msg = consumeLine(line);
      if (msg) yield msg;
    }
    const last = flush();
    if (last) yield last;
  } finally {
    reader.releaseLock();
  }
}

/** Builds a ReadableStream from an array of string chunks (tests and fixtures). */
export function streamFromChunks(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c));
      controller.close();
    },
  });
}

/** Reads all SSE `data` payloads from a stream as plain strings. */
export async function* sseData(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<string> {
  for await (const msg of parseSSE(stream)) yield msg.data;
}
