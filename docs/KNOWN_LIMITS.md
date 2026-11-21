# Known limits

Everything below is what this build actually does and what remains unverified. Do not treat the list as a roadmap promise.

## F1 — free providers: Lite mode + stability (this build)

Verified in this workspace:

- `npx tsc -b` clean; `npx vitest run` **121/121**, including 23 new tests: Lite selection/shaping (`src/engine/providers/__tests__/lite.test.ts`), serial queue + backoff + Retry-After parsing (`queueBackoff.test.ts`), and a fake OpenAI-compatible endpoint (`fakeServer.test.ts`) that streams SSE, counts concurrent requests, returns 429/400/403 and errors mid-stream.
- Two concurrent turns to one provider reach the endpoint one at a time (max concurrency 1); different providers still run in parallel. A 429 with `Retry-After: 2` is retried once after 2 s; `Retry-After: 120` is reported as a `rate` error without sleeping; 400/403 and a stream that already produced a delta are never retried.
- Lite mode control on `/settings/providers` (AR/RTL, real Chromium): the `on` choice is written to `fc.lite`, survives a reload, and `crossOriginIsolated` stays `true`. No console output was captured.
- Ten real keyless requests from this VM (details in `docs/PROGRESS.md`): LLM7 catalog + short chat + agent-sized chat all **200/SSE** with CORS `*`; Kilo catalog + chat **200/SSE** but **without** `Access-Control-Allow-Origin`; OVH catalog plain **200**, `Bearer anonymous` **403**, chat `gpt-oss-20b` **429**, chat `clef-flash` **404 model_not_found**.

Not verified / still missing:

- **No app-level streamed reply was completed on LLM7.** In the browser, LLM7's catalog returned **200** (89 models, CORS `*`) and small streamed chats returned **200 + SSE** straight from the page, but every composer turn ended in **429**: LLM7 reserves the *requested* `max_tokens` against a small anonymous budget (1024 → 429, 256/64 → 200 in the same minute), and by the end of the probing the IP's allowance was gone (`retry in 39345 seconds`). The UI behaved correctly — Lite banner, 429 error card, `lite.reduced` banner on the smaller retry, Retry button — but a rendered streamed answer through the app is still unverified.
- **Lite retries once with a smaller budget** (`LITE_REDUCED_MAX_TOKENS = 256`) when a keyless turn is rate limited before any output. That is what LLM7 needs per request, but it cannot beat a fully spent daily allowance.
- **Kilo remains unusable in a browser.** The service answers 200 to curl but sends no `Access-Control-Allow-Origin`, so the app keeps reporting it as unreachable/CORS-blocked. Nothing client-side can fix that.
- **OVH is keyless but rate limited.** The built-in no longer sends `Bearer anonymous` (403). Plain chat works at the transport level but returned `429 API rate limit exceeded` with no `Retry-After` header, so the UI can only show the generic rate error and the short cooldown.
- **LLM7 catalog now declares paid pricing** for all 89 models (USD per 1M tokens, `tier: pro|turbo`). None is marked `free`, so they stay behind "Show all" until selected or probed. Keyless requests still return 200.
- **Lite mode is chat-only by design.** The agent loses file/edit tools while it is on; the banner says so. There is no per-turn override control in the composer.
- **Queue is in-memory only.** Two tabs of the same profile still send independently.

## F2 — CodeMirror 6 editor + xterm (this build)

Verified in this workspace:

- `npx tsc -b` clean; `npx vitest run` **125/125**, including the new `src/lib/__tests__/lazyHeavy.test.ts` guard.
- `npm run build` emits `CodeEditor-*.js` (551.9 kB, 192.9 kB gzip) and `XTerm-*.js` (335.8 kB, 85.4 kB gzip) as separate chunks; the entry stays 484.1 kB (143.7 kB gzip). `node scripts/check-bundle.mjs` stays clean.
- Real Chromium against the production build: the Files panel's "New file" creates `notes.md`, opens an editor tab and mounts CodeMirror (`.cm-editor` + `.cm-gutters`); typing `# Notes` marks the file dirty; "Compare" swaps in `@codemirror/merge` (`2` editors, `2` changed-line marks); the terminal tab mounts xterm.js, prints `terminal.banner`, echoes `ls` and answers with `terminal.noRuntime`, then shows a fresh prompt.

Not verified / still missing:

- The terminal executes nothing: xterm.js is only a renderer until the runtime phase adds a shell (WebContainer/Pyodide).
- Compare diffs the saved file against the working buffer. There is no history diff, no per-hunk accept/reject in the editor, and no syntax language for languages outside the bundled set (everything else is plain text).
- Editor and terminal were checked at desktop width only; the phone layout of the tool pane was not re-checked.
- The new `createFile` store action creates flat `notes*.md` files; folders, uploads and renaming in the Files panel are still toasts or unimplemented.

## F3 — real service logos (this build)

Verified in this workspace:

- `npx tsc -b` clean; `npx vitest run` **129/129**, including `src/lib/__tests__/brandLogos.test.ts` (every integration resolves a mark except Slack; every provider/preset id either resolves or is listed in `NO_BRAND_LOGO`; every mark has a path and a six-digit hex).
- `npm run build` ok and `node scripts/check-bundle.mjs` clean. The entry chunk grows from 484.1 kB (143.7 kB gzip) to 508.6 kB (155.2 kB gzip) because the icon paths are static data; `CodeEditor` (192.9 kB gzip) and `XTerm` (85.4 kB gzip) remain separate lazy chunks.
- Real Chromium against the production build: `/integrations` renders 15 of 16 marks in 52 px white tiles, each in its own brand hex (`rgba` checked per tile); Slack renders its monogram. `/settings/providers` renders the OVH mark on `ovh-anon` and the generic glyph on `llm7`/`kilo-free`. The Add-provider dialog renders OpenRouter, Google Gemini, Anthropic, DeepSeek, Mistral, Ollama and LM Studio marks, with OpenAI, Groq, xAI and Together on the generic glyph. `/connect/github` renders the GitHub mark beside the Freecode logo. Only one Chrome `Password field is not contained in a form` hint appeared in the console.

Not verified / still missing:

- **Seven brands have no mark.** `simple-icons` does not ship Slack, OpenAI, xAI (removed over trademark policy) or Groq, Together, Kilo and LLM7 (never included). Their tiles keep the monogram or the generic `Zap` glyph rather than an invented path; `NO_BRAND_LOGO` records them.
- Brand hexes are the vendors' published colours, which is the one place a literal colour is intentional; everything else still comes from theme tokens.
- Marks were inspected at desktop width only, and not with the high-contrast or reduced-motion settings.

## F0 — demo data removal (this build)

Verified in this workspace:

- The production bundle contains no demo fixtures (`VEXORA`, `AndroidHarness`, `Clone Website Request`, `Design System Extractor`, `24.7M`, `mohammed-hamra`, `feature/activity-ui`, fake key literals). `node scripts/check-bundle.mjs` passes and `src/lib/__tests__/noFixtures.test.ts` fails the build if a fixture string returns outside `src/lib/mock/`.
- Fixtures live only in `src/lib/mock/` and are reached through `await import('./lib/mock/scenario')` when `?mock=1`; the entry chunk no longer includes them.
- A fresh profile (real Chromium against `scripts/serve-dist.mjs`, `crossOriginIsolated === true`) shows: one blank chat, "What should we build?", no projects, "No files yet", "No activity yet", "No checkpoints yet", "Nothing to commit", "No plan yet", Sites "No sites yet", usage zeros, Account "Guest", Project settings "No project". AR/RTL checked on the home screen. No page errors on `/`, `/sites`, `/integrations`, `/settings/{general,project,account,usage}`.
- Screenshots: `docs/verification/f0-home-empty.png`, `f0-home-empty-ar.png`, `f0-sites-empty.png`, `f0-files-empty.png`, `f0-overview-empty.png`.

Not verified / still missing:

- The rejection of every fixture string is checked in source and in `dist/assets/*.js` only; it does not audit future chunks produced by F1–F9.
- Playwright's bundled Chromium could not be downloaded in this VM, so `npm run test:e2e` was not executed; the same checks were done in the cloud Chromium.
- The agent's project FS starts empty, so a real project cannot be read by the agent until F4/F5.

## Verified in this workspace

- `npx tsc -b` passes (strict).
- `npx vitest run` passes: **95 tests** covering the SSE parser (fragmented chunks, multi-byte, comments, `[DONE]`, early end), both adapters (text, reasoning, tool-call fragments, object arguments, inline thinking, mid-stream errors), errors/status mapping, sliding-window rate counter, key pool/cooldowns, fallback decisions, catalog parsing/fetch shape, model catalog grouping/defaults, edit application (exact/multiple/fuzzy/indent/trailing newline), write guard, manifest diff, grep, system prompt, agent loop (tool run, permission ask/deny), vault AES-GCM round-trip and passphrase verify, redactor, path safety, the `MemoryFS` ProjectFS contract, EN/AR key parity, popover opacity/contrast and z-index order.
- `npx vite build` passes (≈143 KB gzip JS); `dist/` contains `_headers` and `_redirects`.
- **Cloudflare Pages target:** `<project>.pages.dev` serves `dist/`. `public/_headers` sets `cross-origin-opener-policy: same-origin` and `cross-origin-embedder-policy: credentialless`; `public/_redirects` maps `/*  /index.html  200` for SPA deep links; `.node-version` pins Node 20. The production deployment (`https://freecode-2j3.pages.dev`, `main`) was checked with `curl -I`: `HTTP/2 200`, `cross-origin-opener-policy: same-origin`, `cross-origin-embedder-policy: credentialless`, and a deep link (`/settings`) answers 200 through the SPA fallback. `crossOriginIsolated` inside the deployed tab, and therefore the WebContainers runtime, still has to be verified in a browser once F4 lands.
- **Browser model catalogs and providers (production build, local `vite preview`, real Chromium) — historical, partially superseded by F1 above:**
  - `llm7`: catalog **200 / 86 models**. Tests probe up to three of the provider's own chat models: `gemini-3-flash` → **401 needs key**, `gemini-3.0-pro-image` and `gemini-3.1-flash-image` → **400 no tools**. `gemma-3-27b` probed **400 "does not support tools"** and is marked reply-only. `gpt-oss:20b` probed **200 OK with tools** and became the selected model (`health: ok`).
  - `kilo-free`: catalog fails in the browser (`net::ERR_FAILED`, then `ERR_BLOCKED_BY_RESPONSE.NotSameOrigin`; DevTools reports no `Access-Control-Allow-Origin`). The app labels it "Cannot reach the service from your network" because both the CORS and `no-cors` probes are blocked by the browser; after two failures it starts a 30s cooldown (countdown shown) instead of retrying continuously.
  - `ovh-anon`: catalog request with `Authorization: Bearer anonymous` returns **403**; a plain GET without that header returns **200**. F1 removed the anonymous header from the built-in provider, so this paragraph only describes the old configuration.
