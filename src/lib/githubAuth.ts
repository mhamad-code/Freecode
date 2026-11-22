import { useSyncExternalStore } from 'react';

/**
 * GitHub credentials for this tab only. The token lives in sessionStorage
 * (cleared when the tab closes) and is never written to the profile, the
 * backup archive or IndexedDB. The repository target is not a secret, so it
 * can live in localStorage.
 */

const TOKEN_KEY = 'fc.gh.token';
const REPO_KEY = 'fc.gh.target';

export interface RepoTarget {
  owner: string;
  repo: string;
  branch: string;
}

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());

export function subscribeGithub(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

let token = (() => {
  try {
    return sessionStorage.getItem(TOKEN_KEY) ?? '';
  } catch {
    return '';
  }
})();

export function getGithubToken(): string {
  return token;
}

export function setGithubToken(next: string): void {
  token = next.trim();
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // storage can be blocked; the in-memory value still works for this page
  }
  emit();
}

let target: RepoTarget | null = (() => {
  try {
    const raw = localStorage.getItem(REPO_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RepoTarget>;
    if (!parsed.owner || !parsed.repo || !parsed.branch) return null;
    return { owner: parsed.owner, repo: parsed.repo, branch: parsed.branch };
  } catch {
    return null;
  }
})();

export function getRepoTarget(): RepoTarget | null {
  return target;
}

export function setRepoTarget(next: RepoTarget | null): void {
  target = next;
  try {
    if (next) localStorage.setItem(REPO_KEY, JSON.stringify(next));
    else localStorage.removeItem(REPO_KEY);
  } catch {
    // ignore
  }
  emit();
}

export function useGithubToken(): string {
  return useSyncExternalStore(subscribeGithub, getGithubToken, () => '');
}

export function useRepoTarget(): RepoTarget | null {
  return useSyncExternalStore(subscribeGithub, getRepoTarget, () => null);
}
