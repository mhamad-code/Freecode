export const MASK = '[redacted]';

const PATTERNS: RegExp[] = [
  /ghp_[A-Za-z0-9]{20,}/g,
  /github_pat_[A-Za-z0-9_]{20,}/g,
  /sk-[A-Za-z0-9_-]{16,}/g,
  /AIza[A-Za-z0-9_-]{20,}/g,
  /xox[abprs]-[A-Za-z0-9-]{10,}/g,
  /Bearer\s+[A-Za-z0-9._-]{12,}/g,
  /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g,
];

export class Redactor {
  private readonly secrets = new Set<string>();

  add(secret: string | undefined): void {
    if (secret && secret.length >= 6) this.secrets.add(secret);
  }

  addAll(secrets: Iterable<string | undefined>): void {
    for (const s of secrets) this.add(s);
  }

  redact(input: string): string {
    let out = input;
    for (const secret of this.secrets) {
      if (!secret) continue;
      out = out.split(secret).join(MASK);
    }
    for (const pattern of PATTERNS) out = out.replace(pattern, MASK);
    return out;
  }

  /** Deep-redacts every string inside a JSON-like value. */
  redactValue<T>(value: T): T {
    if (typeof value === 'string') return this.redact(value) as unknown as T;
    if (Array.isArray(value)) return value.map((v) => this.redactValue(v)) as unknown as T;
    if (value && typeof value === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        out[k] = this.redactValue(v);
      }
      return out as unknown as T;
    }
    return value;
  }
}

export const redactor = new Redactor();
