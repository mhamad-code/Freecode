import { useSyncExternalStore } from 'react';

export type RuntimePhase = 'idle' | 'booting' | 'ready' | 'error' | 'unsupported';
export type PreviewPhase = 'idle' | 'starting' | 'running' | 'error';

export interface RuntimeSnapshot {
  phase: RuntimePhase;
  error: string | null;
  files: number;
  previewPhase: PreviewPhase;
  previewUrl: string | null;
  previewError: string | null;
}

const initial: RuntimeSnapshot = {
  phase: 'idle',
  error: null,
  files: 0,
  previewPhase: 'idle',
  previewUrl: null,
  previewError: null,
};

let snapshot: RuntimeSnapshot = initial;
const listeners = new Set<() => void>();

export function runtimeSnapshot(): RuntimeSnapshot {
  return snapshot;
}

export function setRuntime(patch: Partial<RuntimeSnapshot>): void {
  snapshot = { ...snapshot, ...patch };
  for (const listener of listeners) listener();
}

export function resetRuntimeState(): void {
  snapshot = initial;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useRuntime(): RuntimeSnapshot {
  return useSyncExternalStore(subscribe, runtimeSnapshot, runtimeSnapshot);
}
