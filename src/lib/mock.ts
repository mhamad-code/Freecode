import type {
  Branch,
  ChangedFile,
  Commit,
  FileNode,
  Integration,
  McpServer,
  Session,
  SiteTemplate,
  Skill,
  UsageReport,
} from './types';

export const uid = () => Math.random().toString(36).slice(2, 10);

/* ------------------------------ files ------------------------------ */
const f = (path: string, status: FileNode['status'] = null): FileNode => ({
  name: path.split('/').pop()!,
  path,
  type: 'file',
  status,
});
const d = (path: string, children: FileNode[]): FileNode => ({
  name: path.split('/').pop()!,
  path,
  type: 'dir',
  children,
});

export const FILE_TREE: FileNode[] = [
  d('.sdk', [f('.sdk/runtime.ts'), f('.sdk/manifest.json')]),
  d('.tools', [f('.tools/release.mjs')]),
  d('.verify', [f('.verify/last-run.json')]),
  d('src', [
    d('src/components', [f('src/components/Button.tsx', 'M'), f('src/components/Shell.tsx', 'M')]),
    d('src/lib', [f('src/lib/api.ts'), f('src/lib/format.ts', 'A')]),
    d('src/routes', [f('src/routes/chat.tsx', 'M'), f('src/routes/cli.tsx', 'M'), f('src/routes/index.tsx')]),
    f('src/main.tsx'),
    f('src/styles.css', 'M'),
  ]),
  d('public', [f('public/favicon.svg'), f('public/logo.png')]),
  f('AndroidHarness.java', 'U'),
  f('index.html', 'M'),
  f('package.json'),
  f('rename_package.sh'),
  f('signing.jks', 'U'),
  f('UNCHANGED_NAME_OCCURRENCES.txt', 'U'),
  f('vite.config.ts', 'M'),
  f('VEXORA-artifacts.zip', 'U'),
];

export const FILE_CONTENTS: Record<string, string> = {
  'src/routes/chat.tsx': `import { useState } from 'react';
import { sendMessage } from '../lib/api';

export default function Chat() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<string[]>([]);

  const submit = async () => {
    if (!input.trim()) return;
    setMessages((m) => [...m, input]);
    const reply = await sendMessage(input);
    setMessages((m) => [...m, reply]);
    setInput('');
  };

  return (
    <main className="chat">
      <ul>
        {messages.map((m, i) => (
          <li key={i}>{m}</li>
        ))}
      </ul>
      <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} />
        <button>Send</button>
      </form>
    </main>
  );
}
`,
  'src/routes/cli.tsx': `import { useEffect, useRef } from 'react';
import { streamCommand } from '../lib/api';

export default function Cli() {
  const out = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const stop = streamCommand('status', (chunk) => {
      if (out.current) out.current.textContent += chunk;
    });
    return stop;
  }, []);

  return <pre ref={out} className="cli" />;
}
`,
  'vite.config.ts': `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        chat: resolve(__dirname, 'chat.html'),
        cli: resolve(__dirname, 'cli.html'),
      },
    },
  },
});
`,
  'package.json': `{
  "name": "freecode-demo",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  }
}
`,
};

/* ------------------------------ git ------------------------------ */
const hunk = (id: string, header: string, lines: ChangedFile['hunks'][number]['lines']) => ({
  id,
  header,
  lines,
  state: 'pending' as const,
});