- **Real send path:** a real `مرحبا` message to `gemma-3-27b` streamed through the no-tools path: the app showed the persistent banner "This model has no tools: it only replies…" and produced no fake answer. The provider then answered **HTTP 429** (free token allowance). Repeating with the tools-capable `gpt-oss:20b` also returned **HTTP 429** for the full agent payload (long system prompt + tool schemas), while tiny direct requests to the same model returned **200**. **No successful streamed reply was observed through the app UI**; the provider's free per-minute token allowance was not enough for the agent request. The error card was shown instead of a fake reply.

## Unverified or not implemented

- **Catalog requests can be rate-limited.** After the tests above, `kilo-free` catalog calls from this VM started failing with `TypeError: Failed to fetch` for both the app and a plain `fetch`, while the same URL had returned 200 minutes earlier. That is an egress/IP restriction, not a code path failure; the catalog request itself now omits `Content-Type` (a regression test covers it).
- **A successful streamed reply is still unverified in the browser.** Streaming itself is covered by unit tests against recorded SSE, and the direct tiny requests returned 200, but LLM7's free allowance rejected the full agent payload with 429 and no paid key was available. The 429 shows up as a model error card, and the generic Retry button now re-sends the last user message.
- **The Playwright screenshot suite exists (`tests/visual/floating.spec.ts`, `npm run test:visual`) but was not executed here**: the browser download did not finish on this runner. The same screenshots were taken through the cloud browser instead (`artifacts/visual/publish-{dark,light,alpine,dune,ember}.png`, `model-sheet-mobile.png`) and inspected: menus are opaque `rgb(...)` (no alpha), sized 250px under the Publish button, and the phone model picker is a 390px bottom sheet with a drag handle; dragging it down closed it.
- **Auth bridge / Firebase sign-in is not implemented.** There is no `/auth-bridge.html`, no Firebase SDK, and no login screen. The UI runs as a single local profile. `SETUP.md` documents what the owner must add.
- **WebContainers runtime is not implemented.** `RuntimeBanner` detects the missing cross-origin isolation (`SharedArrayBuffer`) and shows the limited-mode banner. The system prompt tells the model there is no runtime. Commands/terminal/preview remain UI-only.
- **The development preview (`*.style.dev`) is not cross-origin isolated**, so it will always show the limited banner.
- **Git, GitHub REST, MCP, integrations, skills execution and OAuth are not implemented.** The panel remains a UI mock for those areas.
- **The live agent uses an in-memory project FS** seeded from the mock file contents, per session. Edits do not persist to OPFS and are lost on reload.
- **Backups are JSON, not the `.freecode` ZIP** described by the engine prompt. Import restores settings and sessions only.
- **Passphrase lock** is exposed as crypto helpers (`createVerifier`/`verifyPassphrase`) but is not wired into a lock screen; the vault always uses the device key.
- **Model catalog is empty until refreshed.** In real mode an empty or untested catalog now produces the "No working free model right now" card with Add my key / Retry instead of the demo scenario. The demo scenario is reachable only with `?mock=1`.
- **Unverified pricing is hidden by default.** Models whose catalog entry has no `free` flag, zero pricing or `:free` suffix are listed only under "Show all"; the LLM7 catalog currently declares no pricing, so its models rely on that list (or on an explicit selection) even though the service is keyless.
- **HTTP 403 vs CORS cannot always be separated.** When a JSON endpoint rejects both the CORS and the `no-cors` probe (Chrome's ORB), the app reports a network failure even though DevTools shows a missing `Access-Control-Allow-Origin`. Kilo is currently in this state.
- **Free-provider consent dialog** is not implemented as a blocking dialog; the Providers tab explains that keys stay on device, but the "shared free service" consent copy is not shown on first use.
- **Provider request log, usage accounting from real usage, compaction, recovery card, multi-tab locks, PWA, CSP enforcement, and the 5 templates are not implemented.**
