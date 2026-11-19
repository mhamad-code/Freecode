export type ErrorCode =
  | 'auth'
  | 'quota'
  | 'rate'
  | 'model-not-found'
  | 'context-length'
  | 'content-filter'
  | 'network'
  | 'cors'
  | 'timeout'
  | 'server'
  | 'stream'
  | 'unsupported-tools'
  | 'bad-request'
  | 'aborted';

export class ProviderError extends Error {
  readonly code: ErrorCode;
  readonly status?: number;
  readonly retryAfterMs?: number;
  readonly providerMessage?: string;

  constructor(
    code: ErrorCode,
    message: string,
    opts: { status?: number; retryAfterMs?: number; providerMessage?: string } = {},
  ) {
    super(message);
    this.name = 'ProviderError';
    this.code = code;
    this.status = opts.status;
    this.retryAfterMs = opts.retryAfterMs;
    this.providerMessage = opts.providerMessage;
  }
}

const RETRY_AFTER = /retry[-_ ]after["'\s:]*([0-9]{1,5})/i;

export function parseRetryAfter(value: string | null | undefined): number | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed) * 1000;
  const seconds = trimmed.match(RETRY_AFTER);
  if (seconds) return Number(seconds[1]) * 1000;
  return undefined;
}

export function classifyStatus(status: number): ErrorCode {
  if (status === 401 || status === 403) return 'auth';
  if (status === 402) return 'quota';
  if (status === 429) return 'rate';
  if (status === 404) return 'model-not-found';
  if (status === 408) return 'timeout';
  if (status === 400 || status === 422) return 'bad-request';
  if (status === 413) return 'context-length';
  if (status >= 500) return 'server';
  return 'bad-request';
}

export function statusToError(
  status: number,
  body: string,
  headers?: Headers,
): ProviderError {
  const code = classifyStatus(status);
  const lower = body.toLowerCase();
  let finalCode = code;
  if (code === 'bad-request') {
    if (/(context|too many tokens|maximum context)/.test(lower)) finalCode = 'context-length';
    else if (/(tool|function)/.test(lower)) finalCode = 'unsupported-tools';
    else if (/(content|safety|policy)/.test(lower)) finalCode = 'content-filter';
    else if (/(model|not found|does not exist)/.test(lower)) finalCode = 'model-not-found';
  }
  const retryAfterMs = parseRetryAfter(
    headers?.get('retry-after') ?? headers?.get('x-ratelimit-reset'),
  );
  const providerMessage = body.slice(0, 600);
  return new ProviderError(finalCode, `HTTP ${status}`, {
    status,
    retryAfterMs,
    providerMessage,
  });
}

export function networkError(err: unknown, online: boolean): ProviderError {
  if (err instanceof ProviderError) return err;
  if (err instanceof DOMException && err.name === 'AbortError') {
    return new ProviderError('aborted', 'Request aborted');
  }
  if (!online) {
    return new ProviderError('network', 'You are offline');
  }
  const message = err instanceof Error ? err.message : String(err);
  const cors = /failed to fetch|networkerror|load failed/i.test(message);
  return new ProviderError(cors ? 'cors' : 'network', message);
}

export function isRetriable(code: ErrorCode): boolean {
  return code === 'rate' || code === 'server' || code === 'network' || code === 'timeout';
}

export const ERROR_HINT: Record<ErrorCode, string> = {
  auth: 'The key was rejected. Check it in provider settings.',
  quota: 'The provider reports no remaining quota. Add a key or switch providers.',
  rate: 'Rate limited. Wait a moment or switch providers.',
  'model-not-found': 'That model is not available. Refresh the model list.',
  'context-length': 'The conversation is too long for this model. Compact it.',
  'content-filter': 'The provider blocked this content.',
  network: 'Network request failed. Check your connection.',
  cors: 'The service does not allow browser requests.',
  timeout: 'The provider did not respond in time.',
  server: 'The provider had a server error. Try again.',
  stream: 'The stream ended unexpectedly. You can continue the reply.',
  'unsupported-tools': 'This model does not support tool calls.',
  'bad-request': 'The provider rejected the request.',
  aborted: 'Stopped.',
};
