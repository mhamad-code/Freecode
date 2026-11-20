/**
 * Serial queue keyed by provider. Free services count requests per IP, so two
 * turns fired at once must not race each other into a 429.
 */
export class SerialQueue {
  private tails = new Map<string, Promise<unknown>>();
  private pending = new Map<string, number>();

  run<T>(key: string, task: () => Promise<T>): Promise<T> {
    const previous = this.tails.get(key) ?? Promise.resolve();
    this.pending.set(key, (this.pending.get(key) ?? 0) + 1);
    // A failed task must not poison the queue for the next caller.
    const next = previous.catch(() => undefined).then(task);
    this.tails.set(key, next);
    const done = () => {
      this.pending.set(key, Math.max(0, (this.pending.get(key) ?? 1) - 1));
      if (this.tails.get(key) === next) this.tails.delete(key);
    };
    void next.then(done, done);
    return next;
  }

  /** Tasks queued or running for a key. */
  pendingCount(key: string): number {
    return this.pending.get(key) ?? 0;
  }

  keys(): string[] {
    return [...this.pending.keys()];
  }

  done(key: string): Promise<void> {
    return Promise.resolve(this.tails.get(key)).then(
      () => undefined,
      () => undefined,
    );
  }
}