export const GIT_FILES: ChangedFile[] = [
  {
    path: 'vite.config.ts',
    status: 'M',
    additions: 12,
    deletions: 2,
    staged: true,
    agent: true,
    hunks: [
      hunk('h1', '@@ -1,7 +1,17 @@', [
        { type: 'ctx', text: "import { defineConfig } from 'vite';", oldNo: 1, newNo: 1 },
        { type: 'ctx', text: "import react from '@vitejs/plugin-react';", oldNo: 2, newNo: 2 },
        { type: 'add', text: "import { resolve } from 'node:path';", newNo: 3 },
        { type: 'ctx', text: '', oldNo: 3, newNo: 4 },
        { type: 'ctx', text: 'export default defineConfig({', oldNo: 4, newNo: 5 },
        { type: 'ctx', text: '  plugins: [react()],', oldNo: 5, newNo: 6 },
        { type: 'del', text: '  build: { outDir: "dist" },', oldNo: 6 },
        { type: 'add', text: '  build: {', newNo: 7 },
        { type: 'add', text: '    rollupOptions: {', newNo: 8 },
        { type: 'add', text: '      input: {', newNo: 9 },
        { type: 'add', text: "        chat: resolve(__dirname, 'chat.html'),", newNo: 10, strong: [[26, 30]] },
        { type: 'add', text: "        cli: resolve(__dirname, 'cli.html'),", newNo: 11 },
        { type: 'add', text: '      },', newNo: 12 },
        { type: 'add', text: '    },', newNo: 13 },
        { type: 'add', text: '  },', newNo: 14 },
        { type: 'ctx', text: '});', oldNo: 7, newNo: 15 },
      ]),
    ],
  },
  {
    path: 'src/routes/chat.tsx',
    status: 'M',
    additions: 48,
    deletions: 9,
    staged: true,
    agent: true,
    hunks: [
      hunk('h2', '@@ -8,12 +8,26 @@ export default function Chat() {', [
        { type: 'ctx', text: 'const [input, setInput] = useState("");', oldNo: 8, newNo: 8 },
        { type: 'del', text: 'const [messages, setMessages] = useState<string[]>([]);', oldNo: 9 },
        { type: 'add', text: 'const [messages, setMessages] = useState<Message[]>([]);', newNo: 9, strong: [[45, 52]] },
        { type: 'add', text: 'const [busy, setBusy] = useState(false);', newNo: 10 },
        { type: 'ctx', text: '', oldNo: 10, newNo: 11 },
        { type: 'add', text: 'const submit = async () => {', newNo: 12 },
        { type: 'add', text: '  setBusy(true);', newNo: 13 },
        { type: 'add', text: '  const reply = await sendMessage(input);', newNo: 14 },
        { type: 'add', text: '  setMessages((m) => [...m, reply]);', newNo: 15 },
        { type: 'add', text: '  setBusy(false);', newNo: 16 },
        { type: 'add', text: '};', newNo: 17 },
      ]),
    ],
  },
  {
    path: 'src/routes/cli.tsx',
    status: 'A',
    additions: 36,
    deletions: 0,
    staged: false,
    agent: true,
    hunks: [
      hunk('h3', '@@ -0,0 +1,20 @@', [
        { type: 'add', text: "import { useEffect, useRef } from 'react';", newNo: 1 },
        { type: 'add', text: '', newNo: 2 },
        { type: 'add', text: 'export default function Cli() {', newNo: 3 },
        { type: 'add', text: '  const out = useRef<HTMLPreElement>(null);', newNo: 4 },
        { type: 'add', text: '', newNo: 5 },
        { type: 'add', text: '  useEffect(() => {', newNo: 6 },
        { type: 'add', text: "    const stop = streamCommand('status', (chunk) => {", newNo: 7 },
        { type: 'add', text: '      if (out.current) out.current.textContent += chunk;', newNo: 8 },
        { type: 'add', text: '    });', newNo: 9 },
        { type: 'add', text: '    return stop;', newNo: 10 },
        { type: 'add', text: '  }, []);', newNo: 11 },
        { type: 'add', text: '', newNo: 12 },
        { type: 'add', text: '  return <pre ref={out} className="cli" />;', newNo: 13 },
        { type: 'add', text: '}', newNo: 14 },
      ]),
    ],
  },
  {
    path: 'src/styles.css',
    status: 'M',
    additions: 24,
    deletions: 6,
    staged: false,
    agent: true,
    hunks: [
      hunk('h4', '@@ -14,8 +14,20 @@', [
        { type: 'ctx', text: '.chat { display: flex; flex-direction: column; }', oldNo: 14, newNo: 14 },
        { type: 'del', text: '.chat ul { margin: 0; padding: 0; }', oldNo: 15 },
        { type: 'add', text: '.chat ul { margin: 0; padding: 0 0 12px; }', newNo: 15 },
        { type: 'add', text: '.chat li { padding: 6px 0; }', newNo: 16 },
        { type: 'add', text: '.cli { min-height: 240px; }', newNo: 17 },
        { type: 'add', text: '@media (max-width: 640px) {', newNo: 18 },
        { type: 'add', text: '  .chat { padding: 12px; }', newNo: 19 },
        { type: 'add', text: '}', newNo: 20 },
      ]),
    ],
  },
  {
    path: 'index.html',
    status: 'M',
    additions: 4,
    deletions: 1,
    staged: false,
    hunks: [
      hunk('h5', '@@ -10,5 +10,8 @@', [
        { type: 'ctx', text: '  <body>', oldNo: 10, newNo: 10 },
        { type: 'del', text: '    <div id="root"></div>', oldNo: 11 },
        { type: 'add', text: '    <div id="app"></div>', newNo: 11, strong: [[13, 18]] },
        { type: 'add', text: '    <a href="/chat.html">Chat</a>', newNo: 12 },
        { type: 'add', text: '    <a href="/cli.html">CLI</a>', newNo: 13 },
        { type: 'ctx', text: '  </body>', oldNo: 12, newNo: 14 },
      ]),
    ],
  },
  {
    path: 'src/components/Button.tsx',
    status: 'M',
    additions: 8,
    deletions: 4,
    staged: false,
    hunks: [
      hunk('h6', '@@ -3,8 +3,12 @@', [
        { type: 'ctx', text: 'export function Button(props: Props) {', oldNo: 3, newNo: 3 },
        { type: 'del', text: '  return <button {...props} />;', oldNo: 4 },
        { type: 'add', text: '  return (', newNo: 4 },
        { type: 'add', text: '    <button', newNo: 5 },
        { type: 'add', text: '      type="button"', newNo: 6 },
        { type: 'add', text: '      {...props}', newNo: 7 },
        { type: 'add', text: '    />', newNo: 8 },
        { type: 'add', text: '  );', newNo: 9 },
        { type: 'ctx', text: '}', oldNo: 5, newNo: 10 },
      ]),
    ],
  },
  {
    path: 'src/lib/format.ts',
    status: 'A',
    additions: 18,
    deletions: 0,
    staged: false,
    hunks: [
      hunk('h7', '@@ -0,0 +1,9 @@', [
        { type: 'add', text: 'export const fmtDuration = (s: number) => {', newNo: 1 },
        { type: 'add', text: '  const m = Math.floor(s / 60);', newNo: 2 },
        { type: 'add', text: '  const r = s % 60;', newNo: 3 },
        { type: 'add', text: '  return m ? `${m}m ${r}s` : `${r}s`;', newNo: 4 },
        { type: 'add', text: '};', newNo: 5 },
      ]),
    ],
  },
];

