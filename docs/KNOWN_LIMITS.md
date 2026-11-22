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

## F4 — runtime (WebContainers, real FS, preview) (this build)

Verified in this workspace:

- **`crossOriginIsolated` on production is `true`.** In Chrome 156 on `https://freecode-2j3.pages.dev` (deployment `efca4af7`, source `d6ac853`; it was first observed on `da60df30`/`14751e1`), `crossOriginIsolated === true` and `typeof SharedArrayBuffer === 'function'`; the document answers with `cross-origin-opener-policy: same-origin` and `cross-origin-embedder-policy: credentialless`. This closes the F1–F3 open item.
- `npx tsc -b` clean; `npx vitest run` **139/139**, including 10 new runtime tests (file-tree mapping, preview server source is valid JavaScript and listens on the requested port, path-traversal guard, listing fallback, state store, and a scan that no app file statically imports `@webcontainer/api`).
- `npm run build` ok: the entry is 517.1 kB (158.4 kB gzip) and the WebContainer client ships as its own 12.2 kB chunk; the entry chunk contains no `webcontainer` string. `node scripts/check-bundle.mjs` clean.
- **Verified on production itself** (`https://freecode-2j3.pages.dev`, deployment `efca4af7`) in Chrome 156: `crossOriginIsolated === true`, `typeof SharedArrayBuffer === 'function'`, secure context; the Terminal tab attached to the container's `jsh` and ran `node -v` → `v24.22.2`, `pwd` → `/home/project`, and `cat index.html` after writing it; “Live preview” started the in-container server and its iframe (`https://<id>-bsfl--5173--<id>.local-credentialless.webcontainer-api.io/`) rendered the page that had just been written in that shell. Screenshots: `docs/verification/f5-prod-shell.png`, `docs/verification/f5-prod-preview.png`.
- Real Chromium against the production build through `scripts/serve-dist.mjs`: the terminal booted `jsh` inside the container and executed `ls -la`, `echo "<h1>…</h1>" > index.html && cat index.html` with real output; a file created with “New file” and saved in the editor (`notes.md`) was readable inside the container with its content; “Start preview” launched the in-container static server, the panel showed the `…-5173--….local-credentialless.webcontainer-api.io` URL in an iframe, and that iframe rendered the mounted `index.html`. No console errors or warnings were captured.

Not verified / still missing:

- **The preview is a static server, not a dev server.** It serves the mounted files on 5173; it does not run `npm install`, `npm run dev`, or any framework build step, so a project that needs a bundler will not preview yet.
- **The container file system is not persistent.** Files are mounted from the store at boot and saves are written through while the runtime lives, but a reload starts from the store again. The Files list still comes from `useStore`, not from OPFS, so file-list persistence and OPFS hydration remain F6 work.
- **F4 alone did not connect the agent to the container.** The agent edited its own `ProjectFS`; F5 (below) moved it onto a persisted OPFS/IndexedDB FS and pushes each write through `syncFile`, which is what makes agent edits show up in the shell and the preview.
- **Isolation depends on how the page is served.** Cloudflare Pages and `serve-dist.mjs` set COOP/COEP; a bare `vite dev` page is not isolated and therefore shows the limited banner and no shell. The `*.style.dev` preview is isolated only when it serves the built `dist/`.
- The preview was inspected at desktop width only; the 320 px phone frame clips long headings, and no phone-sized interaction test was run.
- `printf` is not available in `jsh` (use `echo` or `node -e`); that is a shell quirk of the container, not an app feature.

## F5 — agent over the real project FS, checkpoints, recovery, steering (this build)

Verified in this workspace:

