export type Protocol = 'openai-compatible' | 'anthropic';
export type ProviderKind = 'builtin-free' | 'preset' | 'custom';
export type Src = 'provider' | 'inferred' | 'tested' | 'user';
export type CorsStatus = 'unknown' | 'ok' | 'blocked';

export interface ModelInfo {
  id: string;
  label: string;
  contextWindow?: number;
  maxOutput?: number;
  free?: boolean;
  tools: boolean | 'unknown';
  reasoning: boolean | 'unknown';
  vision: boolean | 'unknown';
  reasoningLevels?: string[];
  pricing?: { in?: number; out?: number; cacheRead?: number };
  provenance: { tools: Src; reasoning: Src; vision: Src };
  hidden?: boolean;
  custom?: boolean;
  retired?: boolean;
}

export interface ProviderAuth {
  type: 'none' | 'bearer' | 'header';
  headerName?: string;
  anonymousToken?: string;
}

export interface ProviderKeyRef {
  id: string;
  label: string;
  enabled: boolean;
  cooldownUntil?: number;
}

export interface ProviderHeaderRef {
  name: string;
  enabled: boolean;
}

export interface CatalogConfig {
  path: string;
  parser: 'openai' | 'openrouter' | 'kilo';
  freeFilter?: 'suffix:free' | 'pricing-zero' | 'none';
}

export interface ProviderQuirks {
  supportsStreamUsage: boolean;
  supportsParallelTools: boolean;
  strictTemplates: boolean;
  extraBody?: Record<string, unknown>;
}

export interface ProviderConfig {
  id: string;
  label: string;
  kind: ProviderKind;
  protocol: Protocol;
  baseUrl: string;
  enabled: boolean;
  order: number;
  auth: ProviderAuth;
  keys: ProviderKeyRef[];
  headers: ProviderHeaderRef[];
  catalog: CatalogConfig;
  limits?: { perHour?: number; perMinute?: number; note?: string };
  quirks: ProviderQuirks;
  proxyUrl?: string;
  corsStatus: CorsStatus;
  models: ModelInfo[];
  lastCatalogAt?: number;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface ToolSpec {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ChatMessage {
  role: MessageRole;
  text?: string;
  images?: string[];
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

export interface Usage {
  inTok: number;
  outTok: number;
  cacheTok?: number;
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  tools?: ToolSpec[];
  toolChoice?: 'auto' | 'none';
  reasoningEffort?: 'low' | 'medium' | 'high';
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

export type Delta =
  | { type: 'text'; text: string }
  | { type: 'thinking'; text: string };

export interface ModelResult {
  text: string;
  thinking: string;
  toolCalls: ToolCall[];
  usage?: Usage;
  finishReason?: string;
  endedEarly?: boolean;
}

export const emptyResult = (): ModelResult => ({ text: '', thinking: '', toolCalls: [] });
