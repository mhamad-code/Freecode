export type Risk = 'low' | 'medium' | 'high';
export type PermissionMode = 'ask' | 'risky' | 'allow-all' | 'read-only';
export type Decision = 'allow' | 'ask' | 'deny';

const LOW = /^(ls|cat|pwd|head|tail|wc|find|grep|rg|which|echo|node\s+-v|npm\s+-v|pnpm\s+-v|yarn\s+-v|git\s+(status|diff|log|show|branch|remote -v|rev-parse))\b/;
const MEDIUM = /^(npm\s+(install|ci|run|test)|pnpm\s+(install|add|run|test)|yarn\s+(install|add|run|test)|npx\s+(vite|tsc|vitest)|vite\s+build|tsc|vitest|prettier|eslint|mkdir|touch|cp|mv|rm(?!\s+-rf)|git\s+(add|commit|checkout|switch|merge|rebase|stash|restore))\b/;

const HIGH_PATTERNS: RegExp[] = [
  /\brm\s+(-[a-z]*r[a-z]*f|-[a-z]*f[a-z]*r)/i,
  /\bsudo\b/,
  /\b(curl|wget)\b[^\n]*\|\s*(sh|bash|zsh)\b/,
  /\bchmod\s+-R\b/,
  /\bgit\s+push\b[^\n]*(--force|-f)\b/,
  /\b(eval|exec)\b/,
  /\bxargs\b/,
  /\b(env|printenv|export\s+-p)\b/,
  /\b(npm\s+publish|firebase\s+deploy|wrangler\s+deploy|vercel\s+--prod)\b/,
  /(^|\s)>\s*(\/|\.\.\/)/,
  /\bdd\s+if=/,
  /\bmkfs\b/,
];

const MAX_RISK: Record<Risk, number> = { low: 0, medium: 1, high: 2 };

export function classifySegment(segment: string): Risk {
  const cmd = segment.trim();
  if (!cmd) return 'low';
  if (HIGH_PATTERNS.some((p) => p.test(cmd))) return 'high';
  if (LOW.test(cmd)) return 'low';
  if (MEDIUM.test(cmd)) return 'medium';
  return 'high';
}

/** Splits a command line into segments and returns the highest risk seen. */
export function classifyCommand(command: string): Risk {
  if (!command.trim()) return 'low';
  const segments = command.split(/\s*(?:&&|\|\||;|\|)\s*/).filter(Boolean);
  let risk: Risk = 'low';
  for (const segment of segments) {
    const segmentRisk = classifySegment(segment);
    if (MAX_RISK[segmentRisk] > MAX_RISK[risk]) risk = segmentRisk;
  }
  return risk;
}

export function normalizeRule(command: string): string {
  return command.trim().replace(/\s+/g, ' ');
}

export function decide(
  mode: PermissionMode,
  risk: Risk,
  opts: { hasRule?: boolean; untrustedContent?: boolean } = {},
): Decision {
  if (mode === 'read-only') return risk === 'low' ? 'allow' : 'deny';
  if (risk === 'low') return 'allow';
  if (risk === 'high') return 'ask';
  if (mode === 'allow-all') {
    if (opts.untrustedContent) return 'ask';
    return 'allow';
  }
  if (mode === 'risky') return opts.hasRule ? 'allow' : 'ask';
  return opts.hasRule ? 'allow' : 'ask';
}

/** Always-allow is never offered for high-risk or open-ended commands. */
export function canSaveRule(command: string, risk: Risk): boolean {
  if (risk === 'high') return false;
  return !/\b(bash|sh|zsh)\s+-c\b/.test(command) && !/\b(eval|xargs|curl|rm)\b/.test(command);
}