- `npx tsc -b` clean; `npx vitest run` **150/150**, including 7 new checkpoint tests (`src/lib/__tests__/checkpoints.test.ts`: snapshot isolation from later store writes, per-session ordering, the 20-entry cap, content diff, tree rebuild) and 4 store integration tests (`src/__tests__/storeCheckpoints.test.ts`: agent write → tree + contents, code restore dropping new files, conversation-only restore, queueing a message typed during a run).
- `npm run build` ok: the entry is 521.9 kB (159.8 kB gzip), with `opfs` (2.5 kB) and `idb` (3.6 kB) as separate chunks reached through the existing dynamic `createProjectFs`. `node scripts/check-bundle.mjs` clean.
- **The browser FS is real.** In the dev build, `projectBridge` opened `OpfsFS`; mounting two files returned `written: 2`, a second mount of identical contents returned `0`, `readProjectFile` returned the text, and `walk()`/`list('')` returned `index.html`, `notes/a.txt` and `notes` with relative paths.
- **Checkpoint restore works through the UI** (real Chromium, real store, state seeded through the app's own modules): the marker read `Checkpoint · 1 file`, the dialog read “This checkpoint holds 1 file, and 2 of them differ from the project right now”, and choosing “Restore code only” put `index.html` back to `<h1>before</h1>`, deleted the post-checkpoint `about.html`, kept the two messages, and removed the marker’s changed count.
- **Recovery card**: a failed turn whose checkpoint differed by one file rendered “This run failed after editing files / The project differs from the checkpoint taken before the run: 1 file.”; “Restore files” removed that file, cleared the card and the turn’s recovery flag.
- **Steering queue**: typing during a running turn showed a `Queued: …` chip in the composer, cleared the box, and after the session went idle the queue drained into a new user message (the turn then failed with the honest “no working model” card, which is the provider situation, not the queue).
- Fixed a real defect found by this check: `OpfsFS.list()` and `walk()` built `/name` for top-level entries and threw `Absolute paths are not allowed`, which would have broken the agent’s `grep` and checkpoint snapshots on OPFS.

Not verified / still missing:

- **No end-to-end agent turn ran on a provider.** Every free model was rejected by its provider in this environment (“No working free model right now”), so the write-through was exercised by calling the same bridge the tools use (`writeProjectFile`, `mountProjectFiles`), not by a model-issued `write_file`. A live turn over a configured key is still unverified.
- **Checkpoints live in memory.** They are captured per turn and capped at 20 per session, but nothing persists them or the conversation yet, so a reload loses both (F6).
- **Restore scopes are coarse.** “Conversation only” only drops the messages; “code only”/“both” replace the whole file set with the snapshot, so a file the user edited by hand after the turn is reverted too.
- Restored and agent-written files reach the container only while the runtime is booted (`syncFile` is a no-op before boot).

## F6 — persistence, `.freecode` export/import, PWA (this build)

Verified in this workspace:

- `npx tsc -b` clean; `npx vitest run` **163/163**, including 13 new tests: `src/lib/__tests__/projectBridge.test.ts` (post-checkpoint files deleted from the FS, folders kept when they still hold a file, empty folders pruned, restored contents win), `src/__tests__/storeRestoreProjectFs.test.ts` (a code restore calls the bridge with exactly the removed paths, a conversation-only restore does not), `src/lib/__tests__/archive.test.ts` (round trip, traversal/absolute entries dropped, only `files/` read back, other formats/versions/damaged JSON refused) and `src/lib/__tests__/persist.test.ts` (snapshot round trip, hydration of chats/files/checkpoints, a running turn loaded as stopped, a newer version ignored).
- `npm run build` ok: entry 540.6 kB (168.4 kB gzip); `CodeEditor` and `XTerm` stay lazy chunks, `opfs` and `idb` stay separate. `node scripts/check-bundle.mjs` clean.
- **Real Chromium on the production build** (served by `scripts/serve-dist.mjs` on the isolated preview origin): `crossOriginIsolated === true`; `navigator.serviceWorker.getRegistrations()` reports `/sw.js` active with the page controlled; `link[rel=manifest]` is `/manifest.webmanifest` and that URL answers `application/manifest+json`; `meta[name=theme-color]` was rewritten from the theme's `--bg` token.
- **Reload keeps the workspace**: created `notes.md` through the Files panel, typed “survives a reload”, saved it, sent a mock turn (`persist this chat`) which produced a checkpoint, waited for the debounce and reloaded. After the reload the tab title, both messages, the `Checkpoint · 1 file` marker, the file in the Files list and the editor's `survives a reload` all came back; the IndexedDB snapshot held `sessions[1]`, `files.notes.md` and `checkpoints[1]`.
- **Export works on real data**: Settings → General → Export backup downloaded `freecode-2026-11-22.freecode` (1 338 bytes). Unzipped, it contains `manifest.json` (`format: "freecode"`, `version: 1`, 1 session, 1 checkpoint, the active session id) and `files/notes.md` with the saved text.
- **Import works on real data**: after Reset (empty profile) the archive was sent through the Import file input; the toast read “Backup imported”, the chat returned, and a further reload kept the chat, the checkpoint and `notes.md` with its text.
- **The checkpoint fix is covered**: restoring code now calls `removeProjectFiles` with the paths the snapshot does not have, so the agent's `ProjectFS` loses them too. While testing this, `MemoryFS.remove()` was found not to delete the file at the given path at all (only its descendants); that is fixed and the IndexedDB fallback persists the deletion.

Not verified / still missing:

- **No offline load was exercised.** The service worker is registered, active and controlling, but the network was not cut, so serving the shell from cache after a failure is untested; the install prompt/PWA installation was not exercised either. Registration happens only in a production build.
- **Import replaces the profile rather than merging.** The archive's chats, files and checkpoints become the state; nothing is diffed or combined with what was already there (settings are merged over the defaults as before). There is no drag-and-drop import and no partial/folder-only import.
- **Archive checkpoints are only as good as the archived files.** Each checkpoint's files are embedded in its manifest entry, so a restored checkpoint reverts to those contents, but files referenced only from the checkpoint (and not in `files/`) are not re-created.
- **Persistence is one profile per device and browser.** Nothing is encrypted in IndexedDB (provider keys stay in the vault), opening two tabs writes the same snapshot, and the last tab to save wins — there is no multi-tab lock.
- **The saved snapshot is written on a debounce (800 ms) and on `pagehide`.** A hard crash can lose the last moments of a turn. Sessions are stored whole, not incrementally, so very large histories will make each write heavier.

## H — UI honesty pass (this build)

Verified in this workspace:

- `npx tsc -b` clean; `npx vitest run` **175/175**, including new tests for path validation (empty, `\`, control chars, `.`/`..`, empty segment, long names/paths, duplicates, file used as a folder) and for tree operations (empty folders survive, nested creation, rename rewrites descendants, delete removes only the target subtree).
- `npm run build` now ends with `node scripts/check-bundle.mjs`; the guard fails on the old fake-page claims (`Cloud browser`, `The agent can open pages, click, type`, the rendered demo page, the mission banner) and on the removed demo data, in both `src/` and `dist/`.
- Real Chromium (cloud browser, 390×844) against the production build served by `scripts/serve-dist.mjs` (`crossOriginIsolated === true`): inline new file with an empty-name error, `src/utils/a.ts` created and opened in CodeMirror, empty folder created and still present after a reload (snapshot in IndexedDB), Browser tab with no fake page and an external URL that opens a new tab plus the note, terminal `node -v` → `v24.22.2`, preview iframe rendering `index.html` and the edited text after Save + Reload. Screenshots: `docs/verification/ui-terminal.png`, `ui-preview.png`, `ui-preview-updated.png`.

Not verified / still missing:

- **Playwright was not executed.** `tests/visual/honesty.spec.ts` exists and the config now uses the full bundled Chromium, but `npx playwright install chromium` stalled after the download in this VM and the binary never appeared. The same interactions were exercised through the cloud browser by hand.
- **No generic dead-click crawler.** The audit covered the screens listed in `docs/verification/ui-audit.md`, but not every control in every state; the session-tab context menu (reorder) is still missing.
- **Uploads are capped and partly non-portable.** 512 kB per file, 4 MB per selection; binary files are stored as base64 in the profile (not in `.freecode` archives) and the agent does not see them. Folder upload depends on `webkitdirectory`.
- **The preview still does not run the project.** It is a static server: `npm install`, `npm run dev` and framework builds are not executed. Creating `package.json` plus `index.html` and asking for a Vite dev server will show the static files, not the framework app.
- **OAuth connections are still simulated.** The Integrations screen now says it only records the connection locally; token-based GitHub validation arrives with F7.
- **Some copy is still hard-coded English** in older panels (e.g. a few Settings headings/labels). New strings in this pass are in both languages.
- Compare view still diffs saved vs. working buffer only.

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
- **Cloudflare Pages target:** `<project>.pages.dev` serves `dist/`. `public/_headers` sets `cross-origin-opener-policy: same-origin` and `cross-origin-embedder-policy: credentialless`; `public/_redirects` maps `/*  /index.html  200` for SPA deep links; `.node-version` pins Node 20. The production deployment (`https://freecode-2j3.pages.dev`, `main`, current deployment `efca4af7` from source `d6ac853`) was checked with `curl -I`: `HTTP/2 200`, `cross-origin-opener-policy: same-origin`, `cross-origin-embedder-policy: credentialless`, and a deep link (`/settings`) answers 200 through the SPA fallback. The fallback also answers a missing asset (e.g. `/assets/does-not-exist.js`) with `200 text/html` instead of 404, so a stale chunk path cannot be detected by status code alone — compare content types or hashes. `crossOriginIsolated` in the deployed tab was verified in Chrome 156 during F4: it is `true`, so the WebContainers runtime can boot there.
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
- **WebContainers runtime:** implemented in F4 for isolated pages (see the F4 section). On non-isolated pages `RuntimeBanner` still reports limited mode and the terminal/no-runtime path stays active.
- **The development preview (`*.style.dev`) is not cross-origin isolated**, so it will always show the limited banner.
- **Git, GitHub REST, MCP, integrations, skills execution and OAuth are not implemented.** The panel remains a UI mock for those areas.
- **Older notes in this file are historical.** The live agent now uses the session's persisted `ProjectFS` (F5), restore clears it (F6), and backups are `.freecode` ZIP archives again (F6, with the old JSON still accepted on import).
- **Backups contain the project and the chats, not the provider keys.** Keys stay in the vault and are never written into an archive.
- **Passphrase lock** is exposed as crypto helpers (`createVerifier`/`verifyPassphrase`) but is not wired into a lock screen; the vault always uses the device key.
- **Model catalog is empty until refreshed.** In real mode an empty or untested catalog now produces the "No working free model right now" card with Add my key / Retry instead of the demo scenario. The demo scenario is reachable only with `?mock=1`.
- **Unverified pricing is hidden by default.** Models whose catalog entry has no `free` flag, zero pricing or `:free` suffix are listed only under "Show all"; the LLM7 catalog currently declares no pricing, so its models rely on that list (or on an explicit selection) even though the service is keyless.
- **HTTP 403 vs CORS cannot always be separated.** When a JSON endpoint rejects both the CORS and the `no-cors` probe (Chrome's ORB), the app reports a network failure even though DevTools shows a missing `Access-Control-Allow-Origin`. Kilo is currently in this state.
- **Free-provider consent dialog** is not implemented as a blocking dialog; the Providers tab explains that keys stay on device, but the "shared free service" consent copy is not shown on first use.
- **Provider request log, usage accounting from real usage, compaction, multi-tab locks, CSP enforcement and the 5 templates are not implemented.**
