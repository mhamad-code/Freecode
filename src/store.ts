import { create } from 'zustand';
import type {
  AssistantMessage,
  AssistantTurn,
  ChangedFile,
  DiffLine,
  Effort,
  FileNode,
  GitState,
  Integration,
  McpServer,
  Message,
  Mode,
  Permission,
  Session,
  Skill,
  ToastItem,
  ToolKind,
  ToolTab,
  ToolTabKind,
  UsageReport,
} from './lib/types';
import {
  BRANCHES,
  COMMITS,
  FILE_CONTENTS,
  FILE_TREE,
  GIT_FILES,
  INTEGRATIONS,
  MCP_SERVERS,
  SKILLS,
  USAGE,
  seedSessions,
  uid,
} from './lib/mock';
import type { Lang } from './lib/i18n';
import { hasLiveProvider, runLiveTurn, type AskRequest } from './lib/agentClient.local';
import type { PermissionMode } from './engine/agent/permissions';
import { ERROR_HINT, ProviderError } from './engine/providers/errors';

export interface Settings {
  advancedMode: boolean;
  sendEnter: boolean;
  suggestions: boolean;
  sounds: boolean;
  desktopNotifications: boolean;
  autoRenew: boolean;
  keepAlive: boolean;
  autoArchive: string;
  permissionMode: string;
  includeAgents: boolean;
  transparency: number;
  reduceMotion: boolean;
  accent: string;
}

type ScenarioStep =
  | { k: 'text'; text: string }
  | { k: 'group'; actions: [ToolKind, string, string][] }
  | { k: 'permission'; action: string; command: string; risk: 'low' | 'medium' | 'high' }
  | { k: 'error'; title: string; message: string; details: string }
  | { k: 'checkpoint' }
  | { k: 'final'; text: string; followUps: string[] };

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const rand = (min: number, max: number) => min + Math.random() * (max - min);

let runToken = 0;
const liveControllers = new Map<string, AbortController>();
const permissionWaiters = new Map<string, (d: 'allow-once' | 'allow-always' | 'deny') => void>();

const touch = (s: Session): Session => ({ ...s, updatedAt: Date.now() });

const patchTurn = (
  sessions: Session[],
  sid: string,
  turnId: string,
  fn: (t: AssistantTurn) => void,
): Session[] =>
  sessions.map((s) => {
    if (s.id !== sid) return s;
    return touch({
      ...s,
      messages: s.messages.map((m) => {
        if (m.kind !== 'assistant' || m.turn.id !== turnId) return m;
        const turn = structuredClone(m.turn);
        fn(turn);
        return { ...m, turn } as AssistantMessage;
      }),
    });
  });

const lastAssistant = (s: Session) => {
  for (let i = s.messages.length - 1; i >= 0; i--) {
    const m = s.messages[i];
    if (m.kind === 'assistant') return m.turn;
  }
  return undefined;
};

interface AppStore {
  themeId: string;
  lang: Lang;
  setTheme: (id: string) => void;
  setLang: (l: Lang) => void;
  settings: Settings;
  setSetting: <K extends keyof Settings>(k: K, v: Settings[K]) => void;
  resetSettings: () => void;
  restoreBackup: (payload: { settings?: Partial<Settings>; sessions?: Session[] }) => void;

  mode: 'code' | 'chat';
  setMode: (m: 'code' | 'chat') => void;
  drawerOpen: boolean;
  setDrawer: (v: boolean) => void;
  drawerPinned: boolean;
  setDrawerPinned: (v: boolean) => void;
  paletteOpen: boolean;
  setPalette: (v: boolean) => void;

  sessions: Session[];
  activeSessionId: string;
  setActiveSession: (id: string) => void;
  newSession: () => string;
  closeSession: (id: string) => void;
  renameSession: (id: string, title: string) => void;
  setDraft: (text: string) => void;
  setSessionMode: (m: Mode) => void;
  setModel: (m: string) => void;
  setEffort: (e: Effort) => void;
  send: (text: string) => void;
  stop: () => void;
  respondPermission: (decision: 'allow-once' | 'allow-always' | 'deny') => void;
  toggleTurn: (turnId: string, collapsed: boolean) => void;

  toolTabs: ToolTab[];
  activeToolId: string;
  toolOpen: boolean;
  openTool: (kind: ToolTabKind, path?: string) => void;
  closeTool: (id: string) => void;
  setActiveTool: (id: string) => void;
  setToolOpen: (v: boolean) => void;
  dockOpen: boolean;
  setDockOpen: (v: boolean) => void;
  dockHeight: number;
  setDockHeight: (h: number) => void;

