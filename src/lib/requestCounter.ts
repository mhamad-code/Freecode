const windowMs = 60 * 60 * 1000;

const keyFor = (providerId: string) => `fc.requests.${providerId}`;

function read(providerId: string): number[] {
  try {
    const raw = localStorage.getItem(keyFor(providerId));
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((n): n is number => typeof n === 'number') : [];
  } catch {
    return [];
  }
}

function write(providerId: string, stamps: number[]): void {
  try {
    localStorage.setItem(keyFor(providerId), JSON.stringify(stamps));
  } catch {
    // storage unavailable; the counter is only an estimate
  }
}

/** Counts requests this browser sent to a provider in the last hour. */
export function recordRequest(providerId: string, now = Date.now()): void {
  const stamps = read(providerId).filter((t) => now - t < windowMs);
  stamps.push(now);
  write(providerId, stamps);
}

export function requestsThisHour(providerId: string, now = Date.now()): number {
  return read(providerId).filter((t) => now - t < windowMs).length;
}

/** Estimated remaining requests for a provider that publishes an hourly limit. */
export function estimateRemaining(
  providerId: string,
  perHour: number | undefined,
  now = Date.now(),
): number | undefined {
  if (!perHour) return undefined;
  return Math.max(0, perHour - requestsThisHour(providerId, now));
}