export const COMMITS: Commit[] = [
  { hash: 'a0765d8', message: 'Add multi-page Vite config for chat and CLI', author: 'Mohammed', at: Date.now() - 3200_000 },
  { hash: 'c41b9e2', message: 'Stream terminal output in the CLI route', author: 'Mohammed', at: Date.now() - 86_400_000 },
  { hash: '9d2f0aa', message: 'Extract chat composer from the landing page', author: 'Mohammed', at: Date.now() - 172_800_000 },
  { hash: '4b7c113', message: 'Update theme tokens for the new panel surface', author: 'Agent', at: Date.now() - 259_200_000 },
  { hash: 'e10dc47', message: 'Initial commit', author: 'Mohammed', at: Date.now() - 604_800_000 },
];

export const BRANCHES: Branch[] = [
  { name: 'main', current: true, ahead: 2, behind: 0 },
  { name: 'feature/activity-ui', ahead: 0, behind: 0 },
  { name: 'feature/review-and-device-control', ahead: 1, behind: 3 },
  { name: 'self-dev/welcome-alert-mohammed-hamra', ahead: 0, behind: 0 },
];

/* ------------------------------ agent demo ------------------------------ */
const g = (id: string, actions: [string, string, string][], done = true) => ({
  type: 'group' as const,
  id,
  group: {
    id,
    done,
    actions: actions.map(([kind, label, value], i) => ({
      id: `${id}-${i}`,
      kind: kind as never,
      label,
      value,
      status: 'done' as const,
    })),
  },
});