  files: FileNode[];
  openFilePath: string | null;
  openFile: (path: string) => void;
  saveFile: (path: string, content: string) => void;
  fileContents: Record<string, string>;

  git: GitState;
  toggleStage: (path: string) => void;
  stageAll: (v: boolean) => void;
  resolveHunk: (path: string, hunkId: string, state: 'accepted' | 'rejected') => void;
  acceptAll: () => void;
  commit: (msg: string) => void;
  push: () => void;
  pull: () => void;
  checkout: (branch: string) => void;

  integrations: Integration[];
  connectIntegration: (id: string, account: string) => void;
  disconnectAccount: (id: string, accountId: string) => void;
  skills: Skill[];
  toggleSkill: (id: string) => void;
  addSkill: (name: string, description: string) => void;
  mcp: McpServer[];
  toggleMcp: (id: string) => void;
  toggleMcpTool: (serverId: string, tool: string) => void;

  usage: UsageReport;
  sessionUsage: { context: number; cost: number; tokens: number };
  toasts: ToastItem[];
  toast: (text: string, action?: string, onAction?: () => void) => void;
  dismissToast: (id: string) => void;
  seek: string | null;
  setSeek: (v: string | null) => void;
  activityFilter: string;
  setActivityFilter: (v: string) => void;
}

const seedSessionsList = seedSessions();
const initialFiles = FILE_TREE;

