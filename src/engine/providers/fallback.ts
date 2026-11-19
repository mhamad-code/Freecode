import type { ErrorCode } from './errors';

export type FallbackAction =
  | { action: 'switch'; index: number }
  | { action: 'retry'; delayMs: number }
  | { action: 'fail'; reason: 'output-started' | 'exhausted' | 'not-retriable' };

export interface FallbackContext {
  outputStarted: boolean;
  attempts: number;
  maxRetries: number;
  currentIndex: number;
  chainLength: number;
  stayWithinProvider: boolean;
}

/**
 * Decides what to do after a provider failure.
 * - Never retries or switches once any output byte exists.
 * - Quota / model-not-found / auth switch immediately to the next entry.
 * - Rate / server / network / timeout retry first (with backoff), then switch.
 */
export function decideFallback(
  code: ErrorCode,
  retryAfterMs: number | undefined,
  ctx: FallbackContext,
): FallbackAction {
  if (ctx.outputStarted) return { action: 'fail', reason: 'output-started' };

  const nextIndex = ctx.currentIndex + 1;
  const hasNext = nextIndex < ctx.chainLength && !ctx.stayWithinProvider;

  const switchNow: ErrorCode[] = ['quota', 'model-not-found', 'auth'];
  if (switchNow.includes(code)) {
    return hasNext ? { action: 'switch', index: nextIndex } : { action: 'fail', reason: 'exhausted' };
  }

  const retriable: ErrorCode[] = ['rate', 'server', 'network', 'timeout'];
  if (retriable.includes(code)) {
    if (ctx.attempts < ctx.maxRetries) {
      const base = retryAfterMs ?? Math.min(400 * 2 ** ctx.attempts, 8000);
      return { action: 'retry', delayMs: base };
    }
    return hasNext ? { action: 'switch', index: nextIndex } : { action: 'fail', reason: 'exhausted' };
  }

  return { action: 'fail', reason: 'not-retriable' };
}
