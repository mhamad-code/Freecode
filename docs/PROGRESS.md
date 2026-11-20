# Progress

Working protocol from `freecode-final-prompt.md` §0. One row per phase; update after every phase.
A phase is **done** only when its exit criterion was verified. Anything not verified here is marked as such.

Legend: `todo` · `in progress` · `done` · `blocked`
Last updated: 2026-11-20.

| Phase | Status | Commit | Verified for real | Not verified / owner action |
|-------|--------|--------|-------------------|------------------------------|
| F0 Remove demo data, real empty states | **done** | `F0` commit on `main` | `npx tsc -b` clean; `npx vitest run` **98/98**; `npm run build` ok; `node scripts/check-bundle.mjs` clean; production bundle (`dist/assets/index-*.js`) contains none of `VEXORA`, `AndroidHarness`, `Clone Website Request`, `Design System Extractor`, `24.7M`, `mohammed-hamra`, `feature/activity-ui`, `ghp_…`, `sk-live-…`; fresh profile in a real Chromium against `scripts/serve-dist.mjs` (`crossOriginIsolated === true`) shows empty states on Home, Sites, Files, Overview, Changes, Plan, Usage (zeros), Account (Guest), Project settings (no project); AR/RTL screenshot taken; no page errors on `/`, `/sites`, `/integrations`, `/settings/{general,project,account,usage}` | Screenshots in `docs/verification/`. Playwright's own bundled Chromium was not downloaded in this VM; the real-browser checks ran through the cloud Chromium instead. |
| F1 Free providers: Lite mode + stability | todo | — | — | Needs fake OpenAI-compatible server tests + ≤10 real requests. |
| F2 CodeMirror 6 editor + xterm | todo | — | — | Today the editor is a plain textarea; terminal is UI-only. |
| F3 Real service logos (`simple-icons`) | todo | — | — | Integrations/providers still use monogram tiles. |
| F4 Runtime (WebContainers, FS, preview) | todo | — | — | No runtime; `RuntimeBanner` reports limited mode. |
| F5 Agent loop/tools/permissions/checkpoints | in progress | — | The live turn already runs `runAgent` with fs/grep/edit tools, permission asks and a checkpoint label | Checkpoints are labels only (no restore), no recovery card, no steering queue. |
| F6 Persistence, export/import, PWA | todo | — | Backup is JSON (settings + sessions) | ZIP `.freecode`, OPFS persistence for chats, PWA missing. |
| F7 Git + GitHub | todo | — | — | Changes/branches are store-only; no isomorphic-git, no PAT flow. |
| F8 MCP, skills, instructions, integrations | todo | — | — | Skills/MCP start empty by design (F0); no MCP client yet. |
| F9 Auth (Firebase bridge) | todo | — | — | Guest mode only; `SETUP.md` documents what is missing. |
| F10 Final QA | todo | — | — | Runs after F1–F9. |

## F0 details

Removed from production paths:

- `src/lib/mock.ts` → **`src/lib/mock/index.ts`** (fixtures only). The agent demo scenario moved to **`src/lib/mock/scenario.ts`** and is loaded with `await import(...)` only when `?mock=1`.
- Store starts empty: one blank chat, no projects, no files, no commits, no integrations connected, no skills, no MCP servers, zero usage. `resetSettings()` now resets to that same empty profile.
- `src/lib/integrations.ts` is the product registry (all accounts empty). `src/lib/empty.ts` holds `EMPTY_USAGE` / `EMPTY_GIT`.
- Overview panel rebuilt on real session data (files/commands/context/cost, real tool actions, checkpoint labels) + empty states; Plan panel is an empty state that switches the chat to Plan mode; Changes keeps "Nothing to commit"; Files/terminal no longer print fake command output (`terminal.noRuntime`); Sites gallery replaced with an honest "No sites yet" state; Settings project tab uses real projects, empty AGENTS.md and no fake secrets; Account tab is a guest local profile (no hard-coded name/email).
- All new strings are in `src/lib/i18n.ts` EN + AR (parity test covers it).
- New guards: `src/lib/__tests__/noFixtures.test.ts` (source scan + no static fixture import) and `scripts/check-bundle.mjs` (dist scan). New dev server: `scripts/serve-dist.mjs` (applies `_headers` + SPA fallback like Pages).

Known gap after F0: the agent's in-memory `ProjectFS` starts empty, so the agent cannot read a real project yet — that arrives with F4/F5.

## Next

F1 next: fake-server tests for Lite mode, queueing, 429 backoff and classification, then a small number of real keyless requests.