export const DEMO_ASSISTANT = {
  id: 'turn-demo-1',
  role: 'assistant' as const,
  kind: 'assistant' as const,
  turn: {
    id: 'turn-demo-1',
    blocks: [
      g('g1', [['think', 'Thought', 'for 4s'], ['cmd', 'Ran', 'ls src']]),
      { type: 'text' as const, id: 't1', text: 'Two routes: `/chat` (AI chat) and `/cli` (coding in your terminal). Let me inspect both.' },
      g('g2', [
        ['browser', 'Opened', 'localhost:5173/chat'],
        ['cmd', 'Ran', 'npm run build'],
        ['cmd', 'Ran', 'git status --short'],
        ['read', 'Read', 'src/routes/chat.tsx'],
      ]),
      g('g3', [
        ['read', 'Read', 'src/routes/cli.tsx'],
        ['read', 'Read', 'vite.config.ts'],
        ['cmd', 'Ran', 'npx vite build'],
        ['cmd', 'Ran', 'grep -rn "route" src'],
        ['browser', 'Opened', 'localhost:5173/cli'],
      ]),
      g('g4', [
        ['think', 'Thought', 'for 7s'],
        ['browser', 'Clicked', 'Send'],
        ['cmd', 'Ran', 'npm run build'],
        ['cmd', 'Ran', 'ls src'],
        ['read', 'Read', 'package.json'],
      ]),
      g('g5', [['browser', 'Screenshot', 'viewport 390x844'], ['cmd', 'Ran', 'git status --short']]),
      { type: 'text' as const, id: 't2', text: "Now I'll build both pages: multi-page Vite config, then the chat and CLI routes." },
      g('g6', [['edit', 'Edited', 'vite.config.ts'], ['edit', 'Edited', 'src/routes/chat.tsx'], ['cmd', 'Ran', 'npm run build']]),
      g('g7', [
        ['think', 'Thought', 'for 4s'],
        ['edit', 'Edited', 'src/routes/cli.tsx'],
        ['cmd', 'Ran', 'npx vite build'],
        ['cmd', 'Ran', 'git status --short'],
        ['browser', 'Opened', 'localhost:5173/cli'],
      ]),
      g('g8', [
        ['read', 'Read', 'src/styles.css'],
        ['read', 'Read', 'index.html'],
        ['edit', 'Edited', 'index.html'],
        ['edit', 'Edited', 'src/styles.css'],
        ['cmd', 'Ran', 'npm run build'],
        ['cmd', 'Ran', 'ls src'],
      ]),
      g('g9', [
        ['think', 'Thought', 'for 7s'],
        ['cmd', 'Ran', 'npm run build'],
        ['browser', 'Opened', 'localhost:5173/chat'],
        ['read', 'Read', 'src/lib/api.ts'],
        ['read', 'Read', 'src/lib/format.ts'],
      ]),
      g('g10', [
        ['edit', 'Edited', 'src/components/Button.tsx'],
        ['edit', 'Edited', 'src/components/Shell.tsx'],
        ['browser', 'Clicked', 'Send'],
        ['read', 'Read', 'package.json'],
        ['read', 'Read', 'vite.config.ts'],
      ]),
      g('g11', [
        ['cmd', 'Ran', 'git status --short'],
        ['cmd', 'Ran', 'git diff --stat'],
        ['read', 'Read', 'src/routes/chat.tsx'],
        ['read', 'Read', 'src/routes/cli.tsx'],
        ['browser', 'Screenshot', 'viewport 390x844'],
      ]),
    ],
    final:
      'Both routes are built: `/chat` for the AI chat and `/cli` for the terminal. The build passes and the dev server is running.',
    followUps: ['Verify main builds', 'Debug project error', 'Brainstorm follow-ups'],
    running: false,
    startedAt: Date.now() - 1_073_000,
    durationMs: 1_073_000,
    collapsed: false,
    checkpoint: { id: 'cp-1', label: 'Before multi-page build', files: 7 },
  },
};

const arabicTurn = {
  id: 'turn-demo-2',
  role: 'assistant' as const,
  kind: 'assistant' as const,
  turn: {
    id: 'turn-demo-2',
    blocks: [
      g('ag1', [['think', 'Thought', 'for 6s'], ['git', 'Ran', 'git branch -a']]),
      g('ag2', [['cmd', 'Ran', 'git branch -D feature/activity-ui'], ['cmd', 'Ran', 'git branch -D feature/review-and-device-control']]),
      {
        type: 'text' as const,
        id: 'at1',
        text: 'تم حذف فروع التعديلات، مع إبقاء `main` كما هو دون أي دمج:',
      },
    ],
    final:
      'تم حذف فروع التعديلات، مع إبقاء `main` كما هو دون أي دمج:\n\n- `feature/activity-ui`\n- `feature/review-and-device-control`\n- `self-dev/welcome-alert-mohammed-hamra`\n\nالفروع المتبقية الآن: `main` و`upstream/main` فقط (محلياً وبعيداً).',
    followUps: ['تأكد أن main يبني بنجاح', 'اعرض سجل الفروع', 'أنشئ فرعاً جديداً'],
    running: false,
    startedAt: Date.now() - 209_000,
    durationMs: 209_000,
    collapsed: true,
  },
};

