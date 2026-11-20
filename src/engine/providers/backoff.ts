import { ProviderError, isRetriable } from './errors';

export interface RetryOptions {
  /** Total attempts, including the first one. */
  attempts?: number;
  baseMs?: number;
  maxDelayMs?: number;
  /** A Retry-After longer than this is reported to the caller, not slept through. */
  maxWaitMs?: number;
  /** Optional guard, e.g. false once any output has been emitted. */
  canRetry?: () => boolean;
  jitter?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

export const DEFAULT_RETRY = {
  attempts: 2,
  baseMs: 400,
  maxDelayMs: 5000,
  maxWaitMs: 10000,
} as const;

export function computeBackoffMs(
  attempt: number,
  retryAfterMs?: number,
  opts: Pick<RetryOptions, 'baseMs' | 'maxDelayMs' | 'jitter'> = {},
): number {
  const maxDelayMs = opts.maxDelayMs ?? DEFAULT_RETRY.maxDelayMs;
  // The provider's own Retry-After is authoritative; never add jitter to it.
  if (retryAfterMs !== undefined && retryAfterMs >= 0) return Math.min(retryAfterMs, maxDelayMs);
  const baseMs = opts.baseMs ?? DEFAULT_RETRY.baseMs;
  const raw = Math.min(baseMs * 2 ** attempt, maxDelayMs);
  const jitter = Math.min(1, Math.max(0, (opts.jitter ?? Math.random)()));
  return Math.round(raw * (0.8 + 0.4 * jitter));
}

export function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retries only errors that can succeed on a second attempt, never after output
 * has started, and only when the provider's Retry-After fits maxWaitMs.
 */
export async function withBackoff<T>(
  task: (attempt: number) => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const attempts = Math.max(1, opts.attempts ?? DEFAULT_RETRY.attempts);
  const maxWaitMs = opts.maxWaitMs ?? DEFAULT_RETRY.maxWaitMs;
  const sleep = opts.sleep ?? defaultSleep;
  for (let attempt = 0; ; attempt++) {
    try {
      return await task(attempt);
    } catch (err) {
      const canRetry = opts.canRetry ? opts.canRetry() : true;
      if (!canRetry || !(err instanceof ProviderError) || !isRetriable(err.code)) throw err;
      if (attempt + 1 >= attempts) throw err;
      if (err.retryAfterMs !== undefined && err.retryAfterMs > maxWaitMs) throw err;
      await sleep(computeBackoffMs(attempt, err.retryAfterMs, opts));
    }
  }
}
