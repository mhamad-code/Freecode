export type ToolKind = 'think' | 'cmd' | 'read' | 'edit' | 'browser' | 'mcp' | 'skill' | 'git';
export type Mode = 'build' | 'plan' | 'mission' | 'skills';
export type Effort = 'low' | 'medium' | 'high';

export interface Action {
  id: string;
  kind: ToolKind;
  label: string;
  value: string;
  status: 'running' | 'done';
}

export interface Group {
  id: string;
  actions: Action[];
  done: boolean;
}

export type Block =
  | { type: 'text'; id: string; text: string }
  | { type: 'group'; id: string; group: Group };

export type Permission = {
  id: string;
  action: string;
  command?: string;
  path?: string;
  risk: 'low' | 'medium' | 'high';
  decision?: 'allow-once' | 'allow-always' | 'deny';
};

export interface AssistantTurn {
  id: string;
  blocks: Block[];
  final: string;
  followUps: string[];
  running: boolean;
  startedAt: number;
  durationMs?: number;
  stopped?: boolean;
  error?: { title: string; message: string; details: string; code?: 'no-model' };
  /** Persistent notice for this turn, e.g. a model that cannot use tools. */
  banner?: string;
  permission?: Permission;
  collapsed: boolean;
  checkpoint?: { id: string; label: string; files: number };
  /** Set when a failed turn left the project different from its checkpoint. */
  recovery?: { changed: number };
}

export type UserMessage = { id: string; role: 'user'; kind: 'user'; text: string; at: number };
export type AssistantMessage = { id: string; role: 'assistant'; kind: 'assistant'; turn: AssistantTurn };
export type Message = UserMessage | AssistantMessage;

export interface Session {
  id: string;
  title: string;
  project: string;
  messages: Message[];
  status: 'idle' | 'running' | 'waiting' | 'error';
  mode: Mode;
  draft: string;
  /** Messages typed while a turn is running, sent one per finished turn. */
  queued: string[];
  model: string;
  effort: Effort;
  updatedAt: number;
}

export type ToolTabKind =
  | 'launcher'
  | 'files'
  | 'browser'
  | 'terminal'
  | 'overview'
  | 'changes'
  | 'plan'
  | 'editor'
  | 'preview';

export interface ToolTab {
  id: string;
  kind: ToolTabKind;
  title: string;
  path?: string;
}

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'dir';
  children?: FileNode[];
  status?: 'M' | 'A' | 'D' | 'U' | null;
  active?: boolean;
}

export interface DiffLine {
  type: 'add' | 'del' | 'ctx';
  text: string;
  oldNo?: number;
  newNo?: number;
  strong?: [number, number][];
}

export interface Hunk {
  id: string;
  header: string;
  lines: DiffLine[];
  state: 'pending' | 'accepted' | 'rejected';
}

export interface ChangedFile {
  path: string;
  status: 'M' | 'A' | 'D' | 'R' | 'U';
  additions: number;
  deletions: number;
  staged: boolean;
  agent?: boolean;
  active?: boolean;
  hunks: Hunk[];
}

export interface Commit {
  hash: string;
  message: string;
  author: string;
  at: number;
}

export interface Branch {
  name: string;
  current?: boolean;
  ahead?: number;
  behind?: number;
}

export interface GitState {
  branch: string;
  ahead: number;
  behind: number;
  files: ChangedFile[];
  commits: Commit[];
  branches: Branch[];
}

export interface IntegrationAccount {
  id: string;
  name: string;
  connectedAt: string;
  status: 'ok' | 'reauth' | 'error';
}

export interface Integration {
  id: string;
  name: string;
  category: 'connected' | 'popular';
  monogram: string;
  color: string;
  accounts: IntegrationAccount[];
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  scope: 'global' | 'project';
  used: number;
}

export interface McpTool {
  name: string;
  enabled: boolean;
}

export interface McpServer {
  id: string;
  name: string;
  transport: 'stdio' | 'HTTP' | 'SSE';
  status: 'connected' | 'connecting' | 'error' | 'disabled';
  tools: McpTool[];
  command: string;
  policy: 'ask' | 'auto' | 'block';
}

export interface HeatCell {
  date: string;
  minutes: number;
}

export interface UsageReport {
  messages: number;
  tokens: string;
  input: string;
  output: string;
  cached: string;
  bars: number[];
  streak: { current: number; longest: number; active: number };
  heat: HeatCell[];
}

export interface SiteTemplate {
  id: string;
  name: string;
  description: string;
  kind: string;
  featured?: boolean;
  gradient: string;
  art: 'game' | 'terminal' | 'dashboard' | 'store' | 'portfolio' | 'docs';
}

export interface ToastItem {
  id: string;
  text: string;
  action?: string;
  onAction?: () => void;
}
