import { buildSystemPrompt } from '../engine/agent/prompt';
import { runAgent, type AgentEvent, type AgentTool } from '../engine/agent/loop';
import type { PermissionMode, Risk } from '../engine/agent/permissions';
import { WriteGuard } from '../engine/agent/tools/edit';
import { editFileTool, listFilesTool, readFileTool, writeFileTool } from '../engine/agent/tools/fs';
import { grepFiles } from '../engine/agent/tools/search';
import { ProviderError } from '../engine/providers/errors';
import type { ChatMessage, Delta } from '../engine/providers/types';
import { decode, type ProjectFS } from '../storage/projectFs';
import { MemoryFS } from '../storage/projectFs/memory';
import { registryFor, loadProviders, saveProviders, secretFor } from './providersStore';
import { buildCatalog, findModel, flattenCatalog, pickDefaultModel } from './modelCatalog';
import { NoWorkingModelError, recordHealth, resolveWorkingModel } from './modelProbe';
import { translate, type Lang } from './i18n';
import { recordRequest } from './requestCounter';

export interface AskRequest {
  tool: string;
  args: Record<string, unknown>;
  risk: Risk;
}

export interface LiveTurnOptions {
  sessionId: string;
  text: string;
  mode: 'build' | 'plan' | 'mission' | 'skills';
  lang: Lang;
  permissionMode: PermissionMode;
  /** Selected composer model. Falls back to the catalog default when absent. */
  model?: string;
  onEvent: (event: AgentEvent) => void;
  ask: (req: AskRequest) => Promise<'allow' | 'deny'>;
  signal?: AbortSignal;
}

const fsBySession = new Map<string, ProjectFS>();

async function sessionFs(sessionId: string): Promise<ProjectFS> {
  const existing = fsBySession.get(sessionId);
  if (existing) return existing;
  const fs = new MemoryFS();
  fsBySession.set(sessionId, fs);
  return fs;
}

export interface LiveProviderChoice {
  providerId: string;
  modelId: string;
}

/** Resolves the provider that serves `preferred`, or the catalog default. */
export function liveProviderChoice(preferred?: string): LiveProviderChoice | null {
  const providers = loadProviders();
  if (preferred) {
    const hit = findModel(providers, preferred);
    if (hit && hit.provider.corsStatus !== 'blocked') {
      return { providerId: hit.provider.id, modelId: hit.model.id };
    }
  }
  const models = flattenCatalog(buildCatalog(providers, false));
  const fallback = pickDefaultModel(models);
  return fallback ? { providerId: fallback.providerId, modelId: fallback.id } : null;
}

export async function hasLiveProvider(preferred?: string): Promise<boolean> {
  const choice = liveProviderChoice(preferred);
  if (!choice) return false;
  const provider = loadProviders().find((p) => p.id === choice.providerId);
  if (!provider) return false;
  if (provider.auth.type === 'none') return true;
  const key = provider.keys[0];
  return key ? Boolean(await secretFor(provider.id, key.id)) : false;
}

