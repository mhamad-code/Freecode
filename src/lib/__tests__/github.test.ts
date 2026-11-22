import { describe, expect, it, vi } from 'vitest';
import {
  GitHubError,
  blobSha,
  diffAgainstRemote,
  getRemoteBlobs,
  getViewer,
  listRepos,
  pushFiles,
  type FetchLike,
} from '../github';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('github client', () => {
  it('sends the token in the Authorization header and returns the viewer', async () => {
    const fetchImpl = vi.fn<FetchLike>(async () => json({ login: 'octocat', name: 'Octo', avatar_url: 'x' }));
    const viewer = await getViewer(fetchImpl, '  ghp_test  ');
    expect(viewer.login).toBe('octocat');
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://api.github.com/user');
    const headers = init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer ghp_test');
    expect(headers.Accept).toBe('application/vnd.github+json');
  });

  it('surfaces GitHub’s error message and status', async () => {
    const fetchImpl = vi.fn<FetchLike>(async () => json({ message: 'Bad credentials' }, 401));
    await expect(listRepos(fetchImpl, 'bad')).rejects.toMatchObject({
      name: 'GitHubError',
      message: 'Bad credentials',
      status: 401,
    });
    await expect(listRepos(fetchImpl, 'bad')).rejects.toBeInstanceOf(GitHubError);
  });

  it('computes Git blob ids', async () => {
    expect(await blobSha('')).toBe('e69de29bb2d1d6434b8b29ae775ad8c2e48c5391');
    expect(await blobSha('hello\n')).toBe('ce013625030ba8dba906f756967f9e9ca394464a');
  });

  it('diffs local text files against remote blob ids', async () => {
    const same = await blobSha('same\n');
    const changes = await diffAgainstRemote(
      { 'same.txt': 'same\n', 'new.txt': 'new\n', '.freecode/preview-server.cjs': 'x' },
      { 'same.txt': same, 'old.txt': 'deadbeef' },
    );
    expect(changes).toEqual([{ path: 'new.txt', status: 'A' }]);
  });

  it('reads the remote blob list through the branch tree', async () => {
    const fetchImpl = vi.fn<FetchLike>(async (url) => {
      if (url.endsWith('/git/ref/heads/main')) return json({ object: { sha: 'c1' } });
      if (url.endsWith('/git/commits/c1')) return json({ tree: { sha: 't1' } });
      return json({
        truncated: false,
        tree: [
          { path: 'src/a.ts', mode: '100644', type: 'blob', sha: 'b1' },
          { path: 'src', mode: '040000', type: 'tree', sha: 't2' },
        ],
      });
    });
    expect(await getRemoteBlobs(fetchImpl, 't', 'me', 'repo', 'main')).toEqual({ 'src/a.ts': 'b1' });
  });

  it('pushes one commit: blobs → tree with base_tree → commit → ref', async () => {
    const calls: string[] = [];
    const bodies: unknown[] = [];
    const fetchImpl: FetchLike = async (url, init) => {
      calls.push(`${init?.method ?? 'GET'} ${url.replace('https://api.github.com', '')}`);
      if (init?.body) bodies.push(JSON.parse(String(init.body)));
      if (url.endsWith('/git/ref/heads/main')) return json({ object: { sha: 'c1' } });
      if (url.endsWith('/git/commits/c1')) return json({ tree: { sha: 't1' } });
      if (url.endsWith('/git/blobs')) return json({ sha: 'b_ok' });
      if (url.endsWith('/git/trees')) return json({ sha: 't_new' });
      if (url.endsWith('/git/commits')) return json({ sha: 'c_new', html_url: 'https://github.com/me/repo/commit/c_new' });
      if (url.endsWith('/git/refs/heads/main')) return json({ ref: 'refs/heads/main' });
      throw new Error(`unexpected ${url}`);
    };

    const result = await pushFiles(fetchImpl, 't', {
      owner: 'me',
      repo: 'repo',
      branch: 'main',
      message: 'Update from Freecode',
      files: { 'index.html': '<h1>hi</h1>', '.freecode/x': 'skip' },
    });

    expect(result).toEqual({ commitSha: 'c_new', commitUrl: 'https://github.com/me/repo/commit/c_new', branch: 'main' });
    expect(calls).toEqual([
      'GET /repos/me/repo/git/ref/heads/main',
      'GET /repos/me/repo/git/commits/c1',
      'POST /repos/me/repo/git/blobs',
      'POST /repos/me/repo/git/trees',
      'POST /repos/me/repo/git/commits',
      'PATCH /repos/me/repo/git/refs/heads/main',
    ]);
    expect(bodies[1]).toMatchObject({ base_tree: 't1', tree: [{ path: 'index.html', mode: '100644', type: 'blob', sha: 'b_ok' }] });
    expect(bodies[2]).toMatchObject({ message: 'Update from Freecode', tree: 't_new', parents: ['c1'] });
    expect(bodies[3]).toMatchObject({ sha: 'c_new', force: false });
  });

  it('refuses to push nothing', async () => {
    await expect(
      pushFiles(async () => json({}), 't', {
        owner: 'me',
        repo: 'r',
        branch: 'main',
        message: 'm',
        files: { '.freecode/x': 'only hidden' },
      }),
    ).rejects.toThrow('no text files');
  });
});
