export type PathIssue =
  | 'empty'
  | 'backslash'
  | 'control'
  | 'dot'
  | 'segment-empty'
  | 'segment-long'
  | 'too-long'
  | 'exists'
  | 'parent-is-file';

export type PathCheck =
  | { ok: true; path: string }
  | { ok: false; issue: PathIssue; segment?: string };

const CONTROL = /[\u0000-\u001f\u007f]/;
const MAX_SEGMENT = 255;
const MAX_TOTAL = 1024;

/**
 * Validates a project path typed by the user. Accepts nested paths such as
 * `src/utils/a.ts` and rejects anything that cannot be a portable relative
 * path, so the same rules hold for the store, OPFS, IndexedDB and archives.
 */
export function checkPath(
  raw: string,
  existing: { files: string[]; folders: string[] },
): PathCheck {
  const value = raw.trim();
  if (!value) return { ok: false, issue: 'empty' };
  if (value.includes('\\')) return { ok: false, issue: 'backslash' };
  if (CONTROL.test(value)) return { ok: false, issue: 'control' };
  if (value.startsWith('/') || value.endsWith('/')) return { ok: false, issue: 'dot' };
  if (value.length > MAX_TOTAL) return { ok: false, issue: 'too-long' };
  const segments = value.split('/');
  for (const segment of segments) {
    if (!segment) return { ok: false, issue: 'segment-empty' };
    if (segment === '.' || segment === '..') return { ok: false, issue: 'dot' };
    if (segment.length > MAX_SEGMENT) return { ok: false, issue: 'segment-long', segment };
  }
  const file = existing.files.find((p) => p.toLowerCase() === value.toLowerCase());
  const folder = existing.folders.find((p) => p.toLowerCase() === value.toLowerCase());
  if (file || folder) return { ok: false, issue: 'exists' };
  for (let i = 1; i < segments.length; i++) {
    const parent = segments.slice(0, i).join('/');
    if (existing.files.some((p) => p.toLowerCase() === parent.toLowerCase())) {
      return { ok: false, issue: 'parent-is-file', segment: parent };
    }
  }
  return { ok: true, path: value };
}

/** A child path inside a folder (or the project root when `parent` is empty). */
export function childPath(parent: string, name: string): string {
  return parent ? `${parent}/${name}` : name;
}

/** Appends ` (n)` before the extension until the name is free. */
export function uniquePath(
  path: string,
  taken: Set<string>,
): string {
  if (!taken.has(path)) return path;
  const slash = path.lastIndexOf('/');
  const dir = slash >= 0 ? path.slice(0, slash + 1) : '';
  const base = path.slice(dir.length);
  const dot = base.lastIndexOf('.');
  const stem = dot > 0 ? base.slice(0, dot) : base;
  const ext = dot > 0 ? base.slice(dot) : '';
  for (let i = 2; i < 10_000; i++) {
    const candidate = `${dir}${stem} (${i})${ext}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${dir}${stem}-${Date.now()}${ext}`;
}

/** i18n key for a rejected path; the English/Arabic copies live in i18n.ts. */
export const PATH_ISSUE_KEY: Record<PathIssue, string> = {
  empty: 'fs.err.empty',
  backslash: 'fs.err.backslash',
  control: 'fs.err.control',
  dot: 'fs.err.dot',
  'segment-empty': 'fs.err.segmentEmpty',
  'segment-long': 'fs.err.segmentLong',
  'too-long': 'fs.err.tooLong',
  exists: 'fs.err.exists',
  'parent-is-file': 'fs.err.parentIsFile',
};
