/**
 * A small GitHub REST client. Everything here talks to the real API; the token
 * is only ever sent in the Authorization header and is never logged or stored
 * in the profile.
 */

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const API = 'https://api.github.com';

export class GitHubError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'GitHubError';
    this.status = status;
  }
}

export interface GitHubUser {
  login: string;
  name: string | null;
  avatar_url: string;
}

export interface GitHubRepo {
  id: number;
  full_name: string;
  name: string;
  owner: { login: string };
  private: boolean;
  default_branch: string;
  html_url: string;
}

export interface GitHubBranch {
  name: string;
  commit: { sha: string };
  protected?: boolean;
}

export interface GitHubTreeEntry {
  path: string;
  mode: string;
  type: 'blob' | 'tree' | 'commit';
  sha: string;
  size?: number;
}

export interface PushResult {
  commitSha: string;
  commitUrl: string;
  branch: string;
}

async function request<T>(
  fetchImpl: FetchLike,
  token: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token.trim()}`,
    'X-GitHub-Api-Version': '2022-11-28',
    ...(init.headers as Record<string, string> | undefined),
  };
  if (init.body) headers['Content-Type'] = 'application/json';
  const res = await fetchImpl(`${API}${path}`, { ...init, headers });
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }
  if (!res.ok) {
    const message =
      data && typeof data === 'object' && 'message' in data
        ? String((data as { message: unknown }).message)
        : `GitHub returned ${res.status}`;
    throw new GitHubError(message, res.status);
  }
  return data as T;
}

export function getViewer(fetchImpl: FetchLike, token: string): Promise<GitHubUser> {
  return request<GitHubUser>(fetchImpl, token, '/user');
}

export function listRepos(fetchImpl: FetchLike, token: string): Promise<GitHubRepo[]> {
  return request<GitHubRepo[]>(
    fetchImpl,
    token,
    '/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator',
  );
}

export function listBranches(
  fetchImpl: FetchLike,
  token: string,
  owner: string,
  repo: string,
): Promise<GitHubBranch[]> {
  return request<GitHubBranch[]>(fetchImpl, token, `/repos/${owner}/${repo}/branches?per_page=100`);
}

export async function getBranchHead(
  fetchImpl: FetchLike,
  token: string,
  owner: string,
  repo: string,
  branch: string,
): Promise<{ commitSha: string; treeSha: string }> {
  const ref = await request<{ object: { sha: string } }>(
    fetchImpl,
    token,
    `/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(branch)}`,
  );
  const commit = await request<{ tree: { sha: string } }>(
    fetchImpl,
    token,
    `/repos/${owner}/${repo}/git/commits/${ref.object.sha}`,
  );
  return { commitSha: ref.object.sha, treeSha: commit.tree.sha };
}

/** Every blob in the branch, keyed by path (recursive tree). */
export async function getRemoteBlobs(
  fetchImpl: FetchLike,
  token: string,
  owner: string,
  repo: string,
  branch: string,
): Promise<Record<string, string>> {
  const head = await getBranchHead(fetchImpl, token, owner, repo, branch);
  const tree = await request<{ tree: GitHubTreeEntry[]; truncated: boolean }>(
    fetchImpl,
    token,
    `/repos/${owner}/${repo}/git/trees/${head.treeSha}?recursive=1`,
  );
  const blobs: Record<string, string> = {};
  for (const entry of tree.tree) if (entry.type === 'blob') blobs[entry.path] = entry.sha;
  return blobs;
}

const hex = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

/** Git's blob id for a file's bytes: sha1("blob <length>\0" + content). */
export async function blobSha(content: string): Promise<string> {
  const bytes = new TextEncoder().encode(content);
  const header = new TextEncoder().encode(`blob ${bytes.length}\0`);
  const all = new Uint8Array(header.length + bytes.length);
  all.set(header);
  all.set(bytes, header.length);
  return hex(await crypto.subtle.digest('SHA-1', all));
}

export interface LocalChange {
  path: string;
  status: 'A' | 'M' | 'D';
}

/** Compares the local text files with the remote tree by blob id (no content download). */
export async function diffAgainstRemote(
  files: Record<string, string>,
  remote: Record<string, string>,
): Promise<LocalChange[]> {
  const changes: LocalChange[] = [];
  for (const [path, content] of Object.entries(files)) {
    if (path.startsWith('.freecode/')) continue;
    const sha = await blobSha(content);
    if (!remote[path]) changes.push({ path, status: 'A' });
    else if (remote[path] !== sha) changes.push({ path, status: 'M' });
  }
  return changes.sort((a, b) => a.path.localeCompare(b.path));
}

export interface PushOptions {
  owner: string;
  repo: string;
  branch: string;
  message: string;
  files: Record<string, string>;
}

/**
 * Writes every given file to a new commit on the branch, using the Git Data
 * API (blobs → tree with base_tree → commit → ref update). One commit, so a
 * failure never leaves a half-written tree on the branch.
 */
export async function pushFiles(
  fetchImpl: FetchLike,
  token: string,
  { owner, repo, branch, message, files }: PushOptions,
): Promise<PushResult> {
  const paths = Object.keys(files).filter((p) => !p.startsWith('.freecode/'));
  if (!paths.length) throw new GitHubError('There are no text files to push.', 400);
  const head = await getBranchHead(fetchImpl, token, owner, repo, branch);

  const tree: { path: string; mode: '100644'; type: 'blob'; sha: string }[] = [];
  for (const path of paths) {
    const blob = await request<{ sha: string }>(fetchImpl, token, `/repos/${owner}/${repo}/git/blobs`, {
      method: 'POST',
      body: JSON.stringify({ content: files[path], encoding: 'utf-8' }),
    });
    tree.push({ path, mode: '100644', type: 'blob', sha: blob.sha });
  }

  const newTree = await request<{ sha: string }>(fetchImpl, token, `/repos/${owner}/${repo}/git/trees`, {
    method: 'POST',
    body: JSON.stringify({ base_tree: head.treeSha, tree }),
  });
  const commit = await request<{ sha: string; html_url: string }>(
    fetchImpl,
    token,
    `/repos/${owner}/${repo}/git/commits`,
    {
      method: 'POST',
      body: JSON.stringify({ message, tree: newTree.sha, parents: [head.commitSha] }),
    },
  );
  await request(fetchImpl, token, `/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`, {
    method: 'PATCH',
    body: JSON.stringify({ sha: commit.sha, force: false }),
  });
  return { commitSha: commit.sha, commitUrl: commit.html_url, branch };
}
