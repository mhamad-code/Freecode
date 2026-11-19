import type { SSEMessage } from '../sse';
import { ProviderError } from '../errors';
import {
  emptyResult,
  type ChatMessage,
  type ChatRequest,
  type Delta,
  type ModelResult,
  type ProviderConfig,
  type ToolCall,
} from '../types';

type Rec = Record<string, unknown>;

function asRecord(value: unknown): Rec | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Rec)
    : null;
}

type Block = Record<string, unknown>;

function blocksFor(m: ChatMessage): { role: 'user' | 'assistant'; blocks: Block[] } | null {
  if (m.role === 'system') return null;
  if (m.role === 'tool') {
    return {
      role: 'user',
      blocks: [
        {
          type: 'tool_result',
          tool_use_id: m.toolCallId ?? '',
          content: m.text ?? '',
        },
      ],
    };
  }
  if (m.role === 'assistant') {
    const blocks: Block[] = [];
    if (m.text) blocks.push({ type: 'text', text: m.text });
    for (const tc of m.toolCalls ?? []) {
      let input: unknown = {};
      try {
        input = tc.arguments ? JSON.parse(tc.arguments) : {};
      } catch {
        input = {};
      }
      blocks.push({ type: 'tool_use', id: tc.id, name: tc.name, input });
    }
    return { role: 'assistant', blocks: blocks.length ? blocks : [{ type: 'text', text: '' }] };
  }
  const blocks: Block[] = [];
  if (m.text) blocks.push({ type: 'text', text: m.text });
  return { role: 'user', blocks: blocks.length ? blocks : [{ type: 'text', text: '' }] };
}

export function toAnthropicRequest(
  provider: ProviderConfig,
  req: ChatRequest,
): Rec {
  void provider;
  const system = req.messages
    .filter((m) => m.role === 'system')
    .map((m) => m.text?.trim() ?? '')
    .filter(Boolean)
    .join('\n\n');

  const messages: { role: 'user' | 'assistant'; content: Block[] }[] = [];
  for (const m of req.messages) {
    const mapped = blocksFor(m);
    if (!mapped) continue;
    const last = messages[messages.length - 1];
    if (last && last.role === mapped.role) last.content.push(...mapped.blocks);
    else messages.push({ role: mapped.role, content: mapped.blocks });
  }

  const budget =
    req.reasoningEffort === 'low'
      ? 2048
      : req.reasoningEffort === 'medium'
        ? 8192
        : req.reasoningEffort === 'high'
          ? 24576
          : 0;
  const maxTokens = Math.max(req.maxTokens ?? 4096, budget + 1024);

  const body: Rec = { model: req.model, messages, max_tokens: maxTokens, stream: true };
  if (system) body.system = system;
  if (req.tools?.length) {
    body.tools = req.tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters,
    }));
    if (req.toolChoice === 'none') body.tool_choice = { type: 'none' };
  }
  if (budget > 0) body.thinking = { type: 'enabled', budget_tokens: budget };
  if (req.temperature !== undefined) body.temperature = req.temperature;
  return body;
}

function parseAnthropicError(value: unknown): ProviderError {
  const rec = asRecord(value);
  const inner = asRecord(rec?.error);
  const message =
    (typeof inner?.message === 'string' && inner.message) ||
    (typeof rec?.message === 'string' && rec.message) ||
    'The provider reported a stream error';
  return new ProviderError('stream', message, { providerMessage: message });
}

/** Consumes Anthropic's typed SSE events (content_block_delta and friends). */
export async function parseAnthropicStream(
  events: AsyncIterable<SSEMessage>,
  onDelta?: (delta: Delta) => void,
): Promise<ModelResult> {
  const result = emptyResult();
  const tools = new Map<number, ToolCall>();
  let sawStop = false;

  for await (const evt of events) {
    if (!evt.data || evt.data === '[DONE]') continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(evt.data);
    } catch {
      continue;
    }
    const rec = asRecord(parsed);
    if (!rec) continue;
    const type = evt.event ?? (typeof rec.type === 'string' ? rec.type : '');
    if (type === 'error') throw parseAnthropicError(rec.error ?? rec);

    if (type === 'message_start') {
      const message = asRecord(rec.message);
      const usage = asRecord(message?.usage);
      if (usage) {
        const cache =
          (typeof usage.cache_read_input_tokens === 'number'
            ? usage.cache_read_input_tokens
            : 0) +
          (typeof usage.cache_creation_input_tokens === 'number'
            ? usage.cache_creation_input_tokens
            : 0);
        result.usage = {
          inTok: typeof usage.input_tokens === 'number' ? usage.input_tokens : 0,
          outTok: 0,
          cacheTok: cache || undefined,
        };
      }
    } else if (type === 'content_block_start') {
      const index = typeof rec.index === 'number' ? rec.index : 0;
      const block = asRecord(rec.content_block);
      if (block?.type === 'tool_use') {
        tools.set(index, {
          id: typeof block.id === 'string' ? block.id : `tool_${index}`,
          name: typeof block.name === 'string' ? block.name : '',
          arguments: '',
        });
      }
    } else if (type === 'content_block_delta') {
      const index = typeof rec.index === 'number' ? rec.index : 0;
      const delta = asRecord(rec.delta);
      if (!delta) continue;
      if (delta.type === 'text_delta' && typeof delta.text === 'string') {
        result.text += delta.text;
        onDelta?.({ type: 'text', text: delta.text });
      } else if (delta.type === 'thinking_delta' && typeof delta.thinking === 'string') {
        result.thinking += delta.thinking;
        onDelta?.({ type: 'thinking', text: delta.thinking });
      } else if (delta.type === 'input_json_delta' && typeof delta.partial_json === 'string') {
        const entry = tools.get(index);
        if (entry) entry.arguments += delta.partial_json;
      }
    } else if (type === 'message_delta') {
      const delta = asRecord(rec.delta);
      if (typeof delta?.stop_reason === 'string' && delta.stop_reason) {
        result.finishReason = delta.stop_reason;
      }
      const usage = asRecord(rec.usage);
      if (usage && typeof usage.output_tokens === 'number') {
        result.usage = {
          inTok: result.usage?.inTok ?? 0,
          outTok: usage.output_tokens,
          cacheTok: result.usage?.cacheTok,
        };
      }
    } else if (type === 'message_stop') {
      sawStop = true;
    }
  }

  result.toolCalls = [...tools.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, value], i) => ({ ...value, id: value.id || `tool_${i}` }));

  if (!sawStop && !result.finishReason) result.endedEarly = true;
  return result;
}