export const seedSessions = (): Session[] => [
  {
    id: 's1',
    title: 'Clone Website Request',
    project: 'VEXORA Complete',
    status: 'idle',
    mode: 'build',
    draft: '',
    model: 'DeepSeek V4.1 Flash',
    effort: 'high',
    updatedAt: Date.now() - 60_000,
    messages: [
      {
        id: 'm0',
        role: 'user',
        kind: 'user',
        at: Date.now() - 1_200_000,
        text: 'I added a new page and want you to look at it with fresh eyes and simplify it, then add the typing animation on the /cli side like the original site.',
      },
      DEMO_ASSISTANT as never,
    ],
  },
  {
    id: 's2',
    title: 'حذف فروع التعديلات',
    project: 'VEXORA Complete',
    status: 'idle',
    mode: 'build',
    draft: '',
    model: 'DeepSeek V4.1 Flash',
    effort: 'high',
    updatedAt: Date.now() - 600_000,
    messages: [
      {
        id: 'm1',
        role: 'user',
        kind: 'user',
        at: Date.now() - 900_000,
        text: 'راجع التعديل الذي أضفته بعين جديدة وبسّط ما يمكن تبسيطه، ثم أضف أيمن الكتابة التدريجية لطرفية /cli كما في الموقع الأصلي.',
      },
      arabicTurn as never,
    ],
  },
  {
    id: 's3',
    title: 'New chat',
    project: 'VEXORA Complete',
    status: 'idle',
    mode: 'build',
    draft: '',
    model: 'DeepSeek V4.1 Flash',
    effort: 'high',
    updatedAt: Date.now() - 900_000,
    messages: [],
  },
];

/* ------------------------------ other data ------------------------------ */
export const INTEGRATIONS: Integration[] = [
  {
    id: 'figma',
    name: 'Figma',
    category: 'connected',
    monogram: 'F',
    color: '#a259ff',
    accounts: [{ id: 'figma-1', name: 'Figma account', connectedAt: '2026-11-18', status: 'ok' }],
  },
  { id: 'gmail', name: 'Gmail', category: 'popular', monogram: 'M', color: '#ea4335', accounts: [] },
  { id: 'gcal', name: 'Google Calendar', category: 'popular', monogram: '31', color: '#4285f4', accounts: [] },
  { id: 'gdrive', name: 'Google Drive', category: 'popular', monogram: '▲', color: '#0f9d58', accounts: [] },
  { id: 'slack', name: 'Slack', category: 'popular', monogram: '#', color: '#4a154b', accounts: [] },
  { id: 'notion', name: 'Notion', category: 'popular', monogram: 'N', color: '#111111', accounts: [] },
  { id: 'linear', name: 'Linear', category: 'popular', monogram: 'L', color: '#5e6ad2', accounts: [] },
  { id: 'posthog', name: 'PostHog', category: 'popular', monogram: 'P', color: '#f54e00', accounts: [] },
  { id: 'sentry', name: 'Sentry', category: 'popular', monogram: 'S', color: '#362d59', accounts: [] },
  { id: 'github', name: 'GitHub', category: 'popular', monogram: 'G', color: '#24292f', accounts: [] },
  { id: 'supabase', name: 'Supabase', category: 'popular', monogram: 'Sb', color: '#3ecf8e', accounts: [] },
  { id: 'vercel', name: 'Vercel', category: 'popular', monogram: 'V', color: '#000000', accounts: [] },
  { id: 'stripe', name: 'Stripe', category: 'popular', monogram: 'st', color: '#635bff', accounts: [] },
  { id: 'jira', name: 'Jira', category: 'popular', monogram: 'J', color: '#0052cc', accounts: [] },
  { id: 'asana', name: 'Asana', category: 'popular', monogram: 'A', color: '#f06a6a', accounts: [] },
  { id: 'zapier', name: 'Zapier', category: 'popular', monogram: 'Z', color: '#ff4f00', accounts: [] },
];

