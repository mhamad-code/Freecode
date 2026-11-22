#!/usr/bin/env node
/**
 * F0 bundle guard: the production entry chunks must not contain demo fixtures.
 * The mock chunk (loaded only from ?mock=1) is allowed to.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

if (!existsSync('dist')) {
  console.error('bundle guard: dist/ is missing. Run `npm run build` first.');
  process.exit(1);
}

const CLAIMS = [
  'Cloud browser',
  'cloud browser',
  'The agent can open pages, click, type',
  'Agent is browsing',
  'Screenshot sent to agent',
  'A rendered page, right inside your workspace.',
  'Mission: ship the multi-page build',
  'mohammed@example.com',
  'mhamad-code',
  'MacBook Pro · Chrome',
];

const FIXTURES = [
  'VEXORA',
  'AndroidHarness',
  'Clone Website Request',
  'Design System Extractor',
  '24.7M',
  'mohammed-hamra',
  'feature/activity-ui',
  'ghp_2f9a7c4e1b',
  'sk-live-9f2b',
];

const walk = (dir, out = []) => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith('.js')) out.push(full);
  }
  return out;
};

const walkSource = (dir, out = []) => {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walkSource(full, out);
    else if (/\.(ts|tsx)$/.test(entry) && !/__tests__/.test(full)) out.push(full);
  }
  return out;
};

let failures = 0;
let mockChunks = 0;
for (const file of walk('dist')) {
  if (/mock/i.test(file)) {
    mockChunks += 1;
    continue;
  }
  const text = readFileSync(file, 'utf8');
  for (const needle of [...FIXTURES, ...CLAIMS]) {
    if (text.includes(needle)) {
      console.error(`FAIL ${file}: contains "${needle}"`);
      failures += 1;
    }
  }
}

if (mockChunks === 0) console.warn('note: no mock chunk found in dist (fixtures fully tree-shaken)');
const source = walkSource('src').map((file) => readFileSync(file, 'utf8')).join('\n');
for (const needle of CLAIMS) {
  if (source.includes(needle)) {
    console.error(`FAIL src: still claims "${needle}"`);
    failures += 1;
  }
}
if (failures) {
  console.error(`bundle guard: ${failures} false-claim leak(s)`);
  process.exit(1);
}
console.log(`bundle guard: clean (${mockChunks} mock chunk(s) excluded)`);
