import { buildSystemPrompt } from '../engine/agent/prompt';
import { runAgent, type AgentEvent, type AgentTool } from '../engine/agent/loop';
import type { PermissionMode, Risk } from '../engine/agent/permissions';
import { WriteGuard } from '../engine/agent/tools/edit';
import { editFileTool, listFilesTool, readFileTool, writeFileTool } from '../engine/agent/tools/fs';
import { grepFiles } from '../engine/agent/tools/search';
import type { ChatMessage, Delta } from '../engine/providers/types';
import { decode, type ProjectFS } from '../storage/projectFs';
import { MemoryFS } from '../storage/projectFs/memory';
import { FILE_CONTENTS } from './mock';
import { registryFor, loadProviders, secretFor } from './providersStore';
import type { Lang } from './i18n';

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
  onEvent: (event: AgentEvent) => void;
  ask: (req: AskRequest) => Promise<'allow' | 'deny'>;
  signal?: AbortSignal;
}

const fsBySession = new Map<string, ProjectFS>();

async function sessionFs(sessionId: string): Promise<ProjectFS> {
  const existing = fsBySession.get(sessionId);
  if (existing) return existing;
  const fs = new MemoryFS();
  await fs.mkdir('src');
  for (const [path, content] of Object.entries(FILE_CONTENTS)) {
    await fs.write(path, content);
  }
  fsBySession.set(sessionId, fs);
  return fs;
}

export interface LiveProviderChoice {
  providerId: string;
  modelId: string;
}

/** Returns the first enabled provider that has a discovered tools-capable model. */
export function liveProviderChoice(): LiveProviderChoice | null {
  for (const provider of loadProviders()) {
    if (!provider.enabled || provider.corsStatus === 'blocked') continue;
    const model =
      provider.models.find((m) => m.tools !== false && !m.retired) ?? provider.models[0];
    if (model) return { providerId: provider.id, modelId: model.id };
  }
  return null;
}

export async function hasLiveProvider(): Promise<boolean> {
  const choice = liveProviderChoice();
  if (!choice) return false;
  const provider = loadProviders().find((p) => p.id === choice.providerId);
  if (!provider) return false;
  if (provider.auth.type === 'none') return true;
  const key = provider.keys[0];
  return key ? Boolean(await secretFor(provider.id, key.id)) : false;
}

export async function runLiveTurn(opts: LiveTurnOptions): Promise<{ text: string }> {
  const choice = liveProviderChoice();
  if (!choice) throw new Error('No configured provider with an available model.');
  const registry = registryFor(loadProviders());
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
    projectRoot: 'VEXORA Complete',
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
    model: (req, onDelta: (delta: Delta) => void) =>
      registry.chat(choice.providerId, { ...req, model: choice.modelId }, onDelta),
  });

  return { text: result.text };
}
