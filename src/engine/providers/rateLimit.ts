/** A local sliding-window request counter. Purely computational; persistence is the caller's job. */
export class SlidingWindowCounter {
  private stamps: number[] = [];

  constructor(private readonly windowMs: number) {}

  private prune(now: number) {
    const cutoff = now - this.windowMs;
    while (this.stamps.length && this.stamps[0] <= cutoff) this.stamps.shift();
  }

  record(now = Date.now()): void {
    this.stamps.push(now);
    this.prune(now);
  }

  count(now = Date.now()): number {
    this.prune(now);
    return this.stamps.length;
  }

  /** Remaining requests under the limit, never below zero. */
  remaining(limit: number, now = Date.now()): number {
    return Math.max(0, limit - this.count(now));
  }

  /** Fraction (0..1) of the limit still available; used for the "< 20%" hint. */
  fraction(limit: number, now = Date.now()): number {
    if (limit <= 0) return 0;
    return this.remaining(limit, now) / limit;
  }

  reset(): void {
    this.stamps = [];
  }
}

export function parseRateHeaders(headers: Headers): {
  remaining?: number;
  limit?: number;
  resetAt?: number;
} {
  const remaining = Number(
    headers.get('x-ratelimit-remaining-requests') ??
      headers.get('x-ratelimit-remaining') ??
      NaN,
  );
  const limit = Number(
    headers.get('x-ratelimit-limit-requests') ??
      headers.get('x-ratelimit-limit') ??
      NaN,
  );
  const reset = Number(
    headers.get('x-ratelimit-reset-requests') ??
      headers.get('x-ratelimit-reset') ??
      NaN,
  );
  return {
    remaining: Number.isFinite(remaining) ? remaining : undefined,
    limit: Number.isFinite(limit) ? limit : undefined,
    resetAt: Number.isFinite(reset) ? reset : undefined,
  };
}
