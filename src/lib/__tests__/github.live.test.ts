import { describe, expect, it } from 'vitest';
import { getViewer, listRepos } from '../github';

/**
 * Read-only check against the real API. It runs only when a token is supplied:
 *   GH=… npx vitest run src/lib/__tests__/github.live.test.ts
 */
const token = (globalThis as { process?: { env?: Record<string, string> } }).process?.env?.GH ?? '';

describe.skipIf(!token)('github live', () => {
  it('authenticates and lists repositories', async () => {
    const viewer = await getViewer(fetch, token);
    expect(viewer.login.length).toBeGreaterThan(0);
    const repos = await listRepos(fetch, token);
    expect(Array.isArray(repos)).toBe(true);
    expect(repos.length).toBeGreaterThan(0);
    expect(repos[0].full_name).toContain('/');
  }, 20000);
});
