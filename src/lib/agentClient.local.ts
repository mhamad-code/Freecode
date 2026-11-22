import { buildSystemPrompt } from '../engine/agent/prompt';
import { runAgent, type AgentEvent, type AgentTool } from '../engine/agent/loop';
import type { PermissionMode, Risk } from '../engine/agent/permissions';
import { WriteGuard } from '../engine/agent/tools/edit';
import { editFileTool, listFilesTool, readFileTool, writeFileTool } from '../engine/agent/tools/fs';
import { grepFiles } from '../engine/agent/tools/search';
import { ProviderError } from '../engine/providers/errors';
import {
  LITE_MAX_TOKENS,
  LITE_SYSTEM_PROMPT,
  liteReducedRetry,
  shouldUseLite,
  toLiteRequest,
} from '../engine/providers/lite';
import type { ChatMessage, Delta } from '../engine/providers/types';
import { decode } from '../storage/projectFs';
import { mountProjectFiles, projectFsFor, readProjectFile } from './projectBridge';
import { registryFor, loadProviders, saveProviders, secretFor } from './providersStore';
import { buildCatalog, findModel, flattenCatalog, pickDefaultModel } from './modelCatalog';
import { NoWorkingModelError, recordHealth, resolveWorkingModel } from './modelProbe';
import { translate, type Lang } from './i18n';
import { recordRequest } from './requestCounter';
import { getLiteSetting } from './liteMode';

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
  /** The project's files as the editor has them; mounted before the turn. */
  files?: Record<string, string>;
  /** Called after a write/edit tool lands, so the store can show it at once. */
  onFileWrite?: (path: string, contents: string) => void;
  signal?: AbortSignal;
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
  const provider = loadProviders().find((p) => p.id === choice.providerId);
  const known = provider?.models.find((m) => m.id === choice.modelId);
  const lite = provider ? shouldUseLite(getLiteSetting(), provider) : false;
  let replyOnly = lite || known?.health === 'no-tools';
  if (lite) {
    opts.onEvent({ type: 'banner', text: translate(opts.lang, 'lite.banner') });
  } else if (replyOnly) {
    opts.onEvent({ type: 'banner', text: translate(opts.lang, 'model.replyOnly') });
  }
  const fs = await projectFsFor(opts.sessionId);
  await mountProjectFiles(fs, opts.files ?? {});
  const guard = new WriteGuard();
  const io = { fs, guard };

  /** Mirrors a file the agent just changed into the editor's store. */
  const publish = async (path: string) => {
    const contents = await readProjectFile(fs, path);
    if (contents !== undefined) opts.onFileWrite?.(path, contents);
  };

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
        await publish(result.path);
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
        await publish(result.path);
        return `Edited ${result.path} (${result.matches} match${result.matches === 1 ? '' : 'es'})`;
      },
    },
  ];

  const system = lite
    ? LITE_SYSTEM_PROMPT
    : buildSystemPrompt({
        projectRoot: '',
        runtime: 'limited',
        permissionMode: opts.permissionMode,
        mode: opts.mode,
        locale: opts.lang,
      });
  const baseMessages: ChatMessage[] = [
    { role: 'system', text: system },
    { role: 'user', text: opts.text },
  ];
  const messages: ChatMessage[] = lite
    ? toLiteRequest({ model: choice.modelId, messages: baseMessages }).messages
    : baseMessages;

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
      const shaped = lite
        ? toLiteRequest({ ...req, model: choice.modelId, maxTokens: req.maxTokens ?? LITE_MAX_TOKENS })
        : { ...req, model: choice.modelId };
      const request = replyOnly
        ? { ...shaped, tools: undefined, toolChoice: undefined }
        : shaped;
      let emitted = false;
      const emit = (delta: Delta) => {
        emitted = true;
        onDelta(delta);
      };
      try {
        return await registry.chat(choice.providerId, request, emit);
      } catch (err) {
        const reduced = lite ? liteReducedRetry(shaped, err, emitted) : null;
        if (reduced) {
          // A free tier can reserve the requested output budget against a small
          // allowance; ask for less instead of failing the turn.
          opts.onEvent({ type: 'banner', text: translate(opts.lang, 'lite.reduced') });
          return registry.chat(choice.providerId, reduced, emit);
        }
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
          emit,
        );
      }
    },
  });

  return { text: result.text };
}