export const SKILLS: Skill[] = [
  { id: 'web-design-guidelines', name: 'web-design-guidelines', description: 'Review UI code for Web Interface Guidelines compliance, accessibility, and UX best practices.', enabled: true, scope: 'global', used: 12 },
  { id: 'ai-video-generation', name: 'ai-video-generation', description: 'Generate AI videos with Veo, Seedance, Wan and 40+ models. Text-to-video, image-to-video and lipsync.', enabled: true, scope: 'global', used: 3 },
  { id: 'canvas-design', name: 'canvas-design', description: 'Create visual art in PNG and PDF documents using design philosophy.', enabled: true, scope: 'global', used: 7 },
  { id: 'frontend-design', name: 'frontend-design', description: 'Guidance for distinctive, intentional visual design when building new UI.', enabled: true, scope: 'project', used: 21 },
  { id: 'pdf', name: 'pdf', description: 'Read, split, merge and fill PDF documents from the workspace.', enabled: false, scope: 'global', used: 1 },
  { id: 'docx', name: 'docx', description: 'Create and edit Word documents with templates and tracked changes.', enabled: false, scope: 'global', used: 0 },
];

export const MCP_SERVERS: McpServer[] = [
  {
    id: 'fs',
    name: 'Filesystem',
    transport: 'stdio',
    status: 'connected',
    command: 'npx -y @modelcontextprotocol/server-filesystem ~/project',
    policy: 'ask',
    tools: [
      { name: 'read_file', enabled: true },
      { name: 'write_file', enabled: true },
      { name: 'list_directory', enabled: true },
    ],
  },
  {
    id: 'gh',
    name: 'GitHub',
    transport: 'HTTP',
    status: 'error',
    command: 'https://api.githubcopilot.com/mcp/',
    policy: 'ask',
    tools: [
      { name: 'search_repositories', enabled: true },
      { name: 'create_issue', enabled: false },
    ],
  },
  {
    id: 'pw',
    name: 'Playwright',
    transport: 'stdio',
    status: 'connected',
    command: 'npx -y @playwright/mcp@latest',
    policy: 'auto',
    tools: [
      { name: 'browser_navigate', enabled: true },
      { name: 'browser_snapshot', enabled: true },
    ],
  },
];

export const USAGE: UsageReport = {
  messages: 140,
  tokens: '24.7M',
  input: '24.4M',
  output: '118k',
  cached: '12.1M',
  bars: [8, 14, 6, 22, 17, 4, 11],
  streak: { current: 2, longest: 2, active: 2 },
  heat: Array.from({ length: 161 }, (_, i) => {
    const day = new Date(2026, 10, 18);
    day.setDate(day.getDate() - (160 - i));
    const minutes = i === 152 ? 42 : i === 158 ? 18 : i === 159 ? 7 : 0;
    return { date: day.toISOString().slice(0, 10), minutes };
  }),
};

export const TEMPLATES: SiteTemplate[] = [
  {
    id: 'crosscut',
    name: 'Crosscut',
    description: 'A solo voxel shooter with five bots, rifle spray, fast knife movement and bunny hopping. Runs on Freecode Sites.',
    kind: 'games',
    featured: true,
    gradient: 'linear-gradient(160deg,#2c3b3a 0%,#48504a 55%,#b9a48b 100%)',
    art: 'game',
  },
  {
    id: 'phosphor',
    name: 'Phosphor',
    description: 'A retro terminal landing page for a developer tool. Amber CRT palette, keyboard-first copy, zero images.',
    kind: 'landing',
    gradient: 'linear-gradient(160deg,#1a1004 0%,#3a2406 55%,#a4651a 100%)',
    art: 'terminal',
  },
  {
    id: 'atlas',
    name: 'Atlas',
    description: 'A dense analytics dashboard with sidebar navigation, charts and a compact table view.',
    kind: 'dashboards',
    gradient: 'linear-gradient(160deg,#0d1b2a 0%,#1b3a52 60%,#3f7f9a 100%)',
    art: 'dashboard',
  },
  {
    id: 'bloom',
    name: 'Bloom',
    description: 'A calm storefront for small-batch ceramics, with a product grid and a slide-over cart.',
    kind: 'stores',
    gradient: 'linear-gradient(160deg,#f6ece2 0%,#e7cdbb 55%,#c98d72 100%)',
    art: 'store',
  },
  {
    id: 'folio',
    name: 'Folio',
    description: 'A typographic portfolio for a designer, with case studies, a CV page and a contact form.',
    kind: 'portfolios',
    gradient: 'linear-gradient(160deg,#f2f2ee 0%,#dedcd2 55%,#8a8a7e 100%)',
    art: 'portfolio',
  },
  {
    id: 'docsy',
    name: 'Docsy',
    description: 'A documentation site with a searchable sidebar, API reference pages and dark code blocks.',
    kind: 'docs',
    gradient: 'linear-gradient(160deg,#101418 0%,#202a33 60%,#3d5666 100%)',
    art: 'docs',
  },
];
