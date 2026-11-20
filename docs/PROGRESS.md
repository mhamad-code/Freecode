# Progress

Working protocol from `freecode-final-prompt.md` §0. One row per phase; update after every phase.
A phase is **done** only when its exit criterion was verified. Anything not verified here is marked as such.

Legend: `todo` · `in progress` · `done` · `blocked`
Last updated: 2026-11-20.

| Phase | Status | Commit | Verified for real | Not verified / owner action |
|-------|--------|--------|-------------------|------------------------------|
| F0 Remove demo data, real empty states | **done** | `F0` commit on `main` | `npx tsc -b` clean; `npx vitest run` **98/98**; `npm run build` ok; `node scripts/check-bundle.mjs` clean; production bundle (`dist/assets/index-*.js`) contains none of `VEXORA`, `AndroidHarness`, `Clone Website Request`, `Design System Extractor`, `24.7M`, `mohammed-hamra`, `feature/activity-ui`, `ghp_…`, `sk-live-…`; fresh profile in a real Chromium against `scripts/serve-dist.mjs` (`crossOriginIsolated === true`) shows empty states on Home, Sites, Files, Overview, Changes, Plan, Usage (zeros), Account (Guest), Project settings (no project); AR/RTL screenshot taken; no page errors on `/`, `/sites`, `/integrations`, `/settings/{general,project,account,usage}` | Screenshots in `docs/verification/`. Playwright's own bundled Chromium was not downloaded in this VM; the real-browser checks ran through the cloud Chromium instead. |
| F1 Free providers: Lite mode + stability | **done** | `F1` commit on `main` | `npx tsc -b` clean; `npx vitest run` **121/121** (23 new: Lite shaping/selection, serial queue, Retry-After backoff, fake OpenAI-compatible server); `npm run build` ok; `node scripts/check-bundle.mjs` clean; `/settings/providers` in a real Chromium shows the Lite control (AR/RTL), `on` persists in `fc.lite` across reload, `crossOriginIsolated === true`, no console output; 10 real keyless requests documented below | A full streamed reply through the app UI was not re-run today; Kilo stays CORS-blocked in browsers; OVH returned 429 for its chat model. |
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

## F1 details

- **Lite mode** (`src/engine/providers/lite.ts`, preference in `src/lib/liteMode.ts`): `auto` / `on` / `off`, with `auto` enabling it for a keyless service that publishes ≤30 req/min or ≤60 req/h, or that just returned 429. Lite sends one short system prompt, no tools, no reasoning effort, at most 1024 output tokens and the last 8 messages (images and orphan tool results dropped). The chat shows a `lite.banner` notice, and the Providers tab carries the control plus the shared free-service consent copy.
- **Per-provider serial queue** (`src/engine/providers/queue.ts`): `ProviderRegistry.chat` and `refreshCatalog` run one request at a time per provider id, so two turns cannot race into the free per-IP limit; different providers still run in parallel. A rejected task does not poison the queue.
- **Retry-After backoff** (`src/engine/providers/backoff.ts`): retriable failures (rate/server/network/timeout) get one extra attempt by default. The provider's Retry-After wins (seconds, `retry after N`, or an HTTP date), capped at 5 s of delay and 10 s of wait; a longer Retry-After is surfaced to the UI instead of hanging, and nothing is retried once the first delta exists.
- **Classification fix**: `parseRetryAfter` now also accepts an HTTP date.
- **Provider test fix**: `testProviderConnection` now passes its injected `fetchImpl` into the registry (`registryFor(list, { fetchImpl })`), so provider tests no longer silently use the real network.
- **OVH built-in fixed**: `Bearer anonymous` is rejected with 403 now (catalog and chat). The provider is keyless again (`auth.type: 'none'`), matches the catalog's 200 response, and stays limited to ~2 req/min.
- **10 real keyless requests** (from this VM, `Origin: https://freecode-2j3.pages.dev`):
  - LLM7 catalog **200**, CORS `*`, 89 models, prices in USD/1M tokens; `gpt-oss:20b` short chat **200 + SSE**, and an agent-sized payload (long system prompt + tool schema) also **200 + SSE** — no 429 today.
  - Kilo catalog **200** (470 models, e.g. `kilo-auto/free`), chat **200 + SSE** (`nvidia/nemotron-3.5-super-vl:free`), but **no `Access-Control-Allow-Origin`** on either response, so the browser still blocks it.
  - OVH: catalog with `Bearer anonymous` **403**; plain catalog **200** (33 zero-priced models); plain chat `clef-flash` **404 model_not_found**; plain chat `gpt-oss-20b` **429 API rate limit exceeded** (no Retry-After header).
- Note: LLM7 now declares paid pricing for every catalog entry, so no LLM7 model is marked `free` by the catalog; keyless use still works but the models sit under "Show all" unless one is selected or tested.

## Next

F2 next: CodeMirror 6 (lazy) + `@codemirror/merge` + xterm, replacing the plain textarea and the UI-only terminal.
