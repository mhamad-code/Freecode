import { describe, expect, it } from 'vitest';
import { parseSSE, streamFromChunks } from '../sse';

async function collect(chunks: string[]) {
  const out: string[] = [];
  for await (const msg of parseSSE(streamFromChunks(chunks))) out.push(msg.data);
  return out;
}

describe('parseSSE', () => {
  it('parses events split across chunks', async () => {
    const data = await collect(['data: {"a":', '1}\n\n', 'data: {"b":2}\n\n']);
    expect(data).toEqual(['{"a":1}', '{"b":2}']);
  });

  it('joins multi-line data fields and ignores comments', async () => {
    const data = await collect([': keep-alive\n', 'data: one\ndata: two\n\n']);
    expect(data).toEqual(['one\ntwo']);
  });

  it('handles multi-byte characters split across reads', async () => {
    const bytes = new TextEncoder().encode('data: مرحبا\n\n');
    const first = bytes.slice(0, 9);
    const second = bytes.slice(9);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(first);
        controller.enqueue(second);
        controller.close();
      },
    });
    const out: string[] = [];
    for await (const msg of parseSSE(stream)) out.push(msg.data);
    expect(out).toEqual(['مرحبا']);
  });

  it('keeps a final event without a trailing blank line', async () => {
    const data = await collect(['data: [DONE]']);
    expect(data).toEqual(['[DONE]']);
  });
});
