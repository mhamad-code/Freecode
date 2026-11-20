import { describe, expect, it, vi } from 'vitest';
import { computeBackoffMs, withBackoff } from '../backoff';
import { parseRetryAfter, ProviderError } from '../errors';
import { SerialQueue } from '../queue';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('SerialQueue', () => {
  it('runs tasks for one provider in order, one at a time', async () => {
    const queue = new SerialQueue();
    const events: string[] = [];
    const task = (name: string, ms: number) => async () => {
      events.push(`start ${name}`);
      await delay(ms);
      events.push(`end ${name}`);
      return name;
    };
    const first = queue.run('p', task('a', 15));
    const second = queue.run('p', task('b', 1));
    expect(queue.pendingCount('p')).toBe(2);
    await expect(Promise.all([first, second])).resolves.toEqual(['a', 'b']);
    expect(events).toEqual(['start a', 'end a', 'start b', 'end b']);
    expect(queue.pendingCount('p')).toBe(0);
  });

  it('runs different providers in parallel', async () => {
    const queue = new SerialQueue();
    let active = 0;
    let maxActive = 0;
    const body = async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await delay(10);
      active -= 1;
    };
    await Promise.all([queue.run('a', body), queue.run('b', body)]);
    expect(maxActive).toBe(2);
  });

  it('keeps going after a rejected task', async () => {
    const queue = new SerialQueue();
    const failed = queue.run('p', async () => {
      throw new Error('boom');
    });
    const next = queue.run('p', async () => 'ok');
    await expect(failed).rejects.toThrow('boom');
    await expect(next).resolves.toBe('ok');
    expect(queue.pendingCount('p')).toBe(0);
  });
});

describe('Retry-After parsing', () => {
  it('accepts seconds, retry-after text and an HTTP date', () => {
    expect(parseRetryAfter('3')).toBe(3000);
    expect(parseRetryAfter('retry after 7 seconds')).toBe(7000);
    const date = new Date(Date.now() + 5000).toUTCString();
    const ms = parseRetryAfter(date);
    expect(ms).toBeGreaterThan(3000);
    expect(ms).toBeLessThanOrEqual(5000);
    expect(parseRetryAfter('nonsense')).toBeUndefined();
  });
});

describe('backoff', () => {
  it('uses the provider Retry-After as-is and clamps it', () => {
    expect(computeBackoffMs(0, 2000, { baseMs: 400 })).toBe(2000);
    expect(computeBackoffMs(0, 60000, { maxDelayMs: 5000 })).toBe(5000);
  });

  it('grows exponentially without Retry-After', () => {
    expect(computeBackoffMs(0, undefined, { baseMs: 400, jitter: () => 0 })).toBe(320);
    expect(computeBackoffMs(2, undefined, { baseMs: 400, jitter: () => 1 })).toBe(1920);
  });

  it('retries only retriable errors and sleeps the computed delay', async () => {
    const sleep = vi.fn(async () => undefined);
    let calls = 0;
    const result = await withBackoff(
      async () => {
        calls += 1;
        if (calls === 1) throw new ProviderError('rate', 'HTTP 429', { retryAfterMs: 2000 });
        return 'done';
      },
      { attempts: 2, sleep },
    );
    expect(result).toBe('done');
    expect(calls).toBe(2);
    expect(sleep).toHaveBeenCalledWith(2000);
  });

  it('gives up immediately when Retry-After exceeds maxWaitMs', async () => {
    const sleep = vi.fn(async () => undefined);
    let calls = 0;
    await expect(
      withBackoff(
        async () => {
          calls += 1;
          throw new ProviderError('rate', 'HTTP 429', { retryAfterMs: 120000 });
        },
        { attempts: 3, sleep, maxWaitMs: 10000 },
      ),
    ).rejects.toMatchObject({ code: 'rate', retryAfterMs: 120000 });
    expect(calls).toBe(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('never retries once output has started', async () => {
    const sleep = vi.fn(async () => undefined);
    let calls = 0;
    await expect(
      withBackoff(
        async () => {
          calls += 1;
          throw new ProviderError('server', 'HTTP 500');
        },
        { attempts: 3, sleep, canRetry: () => false },
      ),
    ).rejects.toMatchObject({ code: 'server' });
    expect(calls).toBe(1);
  });

  it('does not retry auth or bad-request failures', async () => {
    const sleep = vi.fn(async () => undefined);
    for (const code of ['auth', 'bad-request', 'unsupported-tools'] as const) {
      await expect(
        withBackoff(async () => Promise.reject(new ProviderError(code, code)), {
          attempts: 3,
          sleep,
        }),
      ).rejects.toMatchObject({ code });
    }
    expect(sleep).not.toHaveBeenCalled();
  });
});
