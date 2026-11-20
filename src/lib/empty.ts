import type { GitState, UsageReport } from './types';

/** A profile that has never run anything: zeros, not demo numbers. */
export const EMPTY_USAGE: UsageReport = {
  messages: 0,
  tokens: '0',
  input: '0',
  output: '0',
  cached: '0',
  bars: [],
  streak: { current: 0, longest: 0, active: 0 },
  heat: [],
};

/** A repository that has no changes and no commits yet. */
export const EMPTY_GIT: GitState = {
  branch: 'main',
  ahead: 0,
  behind: 0,
  files: [],
  commits: [],
  branches: [{ name: 'main', current: true, ahead: 0, behind: 0 }],
};