export async function runLiveTurn(opts: LiveTurnOptions): Promise<{ text: string }> {
  // The default and any selected model must pass a real request first.
  const resolved = await resolveWorkingModel(opts.model);
  if (!resolved.choice) throw new NoWorkingModelError(resolved.skipped);
  const choice = resolved.choice;
  if (resolved.skipped.length) {
    opts.onEvent({
      type: 'notice',
      text: translate(opts.lang, 'model.switched', {
        skipped: resolved.skipped.map((s) => s.modelId).join(', '),
        model: choice.modelId,
      }),
    });
  }
  const registry = registryFor(loadProviders());
  const known = loadProviders().find((p) => p.id === choice.providerId)?.models.find((m) => m.id === choice.modelId);
  let replyOnly = known?.health === 'no-tools';
  if (replyOnly) {
    opts.onEvent({ type: 'banner', text: translate(opts.lang, 'model.replyOnly') });
  }
  const fs = await sessionFs(opts.sessionId);
  const guard = new WriteGuard();
  const io = { fs, guard };

  const readAll = async () => {
    const files: Record<string, string> = {};
    for (const file of await fs.walk()) files[file.path] = decode(await fs.read(file.path));
    return files;
  };

  const tools: AgentTool[] = [
    {
      name: 'read_file',
      description: 'Read a text file from the project. Returns line-numbered text.',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string' }, offset: { type: 'number' }, limit: { type: 'number' } },
        required: ['path'],
      },
      risk: 'low',
      run: async (args) => {
        const result = await readFileTool(
          io,
          String(args.path ?? ''),
          typeof args.offset === 'number' ? args.offset : 1,
          typeof args.limit === 'number' ? args.limit : 2000,
        );
        return result.text;
      },
    },
    {
      name: 'list_files',
      description: 'List files and directories under a path.',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string' }, depth: { type: 'number' } },
      },
      risk: 'low',
      run: async (args) =>
        JSON.stringify(
          await listFilesTool(
            io,
            String(args.path ?? ''),
            typeof args.depth === 'number' ? args.depth : 2,
          ),
        ),
    },
    {
      name: 'grep',
      description: 'Search file contents with a regular expression.',
      parameters: {
        type: 'object',
        properties: { pattern: { type: 'string' }, glob: { type: 'string' } },
        required: ['pattern'],
      },
      risk: 'low',
      run: async (args) =>
        JSON.stringify(
          grepFiles(await readAll(), String(args.pattern ?? ''), {
            glob: typeof args.glob === 'string' ? args.glob : undefined,
          }),
        ),
    },
    {
      name: 'write_file',
      description: 'Create or overwrite a file. Read an existing file before overwriting it.',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string' }, content: { type: 'string' } },
        required: ['path', 'content'],
      },
      risk: 'medium',
      run: async (args) => {
        const result = await writeFileTool(io, String(args.path ?? ''), String(args.content ?? ''));
        return `Wrote ${result.path}`;
      },
    },
    {
      name: 'edit_file',
      description: 'Replace a unique string in a file.',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string' }, old_str: { type: 'string' }, new_str: { type: 'string' } },
        required: ['path', 'old_str', 'new_str'],
      },
      risk: 'medium',
      run: async (args) => {
        const result = await editFileTool(
          io,
          String(args.path ?? ''),
          String(args.old_str ?? ''),
          String(args.new_str ?? ''),
        );
        return `Edited ${result.path} (${result.matches} match${result.matches === 1 ? '' : 'es'})`;
      },
    },
  ];

  const system = buildSystemPrompt({
    projectRoot: '',
    runtime: 'limited',
    permissionMode: opts.permissionMode,
    mode: opts.mode,
    locale: opts.lang,
  });
  const messages: ChatMessage[] = [
    { role: 'system', text: system },
    { role: 'user', text: opts.text },
  ];

  const result = await runAgent({
    modelId: choice.modelId,
    messages,
    tools,
    permissionMode: opts.permissionMode,
    mode: opts.mode === 'plan' ? 'plan' : 'build',
    signal: opts.signal,
    ask: opts.ask,
    onEvent: opts.onEvent,
    model: async (req, onDelta: (delta: Delta) => void) => {
      recordRequest(choice.providerId);
      const request = replyOnly
        ? { ...req, model: choice.modelId, tools: undefined, toolChoice: undefined }
        : { ...req, model: choice.modelId };
      try {
        return await registry.chat(choice.providerId, request, onDelta);
      } catch (err) {
        if (replyOnly || !(err instanceof ProviderError) || err.code !== 'unsupported-tools') {
          throw err;
        }
        // The model answered, it just cannot call tools: retry as plain chat.
        replyOnly = true;
        saveProviders(
          recordHealth(loadProviders(), choice.providerId, choice.modelId, {
            status: 'no-tools',
            error: err.providerMessage ?? err.message,
          }),
        );
        opts.onEvent({ type: 'banner', text: translate(opts.lang, 'model.replyOnly') });
        return registry.chat(
          choice.providerId,
          { ...req, model: choice.modelId, tools: undefined, toolChoice: undefined },
          onDelta,
        );
      }
    },
  });

  return { text: result.text };
}
