import type { ChatMessage, ChatRequest, Delta, ModelResult, ToolSpec } from '../providers/types';
import { decide, type PermissionMode, type Risk } from './permissions';

export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  risk: Risk;
  run: (args: Record<string, unknown>) => Promise<string>;
}

export type AgentEvent =
  | { type: 'text'; text: string }
  | { type: 'thinking'; text: string }
  | { type: 'tool_start'; name: string; args: Record<string, unknown> }
  | { type: 'tool_end'; name: string; ok: boolean; result: string }
  | { type: 'notice'; text: string }
  | { type: 'banner'; text: string }
  | { type: 'final'; text: string }
  | { type: 'error'; message: string };

export type ModelFn = (
  req: ChatRequest,
  onDelta: (delta: Delta) => void,
) => Promise<ModelResult>;

export interface RunOptions {
  model: ModelFn;
  modelId: string;
  tools: AgentTool[];
  messages: ChatMessage[];
  maxSteps?: number;
  permissionMode: PermissionMode;
  allowedRules?: Set<string>;
  untrusted?: boolean;
  mode?: 'build' | 'plan';
  ask: (req: {
    tool: string;
    args: Record<string, unknown>;
    risk: Risk;
  }) => Promise<'allow' | 'deny'>;
  onEvent?: (event: AgentEvent) => void;
  signal?: AbortSignal;
}

export interface RunResult {
  messages: ChatMessage[];
  text: string;
  steps: number;
  stopped: boolean;
}

function parseArgs(raw: string): Record<string, unknown> {
  if (!raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export async function runAgent(opts: RunOptions): Promise<RunResult> {
  const emit = (event: AgentEvent) => opts.onEvent?.(event);
  const messages: ChatMessage[] = opts.messages.map((m) => ({ ...m }));
  const specs: ToolSpec[] = opts.tools.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }));
  const calls = new Map<string, number>();
  const maxSteps = opts.maxSteps ?? 80;
  let steps = 0;

  for (; steps < maxSteps; steps++) {
    if (opts.signal?.aborted) return { messages, text: '', steps, stopped: true };

    const result = await opts.model(
      {
        model: opts.modelId,
        messages,
        tools: specs,
        signal: opts.signal,
      },
      (delta) => emit(delta),
    );

    messages.push({
      role: 'assistant',
      text: result.text,
      toolCalls: result.toolCalls.length ? result.toolCalls : undefined,
    });

    if (result.endedEarly) emit({ type: 'notice', text: 'The stream ended early.' });

    if (!result.toolCalls.length) {
      emit({ type: 'final', text: result.text });
      return { messages, text: result.text, steps: steps + 1, stopped: false };
    }

    let repeated = false;
    for (const call of result.toolCalls) {
      const args = parseArgs(call.arguments);
      const signature = `${call.name}:${JSON.stringify(args)}`;
      const seen = (calls.get(signature) ?? 0) + 1;
      calls.set(signature, seen);

      const tool = opts.tools.find((t) => t.name === call.name);
      if (!tool) {
        messages.push({
          role: 'tool',
          toolCallId: call.id,
          text: `Unknown tool: ${call.name}`,
        });
        continue;
      }

      if (seen >= 3) {
        repeated = true;
        messages.push({
          role: 'tool',
          toolCallId: call.id,
          text: 'This exact call has repeated three times. Stop and explain what is blocking you.',
        });
        continue;
      }

      if (opts.mode === 'plan' && tool.risk !== 'low') {
        messages.push({
          role: 'tool',
          toolCallId: call.id,
          text: 'Plan mode is read-only. Propose the change with plan_propose instead.',
        });
        continue;
      }

      const ruleKey = `${tool.name}:${String(args.path ?? args.command ?? '')}`;
      const decision = decide(opts.permissionMode, tool.risk, {
        hasRule: opts.allowedRules?.has(ruleKey),
        untrustedContent: opts.untrusted,
      });
      if (decision === 'deny') {
        messages.push({
          role: 'tool',
          toolCallId: call.id,
          text: 'Blocked: this action is not allowed in the current permission mode.',
        });
        continue;
      }
      if (decision === 'ask') {
        const answer = await opts.ask({ tool: tool.name, args, risk: tool.risk });
        if (answer === 'deny') {
          messages.push({
            role: 'tool',
            toolCallId: call.id,
            text: 'User denied this action.',
          });
          continue;
        }
      }

      emit({ type: 'tool_start', name: tool.name, args });
      try {
        const output = await tool.run(args);
        emit({ type: 'tool_end', name: tool.name, ok: true, result: output });
        messages.push({ role: 'tool', toolCallId: call.id, text: output });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        emit({ type: 'tool_end', name: tool.name, ok: false, result: message });
        messages.push({ role: 'tool', toolCallId: call.id, text: `Error: ${message}` });
      }
    }

    if (repeated) {
      emit({ type: 'notice', text: 'Stopped after a repeated identical tool call.' });
      return { messages, text: '', steps: steps + 1, stopped: true };
    }
  }

  emit({ type: 'notice', text: `Reached the step limit (${maxSteps}).` });
  return { messages, text: '', steps, stopped: true };
}
