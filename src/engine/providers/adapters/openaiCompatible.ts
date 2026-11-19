import { ProviderError } from '../errors';
import { ThinkSplitter } from '../think';
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

/** Drops schema keywords some gateways reject; keeps types strict. */
export function sanitizeSchema(schema: unknown, strict: boolean): unknown {
  if (Array.isArray(schema)) return schema.map((s) => sanitizeSchema(s, strict));
  const rec = asRecord(schema);
  if (!rec) return schema;
  const out: Rec = {};
  for (const [key, value] of Object.entries(rec)) {
    if (key === '$schema') continue;
    if (strict && key === 'additionalProperties') continue;
    out[key] = sanitizeSchema(value, strict);
  }
  return out;
}

function systemText(messages: ChatMessage[]): string {
  return messages
    .filter((m) => m.role === 'system')
    .map((m) => m.text?.trim() ?? '')
    .filter(Boolean)
    .join('\n\n');
}

function toOpenAIMessage(m: ChatMessage): Rec {
  if (m.role === 'assistant') {
    if (m.toolCalls?.length) {
      return {
        role: 'assistant',
        content: m.text ?? null,
        tool_calls: m.toolCalls.map((tc) => ({
          id: tc.id,
          type: 'function',
          function: { name: tc.name, arguments: tc.arguments },
        })),
      };
    }
    return { role: 'assistant', content: m.text ?? '' };
  }
  if (m.role === 'tool') {
    return { role: 'tool', tool_call_id: m.toolCallId ?? '', content: m.text ?? '' };
  }
  if (m.images?.length) {
    return {
      role: 'user',
      content: [
        ...(m.text ? [{ type: 'text', text: m.text }] : []),
        ...m.images.map((url) => ({ type: 'image_url', image_url: { url } })),
      ],
    };
  }
  return { role: 'user', content: m.text ?? '' };
}

export function toOpenAIRequest(
  provider: ProviderConfig,
  req: ChatRequest,
): Rec {
  const messages: Rec[] = [];
  const system = systemText(req.messages);
  if (system) messages.push({ role: 'system', content: system });
  for (const m of req.messages) {
    if (m.role === 'system') continue;
    messages.push(toOpenAIMessage(m));
  }

  const body: Rec = { model: req.model, messages, stream: true };
  if (req.tools?.length) {
    body.tools = req.tools.map((t) => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: sanitizeSchema(t.parameters, provider.quirks.strictTemplates),
      },
    }));
    body.tool_choice = req.toolChoice ?? 'auto';
    if (provider.quirks.supportsParallelTools) body.parallel_tool_calls = true;
  }
  if (provider.quirks.supportsStreamUsage) body.stream_options = { include_usage: true };
  if (req.reasoningEffort) body.reasoning_effort = req.reasoningEffort;
  if (req.temperature !== undefined) body.temperature = req.temperature;
  if (req.maxTokens !== undefined) body.max_tokens = req.maxTokens;

  const extra = provider.quirks.extraBody;
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (k === 'model' || k === 'messages' || k === 'stream') continue;
      body[k] = v;
    }
  }
  return body;
}

function parseUsage(value: unknown): ModelResult['usage'] | undefined {
  const rec = asRecord(value);
  if (!rec) return undefined;
  const input =
    typeof rec.prompt_tokens === 'number'
      ? rec.prompt_tokens
      : typeof rec.input_tokens === 'number'
        ? rec.input_tokens
        : 0;
  const output =
    typeof rec.completion_tokens === 'number'
      ? rec.completion_tokens
      : typeof rec.output_tokens === 'number'
        ? rec.output_tokens
        : 0;
  if (!input && !output) return undefined;
  const details = asRecord(rec.prompt_tokens_details);
  const cacheTok =
    typeof details?.cached_tokens === 'number' ? details.cached_tokens : undefined;
  return { inTok: input, outTok: output, cacheTok };
}

function streamError(value: unknown): ProviderError {
  const rec = asRecord(value);
  const message =
    (typeof rec?.message === 'string' && rec.message) ||
    (typeof value === 'string' && value) ||
    'The provider reported a stream error';
  return new ProviderError('stream', message, { providerMessage: message });
}

/**
 * Consumes the `data:` payloads of an OpenAI-compatible stream.
 * `@param data` yields raw payload strings, e.g. `{"choices":…}` or `[DONE]`.
 */
export async function parseOpenAIStream(
  data: AsyncIterable<string>,
  onDelta?: (delta: Delta) => void,
): Promise<ModelResult> {
  const result = emptyResult();
  const splitter = new ThinkSplitter();
  const tools = new Map<number, ToolCall>();
  let sawDone = false;
  let sawFinish = false;
  let malformed = 0;

  for await (const payload of data) {
    if (payload === '[DONE]') {
      sawDone = true;
      break;
    }
    if (!payload.trim()) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(payload);
    } catch {
      malformed += 1;
      continue;
    }
    const rec = asRecord(parsed);
    if (!rec) continue;
    if (rec.error) throw streamError(rec.error);

    const choices = rec.choices;
    if (Array.isArray(choices) && choices.length) {
      const choice = asRecord(choices[0]);
      if (choice) {
        if (choice.error) throw streamError(choice.error);
        const delta = asRecord(choice.delta);
        if (delta) {
          const reasoning =
            typeof delta.reasoning_content === 'string'
              ? delta.reasoning_content
              : typeof delta.reasoning === 'string'
                ? delta.reasoning
                : undefined;
          if (reasoning) {
            result.thinking += reasoning;
            onDelta?.({ type: 'thinking', text: reasoning });
          }
          if (typeof delta.content === 'string' && delta.content) {
            const split = splitter.push(delta.content);
            if (split.text) {
              result.text += split.text;
              onDelta?.({ type: 'text', text: split.text });
            }
            if (split.thinking) {
              result.thinking += split.thinking;
              onDelta?.({ type: 'thinking', text: split.thinking });
            }
          }
          if (Array.isArray(delta.tool_calls)) {
            delta.tool_calls.forEach((raw, i) => {
              const t = asRecord(raw);
              if (!t) return;
              const index = typeof t.index === 'number' ? t.index : i;
              const existing = tools.get(index) ?? { id: '', name: '', arguments: '' };
              if (typeof t.id === 'string' && t.id) existing.id = t.id;
              const fn = asRecord(t.function);
              if (fn) {
                if (typeof fn.name === 'string' && fn.name) existing.name = fn.name;
                const args = fn.arguments;
                if (typeof args === 'string') existing.arguments += args;
                else if (args && typeof args === 'object')
                  existing.arguments = JSON.stringify(args);
              }
              tools.set(index, existing);
            });
          }
        }
        if (typeof choice.finish_reason === 'string' && choice.finish_reason) {
          result.finishReason = choice.finish_reason;
          sawFinish = true;
          if (choice.finish_reason === 'error') throw streamError('finish_reason: error');
        }
      }
    }
    const usage = parseUsage(rec.usage);
    if (usage) result.usage = usage;
  }

  const tail = splitter.flush();
  if (tail.text) {
    result.text += tail.text;
    onDelta?.({ type: 'text', text: tail.text });
  }
  if (tail.thinking) {
    result.thinking += tail.thinking;
    onDelta?.({ type: 'thinking', text: tail.thinking });
  }

  result.toolCalls = [...tools.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, value], i) => ({ ...value, id: value.id || `call_${i}` }));

  if (!sawDone && !sawFinish) result.endedEarly = true;
  if (malformed > 0 && !result.text && !result.toolCalls.length && !sawFinish) {
    result.endedEarly = true;
  }
  return result;
}