export const useStore = create<AppStore>((set, get) => ({
  themeId: localStorage.getItem('fc.theme') || 'dark',
  lang: (localStorage.getItem('fc.lang') as Lang) || 'en',
  setTheme: (id) => {
    localStorage.setItem('fc.theme', id);
    set({ themeId: id });
  },
  setLang: (l) => {
    localStorage.setItem('fc.lang', l);
    set({ lang: l });
  },
  settings: {
    advancedMode: true,
    sendEnter: true,
    suggestions: true,
    sounds: true,
    desktopNotifications: false,
    autoRenew: true,
    keepAlive: true,
    autoArchive: 'never',
    permissionMode: 'ask',
    includeAgents: true,
    transparency: 78,
    reduceMotion: false,
    accent: '',
  },
  setSetting: (k, v) =>
    set((s) => ({ settings: { ...s.settings, [k]: v } })),
  restoreBackup: (payload) =>
    set((s) => ({
      settings: payload.settings ? { ...s.settings, ...payload.settings } : s.settings,
      sessions: payload.sessions?.length ? payload.sessions : s.sessions,
      activeSessionId: payload.sessions?.length ? payload.sessions[0].id : s.activeSessionId,
    })),
  resetSettings: () =>
    set({
      themeId: 'dark',
      sessions: seedSessions(),
      activeSessionId: 's1',
      files: FILE_TREE,
      git: { branch: 'main', ahead: 2, behind: 0, files: GIT_FILES, commits: COMMITS, branches: BRANCHES },
      integrations: INTEGRATIONS,
      skills: SKILLS,
      mcp: MCP_SERVERS,
    }),

  mode: 'code',
  setMode: (mode) => set({ mode }),
  drawerOpen: false,
  setDrawer: (drawerOpen) => set({ drawerOpen }),
  drawerPinned: false,
  setDrawerPinned: (drawerPinned) => set({ drawerPinned }),
  paletteOpen: false,
  setPalette: (paletteOpen) => set({ paletteOpen }),

  sessions: seedSessionsList,
  activeSessionId: seedSessionsList[0].id,
  setActiveSession: (id) => set({ activeSessionId: id, drawerOpen: false }),
  newSession: () => {
    const id = uid();
    const s: Session = {
      id,
      title: 'New chat',
      project: 'VEXORA Complete',
      status: 'idle',
      mode: 'build',
      draft: '',
      model: 'DeepSeek V4.1 Flash',
      effort: 'high',
      updatedAt: Date.now(),
      messages: [],
    };
    set((st) => ({ sessions: [...st.sessions, s], activeSessionId: id, drawerOpen: false, toolOpen: false }));
    return id;
  },
  closeSession: (id) =>
    set((st) => {
      const rest = st.sessions.filter((s) => s.id !== id);
      const sessions = rest.length
        ? rest
        : [
            {
              id: uid(),
              title: 'New chat',
              project: 'VEXORA Complete',
              status: 'idle' as const,
              mode: 'build' as const,
              draft: '',
              model: 'DeepSeek V4.1 Flash',
              effort: 'high' as const,
              updatedAt: Date.now(),
              messages: [],
            },
          ];
      return {
        sessions,
        activeSessionId: st.activeSessionId === id ? sessions[sessions.length - 1].id : st.activeSessionId,
      };
    }),
  renameSession: (id, title) =>
    set((st) => ({ sessions: st.sessions.map((s) => (s.id === id ? { ...s, title: title || 'Untitled' } : s)) })),
  setDraft: (draft) =>
    set((st) => ({
      sessions: st.sessions.map((s) => (s.id === st.activeSessionId ? { ...s, draft } : s)),
    })),
  setSessionMode: (mode) =>
    set((st) => ({
      sessions: st.sessions.map((s) => (s.id === st.activeSessionId ? { ...s, mode } : s)),
    })),
  setModel: (model) =>
    set((st) => ({
      sessions: st.sessions.map((s) => (s.id === st.activeSessionId ? { ...s, model } : s)),
    })),
  setEffort: (effort) =>
    set((st) => ({
      sessions: st.sessions.map((s) => (s.id === st.activeSessionId ? { ...s, effort } : s)),
    })),

  send: (raw) => {
    const text = raw.trim();
    if (!text) return;
    const st = get();
    const sid = st.activeSessionId;
    const session = st.sessions.find((s) => s.id === sid);
    if (!session || session.status === 'running') return;
    const turnId = uid();
    const userMsg: Message = { id: uid(), role: 'user', kind: 'user', text, at: Date.now() };
    const assistant: AssistantMessage = {
      id: turnId,
      role: 'assistant',
      kind: 'assistant',
      turn: {
        id: turnId,
        blocks: [],
        final: '',
        followUps: [],
        running: true,
        startedAt: Date.now(),
        collapsed: false,
        checkpoint: { id: `cp-${turnId}`, label: 'Before this run', files: Math.floor(rand(3, 12)) },
      },
    };
    set((s) => ({
      sessions: s.sessions.map((x) =>
        x.id === sid
          ? touch({
              ...x,
              title: x.title === 'New chat' ? text.slice(0, 42) : x.title,
              status: 'running',
              draft: '',
              messages: [...x.messages, userMsg, assistant],
            })
          : x,
      ),
    }));

    const token = ++runToken;
    const mode = session.mode;
    void (async () => {
      try {
        if (await hasLiveProvider()) {
          if (token !== runToken) return;
          await runLive(sid, turnId, text, mode, token, set, get);
          return;
        }
      } catch {
        // Fall back to the demo scenario when the live path is unavailable.
      }
      if (token !== runToken) return;
      void runScenario(sid, turnId, buildScenario(text, mode, get().lang), token, set, get);
    })();
  },

  stop: () => {
    runToken++;
    liveControllers.forEach((controller) => controller.abort());
    liveControllers.clear();
    const st = get();
    const sid = st.activeSessionId;
    const session = st.sessions.find((s) => s.id === sid);
    const turn = session ? lastAssistant(session) : undefined;
    permissionWaiters.clear();
    if (!session || !turn || !turn.running) return;
    set((s) => ({
      sessions: patchTurn(s.sessions, sid, turn.id, (t) => {
        t.running = false;
        t.stopped = true;
        t.collapsed = true;
        t.durationMs = Date.now() - t.startedAt;
        t.permission = undefined;
        t.blocks.forEach((b) => {
          if (b.type === 'group') {
            b.group.done = true;
            b.group.actions.forEach((a) => (a.status = 'done'));
          }
        });
      }).map((x) => (x.id === sid ? { ...x, status: 'idle' as const } : x)),
    }));
    get().toast('Run stopped');
  },

  respondPermission: (decision) => {
    const st = get();
    const session = st.sessions.find((s) => s.id === st.activeSessionId);
    const turn = session ? lastAssistant(session) : undefined;
    if (!session || !turn || !turn.permission) return;
    const perm = turn.permission;
    set((s) => ({
      sessions: patchTurn(s.sessions, session.id, turn.id, (t) => {
        if (t.permission) t.permission.decision = decision;
      }).map((x) => (x.id === session.id ? { ...x, status: 'running' as const } : x)),
    }));
    permissionWaiters.get(perm.id)?.(decision);
    permissionWaiters.delete(perm.id);
  },

  toggleTurn: (turnId, collapsed) =>
    set((st) => ({
      sessions: st.sessions.map((s) =>
        s.id === st.activeSessionId
          ? { ...s, messages: s.messages.map((m) => (m.kind === 'assistant' && m.turn.id === turnId ? { ...m, turn: { ...m.turn, collapsed } } : m)) }
          : s,
      ),
    })),

  toolTabs: [
    { id: 'tab-launcher', kind: 'launcher', title: 'New tab' },
    { id: 'tab-files', kind: 'files', title: 'Files' },
  ],
  activeToolId: 'tab-files',
  toolOpen: false,
  openTool: (kind, path) => {
    const existing = get().toolTabs.find((t) => t.kind === kind && (!path || t.path === path));
    if (existing) {
      set({ activeToolId: existing.id, toolOpen: true });
      return;
    }
    const titles: Record<ToolTabKind, string> = {
      launcher: 'New tab',
      files: 'Files',
      browser: 'Cloud browser',
      terminal: 'Terminal',
      overview: 'Overview',
      changes: 'Changes',
      plan: 'Plan',
      editor: path?.split('/').pop() ?? 'Editor',
      preview: 'Preview',
    };
    const tab: ToolTab = { id: uid(), kind, title: titles[kind], path };
    set((s) => ({ toolTabs: [...s.toolTabs, tab], activeToolId: tab.id, toolOpen: true }));
    if (kind === 'editor' && path) get().openFile(path);
  },
  closeTool: (id) =>
    set((s) => {
      const rest = s.toolTabs.filter((t) => t.id !== id);
      if (!rest.length) return { toolTabs: s.toolTabs, activeToolId: s.activeToolId };
      return {
        toolTabs: rest,
        activeToolId: s.activeToolId === id ? rest[rest.length - 1].id : s.activeToolId,
      };
    }),
  setActiveTool: (activeToolId) => set({ activeToolId }),
  setToolOpen: (toolOpen) => set({ toolOpen }),
  dockOpen: false,
  setDockOpen: (dockOpen) => set({ dockOpen }),
  dockHeight: 35,
  setDockHeight: (dockHeight) => set({ dockHeight }),

  files: initialFiles,
  fileContents: FILE_CONTENTS,
  openFilePath: null,
  openFile: (path) => {
    set({ openFilePath: path });
    get().openTool('editor', path);
  },
  saveFile: (path, content) =>
    set((s) => {
      const walk = (nodes: FileNode[]): FileNode[] =>
        nodes.map((n) =>
          n.path === path && n.type === 'file'
            ? { ...n, status: n.status ?? 'M' }
            : n.children
              ? { ...n, children: walk(n.children) }
              : n,
        );
      return { fileContents: { ...s.fileContents, [path]: content }, files: walk(s.files) };
    }),

  git: { branch: 'main', ahead: 2, behind: 0, files: GIT_FILES, commits: COMMITS, branches: BRANCHES },
  toggleStage: (path) =>
    set((s) => ({
      git: { ...s.git, files: s.git.files.map((f) => (f.path === path ? { ...f, staged: !f.staged } : f)) },
    })),
  stageAll: (v) => set((s) => ({ git: { ...s.git, files: s.git.files.map((f) => ({ ...f, staged: v })) } })),
  resolveHunk: (path, hunkId, state) =>
    set((s) => ({
      git: {
        ...s.git,
        files: s.git.files.map((f) =>
          f.path === path ? { ...f, hunks: f.hunks.map((h) => (h.id === hunkId ? { ...h, state } : h)) } : f,
        ),
      },
    })),
  acceptAll: () =>
    set((s) => ({
      git: { ...s.git, files: s.git.files.map((f) => ({ ...f, hunks: f.hunks.map((h) => ({ ...h, state: 'accepted' as const })) })) },
    })),
  commit: (msg) => {
    const st = get();
    const staged = st.git.files.filter((f) => f.staged);
    if (!staged.length || !msg.trim()) return;
    const hash = Math.random().toString(16).slice(2, 9);
    set((s) => ({
      git: {
        ...s.git,
        ahead: s.git.ahead + 1,
        files: s.git.files.filter((f) => !f.staged),
        commits: [{ hash, message: msg.trim(), author: 'You', at: Date.now() }, ...s.git.commits],
      },
    }));
    get().toast(`Committed ${hash}`, 'Undo', () => {
      set((s) => ({ git: { ...s.git, files: [...staged, ...s.git.files], commits: s.git.commits.slice(1), ahead: Math.max(0, s.git.ahead - 1) } }));
    });
  },
  push: () => {
    get().toast('Pushed to origin/main');
    set((s) => ({ git: { ...s.git, ahead: 0 } }));
  },
  pull: () => {
    get().toast('Pulled from origin/main');
    set((s) => ({ git: { ...s.git, behind: 0 } }));
  },
  checkout: (branch) =>
    set((s) => ({
      git: {
        ...s.git,
        branch,
        branches: s.git.branches.map((b) => ({ ...b, current: b.name === branch })),
      },
    })),

  integrations: INTEGRATIONS,
  connectIntegration: (id, account) =>
    set((s) => ({
      integrations: s.integrations.map((i) =>
        i.id === id
          ? {
              ...i,
              category: 'connected',
              accounts: [
                ...i.accounts,
                { id: uid(), name: account || `${i.name} account`, connectedAt: new Date().toISOString().slice(0, 10), status: 'ok' },
              ],
            }
          : i,
      ),
    })),
  disconnectAccount: (id, accountId) =>
    set((s) => ({
      integrations: s.integrations.map((i) =>
        i.id === id
          ? {
              ...i,
              accounts: i.accounts.filter((a) => a.id !== accountId),
              category: i.accounts.length <= 1 ? ('popular' as const) : i.category,
            }
          : i,
      ),
    })),
  skills: SKILLS,
  toggleSkill: (id) => set((s) => ({ skills: s.skills.map((k) => (k.id === id ? { ...k, enabled: !k.enabled } : k)) })),
  addSkill: (name, description) =>
    set((s) => ({ skills: [{ id: name, name, description, enabled: true, scope: 'project', used: 0 }, ...s.skills] })),
  mcp: MCP_SERVERS,
  toggleMcp: (id) =>
    set((s) => ({
      mcp: s.mcp.map((m) => (m.id === id ? { ...m, status: m.status === 'disabled' ? 'connected' : 'disabled' } : m)),
    })),
  toggleMcpTool: (serverId, tool) =>
    set((s) => ({
      mcp: s.mcp.map((m) =>
        m.id === serverId
          ? { ...m, tools: m.tools.map((t) => (t.name === tool ? { ...t, enabled: !t.enabled } : t)) }
          : m,
      ),
    })),

  usage: USAGE,
  sessionUsage: { context: 61, cost: 0.42, tokens: 124 },
  toasts: [],
  toast: (text, action, onAction) => {
    const id = uid();
    set((s) => ({ toasts: [...s.toasts, { id, text, action, onAction }] }));
    setTimeout(() => get().dismissToast(id), 4000);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  seek: null,
  setSeek: (seek) => set({ seek }),
  activityFilter: 'all',
  setActivityFilter: (activityFilter) => set({ activityFilter }),
}));

/* ------------------------- scenario engine ------------------------- */

function buildScenario(text: string, mode: Mode, lang: Lang): ScenarioStep[] {
  const ar = lang === 'ar';
  const lower = text.toLowerCase();
  const risky = /rm -rf|--force|force push|permission|delete/.test(lower);
  const failing = /error|fails|failing|stack|bug/.test(lower);

  if (risky) {
    return [
      { k: 'text', text: ar ? 'سأفحص الحالة أولاً. هذا الأمر يحتاج إذنك قبل التشغيل.' : 'Let me inspect the state first. This command needs your approval before it runs.' },
      { k: 'group', actions: [['read', 'Read', 'package.json'], ['cmd', 'Ran', 'git status --short']] },
      {
        k: 'permission',
        action: ar ? 'حذف node_modules وإعادة تثبيت الحزم' : 'Delete node_modules and reinstall dependencies',
        command: 'rm -rf node_modules && npm install',
        risk: 'medium',
      },
      { k: 'group', actions: [['cmd', 'Ran', 'npm install'], ['cmd', 'Ran', 'npm run build']] },
      {
        k: 'final',
        text: ar
          ? 'تمت إعادة تثبيت الحزم والبناء يمر بنجاح. لم ألمس أي ملف مصدري.'
          : 'Dependencies are reinstalled and the build passes. I did not touch any source file.',
        followUps: ar ? ['شغّل الاختبارات', 'اعرض الفروقات', 'أنشئ commit'] : ['Run the tests', 'Show the diff', 'Create a commit'],
      },
    ];
  }

  if (failing) {
    return [
      { k: 'group', actions: [['read', 'Read', 'src/routes/chat.tsx'], ['cmd', 'Ran', 'npm run build']] },
      {
        k: 'error',
        title: ar ? 'فشل البناء' : 'Build failed',
        message: ar ? 'خطأ نوعي في src/routes/chat.tsx عند السطر 18.' : 'A type error in src/routes/chat.tsx at line 18.',
        details:
          'src/routes/chat.tsx:18:24 - error TS2339: Property "reply" does not exist on type "Message".\n\n18     setMessages((m) => [...m, reply]);\n                                       ~~~~~',
      },
    ];
  }

  if (mode === 'plan') {
    return [
      { k: 'text', text: ar ? 'سأضع خطة قبل أي تعديل:' : "Here's a plan before touching anything:" },
      { k: 'group', actions: [['read', 'Read', 'vite.config.ts'], ['read', 'Read', 'src/routes/cli.tsx'], ['browser', 'Opened', 'localhost:5173/chat']] },
      {
        k: 'final',
        text: ar
          ? 'الخطة جاهزة في تبويب «الخطة»: ست خطوات، لا تعديلات قبل اعتمادك.'
          : 'The plan is ready in the Plan tab: six steps, and no edits until you approve it.',
        followUps: ar ? ['عدّل الخطوة الثانية', 'قدّر الوقت', 'ابدأ البناء'] : ['Edit step 2', 'Estimate the time', 'Start building'],
      },
    ];
  }

  return [
    { k: 'checkpoint' },
    { k: 'text', text: ar ? 'سأبدأ بفحص المشروع الحالي.' : "I'll start by inspecting the current project." },
    {
      k: 'group',
      actions: [
        ['read', 'Read', 'package.json'],
        ['read', 'Read', 'src/routes/chat.tsx'],
        ['cmd', 'Ran', 'ls src'],
      ],
    },
    {
      k: 'text',
      text: ar
        ? 'المسارات جاهزة. سأضيف الكتابة التدريجية في `/cli` وأتحقق من البناء.'
        : "The routes are in place. I'll wire the typing animation into `/cli` and check the build.",
    },
    {
      k: 'group',
      actions: [
        ['edit', 'Edited', 'src/routes/cli.tsx'],
        ['edit', 'Edited', 'src/styles.css'],
        ['cmd', 'Ran', 'npm run build'],
      ],
    },
    {
      k: 'final',
      text: ar
        ? 'تم. أصبحت `/cli` تطبع المخرجات حرفاً بحرف، و`/chat` يحتفظ بسلوك المحرر نفسه. البناء يمر بنجاح.'
        : 'Done. `/cli` now streams its output character by character, and `/chat` keeps the same composer behavior. The build passes.',
      followUps: ar
        ? ['تحقق من البناء', 'راجع الفروقات', 'أضف اختباراً']
        : ['Verify the build', 'Review the diff', 'Add a test'],
    },
  ];
}

async function runScenario(
  sid: string,
  turnId: string,
  steps: ScenarioStep[],
  token: number,
  set: (fn: (s: AppStore) => Partial<AppStore>) => void,
  get: () => AppStore,
) {
  const alive = () => token === runToken;

  const streamText = async (text: string) => {
    const blockId = uid();
    set((s) => ({
      sessions: patchTurn(s.sessions, sid, turnId, (t) => {
        t.blocks.push({ type: 'text', id: blockId, text: '' });
      }),
    }));
    const words = text.split(' ');
    for (let i = 0; i < words.length; i++) {
      if (!alive()) return;
      set((s) => ({
        sessions: patchTurn(s.sessions, sid, turnId, (t) => {
          const b = t.blocks.find((x) => x.id === blockId);
          if (b && b.type === 'text') b.text = b.text ? `${b.text} ${words[i]}` : words[i];
        }),
      }));
      await sleep(rand(18, 42));
    }
  };

  const runGroup = async (actions: [ToolKind, string, string][]) => {
    const groupId = uid();
    set((s) => ({
      sessions: patchTurn(s.sessions, sid, turnId, (t) => {
        t.blocks.push({
          type: 'group',
          id: groupId,
          group: {
            id: groupId,
            done: false,
            actions: [{ id: `${groupId}-0`, kind: actions[0][0], label: actions[0][1], value: actions[0][2], status: 'running' }],
          },
        });
      }),
    }));
    for (let i = 0; i < actions.length; i++) {
      await sleep(rand(420, 760));
      if (!alive()) return;
      const next = actions[i + 1];
      set((s) => ({
        sessions: patchTurn(s.sessions, sid, turnId, (t) => {
          const b = t.blocks.find((x) => x.id === groupId);
          if (!b || b.type !== 'group') return;
          const cur = b.group.actions[b.group.actions.length - 1];
          if (cur) cur.status = 'done';
          if (next) {
            b.group.actions.push({ id: `${groupId}-${i + 1}`, kind: next[0], label: next[1], value: next[2], status: 'running' });
          } else {
            b.group.done = true;
          }
        }),
        sessionUsage: {
          context: Math.min(96, s.sessionUsage.context + 1),
          cost: Number((s.sessionUsage.cost + 0.03).toFixed(2)),
          tokens: s.sessionUsage.tokens + Math.floor(rand(2, 9)),
        },
      }));
    }
    await sleep(rand(140, 260));
  };

  for (const step of steps) {
    if (!alive()) return;
    if (step.k === 'text') {
      await streamText(step.text);
      await sleep(220);
    } else if (step.k === 'group') {
      await runGroup(step.actions);
    } else if (step.k === 'checkpoint') {
      // checkpoint already attached to the turn
      await sleep(120);
    } else if (step.k === 'permission') {
      const perm: Permission = { id: uid(), action: step.action, command: step.command, risk: step.risk };
      set((s) => ({
        sessions: patchTurn(s.sessions, sid, turnId, (t) => {
          t.permission = perm;
        }).map((x) => (x.id === sid ? { ...x, status: 'waiting' as const } : x)),
      }));
      if (get().activeSessionId !== sid) get().toast('Permission needed in another session');
      const decision = await new Promise<'allow-once' | 'allow-always' | 'deny'>((resolve) => {
        permissionWaiters.set(perm.id, resolve);
      });
      if (!alive()) return;
      if (decision === 'deny') {
        set((s) => ({
          sessions: patchTurn(s.sessions, sid, turnId, (t) => {
            t.permission = t.permission ? { ...t.permission, decision } : undefined;
          }),
        }));
        await streamText(get().lang === 'ar' ? 'حسناً، لن أشغّل هذا الأمر.' : "Understood — I won't run that command.");
        set((s) => ({
          sessions: patchTurn(s.sessions, sid, turnId, (t) => {
            t.running = false;
            t.collapsed = true;
            t.durationMs = Date.now() - t.startedAt;
            t.followUps = [];
          }).map((x) => (x.id === sid ? { ...x, status: 'idle' as const } : x)),
        }));
        return;
      }
    } else if (step.k === 'error') {
      if (!alive()) return;
      set((s) => ({
        sessions: patchTurn(s.sessions, sid, turnId, (t) => {
          t.running = false;
          t.collapsed = false;
          t.durationMs = Date.now() - t.startedAt;
          t.error = { title: step.title, message: step.message, details: step.details };
        }).map((x) => (x.id === sid ? { ...x, status: 'error' as const } : x)),
      }));
      return;
    } else if (step.k === 'final') {
      if (!alive()) return;
      set((s) => ({
        sessions: patchTurn(s.sessions, sid, turnId, (t) => {
          t.running = false;
          t.collapsed = true;
          t.durationMs = Date.now() - t.startedAt;
          t.final = step.text;
          t.followUps = step.followUps;
        }).map((x) => (x.id === sid ? { ...x, status: 'idle' as const } : x)),
      }));
    }
  }
}

async function runLive(
  sid: string,
  turnId: string,
  text: string,
  mode: Mode,
  token: number,
  set: (fn: (s: AppStore) => Partial<AppStore>) => void,
  get: () => AppStore,
) {
  const alive = () => token === runToken;
  const controller = new AbortController();
  liveControllers.set(turnId, controller);
  let textBlockId: string | null = null;
  let groupId: string | null = null;

  const pushText = (chunk: string) => {
    if (!alive() || !chunk) return;
    set((s) => ({
      sessions: patchTurn(s.sessions, sid, turnId, (t) => {
        if (!textBlockId) {
          const id = uid();
          textBlockId = id;
          t.blocks.push({ type: 'text', id, text: '' });
        }
        const block = t.blocks.find((b) => b.id === textBlockId);
        if (block && block.type === 'text') block.text += chunk;
      }),
    }));
  };

  const modeMap: Record<string, PermissionMode> = {
    'Ask every time': 'ask',
    'Ask for risky actions only': 'risky',
    'Allow all in this project': 'allow-all',
    'Read-only': 'read-only',
  };
  const configured = get().settings.permissionMode;
  const permissionMode = modeMap[configured] ?? (configured as PermissionMode) ?? 'risky';

  try {
    await runLiveTurn({
      sessionId: sid,
      text,
      mode,
      lang: get().lang,
      permissionMode,
      signal: controller.signal,
      ask: async (req: AskRequest) => {
        if (!alive()) return 'deny';
        const perm: Permission = {
          id: uid(),
          action: `${req.tool} ${String(req.args.path ?? req.args.command ?? '')}`.trim(),
          command: typeof req.args.command === 'string' ? req.args.command : undefined,
          path: typeof req.args.path === 'string' ? req.args.path : undefined,
          risk: req.risk,
        };
        set((s) => ({
          sessions: patchTurn(s.sessions, sid, turnId, (t) => {
            t.permission = perm;
          }).map((x) => (x.id === sid ? { ...x, status: 'waiting' as const } : x)),
        }));
        const decision = await new Promise<'allow-once' | 'allow-always' | 'deny'>((resolve) =>
          permissionWaiters.set(perm.id, resolve),
        );
        return decision === 'deny' ? 'deny' : 'allow';
      },
      onEvent: (event) => {
        if (!alive()) return;
        if (event.type === 'text') {
          pushText(event.text);
        } else if (event.type === 'tool_start') {
          const id = uid();
          groupId = id;
          const kind: ToolKind = /write|edit/.test(event.name) ? 'edit' : 'read';
          const target = String(
            event.args.path ?? event.args.pattern ?? event.args.command ?? '',
          ).trim();
          set((s) => ({
            sessions: patchTurn(s.sessions, sid, turnId, (t) => {
              t.blocks.push({
                type: 'group',
                id,
                group: {
                  id,
                  done: false,
                  actions: [
                    { id: `${id}-0`, kind, label: event.name, value: target, status: 'running' },
                  ],
                },
              });
            }),
          }));
        } else if (event.type === 'tool_end') {
          set((s) => ({
            sessions: patchTurn(s.sessions, sid, turnId, (t) => {
              const block = t.blocks.find((b) => b.id === groupId);
              if (block && block.type === 'group') {
                const action = block.group.actions[block.group.actions.length - 1];
                if (action) action.status = 'done';
                block.group.done = true;
              }
            }),
          }));
        } else if (event.type === 'final') {
          set((s) => ({
            sessions: patchTurn(s.sessions, sid, turnId, (t) => {
              const last = t.blocks[t.blocks.length - 1];
              if (last && last.type === 'text') t.blocks = t.blocks.slice(0, -1);
              t.final = event.text;
              t.followUps = [];
            }).map((x) => (x.id === sid ? { ...x, status: 'idle' as const } : x)),
          }));
          textBlockId = null;
        } else if (event.type === 'notice') {
          get().toast(event.text);
        }
      },
    });
    if (!alive()) return;
    set((s) => ({
      sessions: patchTurn(s.sessions, sid, turnId, (t) => {
        t.running = false;
        t.collapsed = true;
        t.permission = undefined;
        t.durationMs = Date.now() - t.startedAt;
      }).map((x) => (x.id === sid ? { ...x, status: 'idle' as const } : x)),
    }));
  } catch (err) {
    if (!alive()) return;
    const code = err instanceof ProviderError ? err.code : 'network';
    const message = err instanceof Error ? err.message : String(err);
    const stopped = code === 'aborted';
    set((s) => ({
      sessions: patchTurn(s.sessions, sid, turnId, (t) => {
        t.running = false;
        t.collapsed = false;
        t.permission = undefined;
        t.durationMs = Date.now() - t.startedAt;
        t.error = {
          title: stopped ? 'Stopped' : 'Model error',
          message,
          details: ERROR_HINT[code],
        };
      }).map((x) => (x.id === sid ? { ...x, status: stopped ? ('idle' as const) : ('error' as const) } : x)),
    }));
  } finally {
    liveControllers.delete(turnId);
  }
}

export const getLastTurn = lastAssistant;
export const STAGE_ORDER: DiffLine['type'][] = ['ctx', 'add', 'del'];
export const changedFilesCount = (files: ChangedFile[]) => files.length;
