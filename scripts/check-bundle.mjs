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

let failures = 0;
let mockChunks = 0;
for (const file of walk('dist')) {
  if (/mock/i.test(file)) {
    mockChunks += 1;
    continue;
  }
  const text = readFileSync(file, 'utf8');
  for (const needle of FIXTURES) {
    if (text.includes(needle)) {
      console.error(`FAIL ${file}: contains "${needle}"`);
      failures += 1;
    }
  }
}

if (mockChunks === 0) console.warn('note: no mock chunk found in dist (fixtures fully tree-shaken)');
if (failures) {
  console.error(`bundle guard: ${failures} fixture leak(s)`);
  process.exit(1);
}
console.log(`bundle guard: clean (${mockChunks} mock chunk(s) excluded)`);
