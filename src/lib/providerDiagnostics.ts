import type { ProviderConfig } from '../engine/providers/types';

export type DiagnosticKind =
  | 'ok'
  | 'cors'
  | 'network'
  | 'auth'
  | 'rate'
  | 'server'
  | 'http'
  | 'timeout'
  | 'failed'
  | 'needs-key';

export interface Diagnostic {
  kind: DiagnosticKind;
  status?: number;
  retryAfterMs?: number;
  at: number;
  url: string;
  detail?: string;
}

export interface DiagnoseDeps {
  fetchImpl?: typeof fetch;
  now?: () => number;
  online?: boolean;
}

export function parseRetryAfterHeader(headers: Headers): number | undefined {
  const value = headers.get('retry-after') ?? headers.get('x-ratelimit-reset');
  if (!value) return undefined;
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed) * 1000;
  const date = Date.parse(trimmed);
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
  return undefined;
}

export function classifyStatusKind(status: number): DiagnosticKind {
  if (status === 401 || status === 403) return 'auth';
  if (status === 429) return 'rate';
  if (status >= 500) return 'server';
  if (status >= 400) return 'http';
  return 'ok';
}

/**
 * Distinguishes the real cause behind "Failed to fetch":
 * - a plain CORS fetch fails, then `mode: "no-cors"` succeeds → the service is
 *   reachable and only browser CORS blocks it;
 * - both fail → DNS/network/VPN failure.
 */
export async function diagnoseEndpoint(
  url: string,
  deps: DiagnoseDeps = {},
): Promise<Diagnostic> {
  const fetchImpl = deps.fetchImpl ?? ((...args) => fetch(...args));
  const now = deps.now ?? (() => Date.now());
  const at = now();
  try {
    const res = await fetchImpl(url, { method: 'GET', cache: 'no-store' });
    const kind = classifyStatusKind(res.status);
    return {
      kind,
      status: res.status,
      retryAfterMs: parseRetryAfterHeader(res.headers),
      at,
      url,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (deps.online === false) {
      return { kind: 'network', at, url, detail: 'offline' };
    }
    if (/abort/i.test(message)) {
      return { kind: 'timeout', at, url, detail: message };
    }
    try {
      await fetchImpl(url, { method: 'GET', mode: 'no-cors', cache: 'no-store' });
      return { kind: 'cors', at, url, detail: message };
    } catch {
      return { kind: 'network', at, url, detail: message };
    }
  }
}

export function catalogUrl(provider: ProviderConfig): string {
  if (!provider.catalog.path) return provider.baseUrl;
  return `${provider.baseUrl.replace(/\/$/, '')}/${provider.catalog.path.replace(/^\//, '')}`;
}

/** Exponential cooldown after repeated failures; Retry-After always wins. */
export function cooldownFor(failures: number, retryAfterMs?: number, now = Date.now()): number | undefined {
  if (retryAfterMs && retryAfterMs > 0) return now + retryAfterMs;
  if (failures < 2) return undefined;
  return now + Math.min(15 * 60_000, 30_000 * 2 ** (failures - 2));
}

/** Redacted report for "Copy diagnostics": no keys, no query strings, no headers. */
export function diagnosticsReport(provider: ProviderConfig, diag?: Diagnostic): string {
  const url = (diag?.url ?? catalogUrl(provider)).split('?')[0];
  const ua = typeof navigator === 'undefined' ? 'n/a' : navigator.userAgent;
  const online = typeof navigator === 'undefined' ? 'n/a' : String(navigator.onLine);
  const last = provider.lastDiagnostic;
  const lines = [
    'Freecode provider diagnostics',
    `provider: ${provider.id} (${provider.label})`,
    `kind: ${provider.kind}`,
    `protocol: ${provider.protocol}`,
    `url: ${url}`,
    `models: ${provider.models.length}`,
    `cors: ${provider.corsStatus}`,
    `result: ${diag?.kind ?? last?.kind ?? 'unknown'}`,
    `status: ${String(diag?.status ?? last?.status ?? 'n/a')}`,
    `retryAfterMs: ${String(diag?.retryAfterMs ?? last?.retryAfterMs ?? 'n/a')}`,
    `checkedAt: ${new Date(diag?.at ?? last?.at ?? Date.now()).toISOString()}`,
    `online: ${online}`,
    `browser: ${ua}`,
    `detail: ${(diag?.detail ?? last?.message ?? '').slice(0, 300)}`,
  ];
  return lines.join('\n');
}
