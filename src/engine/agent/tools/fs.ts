import { decode, encode, safePath, sha256Hex, type ProjectFS } from '../../../storage/projectFs';
import { applyEdit, WriteGuard } from './edit';

export interface ToolIO {
  fs: ProjectFS;
  guard: WriteGuard;
}

export interface ReadResult {
  path: string;
  text: string;
  totalLines: number;
  sha: string;
  truncated: boolean;
}

async function currentHash(fs: ProjectFS, path: string): Promise<string | undefined> {
  const stat = await fs.stat(path);
  if (!stat || stat.type !== 'file') return undefined;
  return sha256Hex(await fs.read(path));
}

export async function readFileTool(
  io: ToolIO,
  path: string,
  offset = 1,
  limit = 2000,
): Promise<ReadResult> {
  const safe = safePath(path);
  const bytes = await io.fs.read(safe);
  const sha = await sha256Hex(bytes);
  io.guard.markRead(safe, sha);
  const text = decode(bytes);
  const lines = text.split('\n');
  const start = Math.max(0, offset - 1);
  const slice = lines.slice(start, start + limit);
  return {
    path: safe,
    text: slice.join('\n'),
    totalLines: lines.length,
    sha,
    truncated: start + limit < lines.length,
  };
}

export async function writeFileTool(
  io: ToolIO,
  path: string,
  content: string,
): Promise<{ path: string; sha: string }> {
  const safe = safePath(path);
  if (!safe) throw new Error('A file path is required');
  const existing = await currentHash(io.fs, safe);
  const check = io.guard.check(safe, existing);
  if (!check.ok) throw new Error(check.reason);
  const bytes = encode(content);
  await io.fs.write(safe, bytes);
  const sha = await sha256Hex(bytes);
  io.guard.markRead(safe, sha);
  return { path: safe, sha };
}

export async function editFileTool(
  io: ToolIO,
  path: string,
  oldStr: string,
  newStr: string,
  replaceAll = false,
): Promise<{ path: string; sha: string; matches: number; fuzzy: boolean }> {
  const safe = safePath(path);
  const bytes = await io.fs.read(safe);
  const existing = await sha256Hex(bytes);
  const check = io.guard.check(safe, existing);
  if (!check.ok) throw new Error(check.reason);
  const result = applyEdit(decode(bytes), oldStr, newStr, replaceAll);
  const output = encode(result.content);
  await io.fs.write(safe, output);
  const sha = await sha256Hex(output);
  io.guard.markRead(safe, sha);
  return { path: safe, sha, matches: result.matches, fuzzy: result.fuzzy };
}

export async function listFilesTool(
  io: ToolIO,
  dir = '',
  depth = 2,
): Promise<{ path: string; type: 'file' | 'dir' }[]> {
  const out: { path: string; type: 'file' | 'dir' }[] = [];
  const walk = async (current: string, level: number) => {
    if (level > depth) return;
    for (const entry of await io.fs.list(current)) {
      out.push({ path: entry.path, type: entry.type });
      if (entry.type === 'dir' && level < depth) await walk(entry.path, level + 1);
    }
  };
  await walk(safePath(dir), 1);
  return out;
}
