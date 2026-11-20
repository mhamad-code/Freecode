import type { ChatMessage, ChatRequest, ProviderConfig } from './types';

export type LiteSetting = 'auto' | 'on' | 'off';

/**
 * Lite mode exists for keyless free services whose per-minute token allowance
 * cannot fit the full agent payload (long system prompt + tool schemas). It
 * sends one short system prompt, no tools and a small output budget.
 */
export const LITE_SYSTEM_PROMPT =
  'You are Freecode in Lite mode. Reply in the user\'s language, be brief and concrete. ' +
  'No tools are available: describe the change instead of making it, and never claim a command ran.';

export const LITE_MAX_TOKENS = 1024;
export const LITE_HISTORY_MESSAGES = 8;
export const LITE_MAX_MESSAGE_CHARS = 6000;

/** Auto enables Lite for a free service with a tight published limit or a recent 429. */
export function shouldUseLite(
  setting: LiteSetting,
  provider: Pick<ProviderConfig, 'kind' | 'limits' | 'lastDiagnostic'>,
): boolean {
  if (setting === 'on') return true;
  if (setting === 'off') return false;
  if (provider.kind !== 'builtin-free') return false;
  const perMinute = provider.limits?.perMinute ?? Number.POSITIVE_INFINITY;
  const perHour = provider.limits?.perHour ?? Number.POSITIVE_INFINITY;
  if (perMinute <= 30 || perHour <= 60) return true;
  const last = provider.lastDiagnostic?.kind;
  return last === 'rate' || last === 'quota';
}

function trimText(text: string | undefined): string | undefined {
  if (!text) return undefined;
  return text.length > LITE_MAX_MESSAGE_CHARS ? text.slice(0, LITE_MAX_MESSAGE_CHARS) : text;
}

/** Keeps a valid tail: no orphan tool results or tool calls without a request. */
export function trimHistory(messages: ChatMessage[], limit = LITE_HISTORY_MESSAGES): ChatMessage[] {
  const chat = messages.filter((m) => m.role !== 'system').slice(-limit);
  while (chat.length && chat[0].role === 'tool') chat.shift();
  return chat.map((m) => {
    const text = trimText(m.text);
    if (m.images?.length) {
      return { role: m.role, text, toolCalls: m.toolCalls, toolCallId: m.toolCallId };
    }
    return text === m.text ? m : { ...m, text };
  });
}

/** The full request minus everything Lite mode drops. The input is not mutated. */
export function toLiteRequest(req: ChatRequest): ChatRequest {
  const messages: ChatMessage[] = [
    { role: 'system', text: LITE_SYSTEM_PROMPT },
    ...trimHistory(req.messages),
  ];
  return {
    model: req.model,
    messages,
    maxTokens: Math.min(req.maxTokens ?? LITE_MAX_TOKENS, LITE_MAX_TOKENS),
    signal: req.signal,
  };
}
