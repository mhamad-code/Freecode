# Known limits

Everything below is what this build actually does and what remains unverified. Do not treat the list as a roadmap promise.

## Verified in this workspace

- `npx tsc -b` passes (strict).
- `npx vitest run` passes: **77 tests** covering the SSE parser (fragmented chunks, multi-byte, comments, `[DONE]`, early end), both adapters (text, reasoning, tool-call fragments, object arguments, inline thinking, mid-stream errors), errors/status mapping, sliding-window rate counter, key pool/cooldowns, fallback decisions, catalog parsing/fetch shape, model catalog grouping/defaults, edit application (exact/multiple/fuzzy/indent/trailing newline), write guard, manifest diff, grep, system prompt, agent loop (tool run, permission ask/deny), vault AES-GCM round-trip and passphrase verify, redactor, path safety, the `MemoryFS` ProjectFS contract, EN/AR key parity, popover opacity/contrast and z-index order.
- `npx vite build` passes (≈143 KB gzip JS); `dist/` contains `_headers` and `_redirects`.
- **Netlify (live):** <https://freecode-mhamad.netlify.app>. Response headers carry `cross-origin-opener-policy: same-origin` and `cross-origin-embedder-policy: credentialless`; in the deployed page `crossOriginIsolated === true`, `SharedArrayBuffer` is a function, and the "Limited runtime" banner does not render. Deep links such as `/settings/providers` return 200 through `_redirects`.
- **Browser model catalogs (from the deployed origin, one run):** `kilo-free` 200 / 473 models; `llm7` 200 / 85 models; `ovh-anon` 200 / 33 models. In the app, refreshing LLM7 reported "Connected · 85 models" and stored 85 models with `corsStatus: ok`.
- **Real send path:** with 85 LLM7 models discovered, a composer message selected a discovered model (`anthropic/claude-opus-4-6`) and the provider answered HTTP 401; the turn showed the error card with the message and hint instead of a fake reply. **No successful completion through the app UI was observed** because that discovery list marks some paid models as tool-capable; the local follow-up (treat every keyless model as free so the default picks a free model) is committed but **could not be deployed**: Netlify refused further deploys with "Account credit usage exceeded".

## Unverified or not implemented

- **Catalog requests can be rate-limited.** After the tests above, `kilo-free` catalog calls from this VM started failing with `TypeError: Failed to fetch` for both the app and a plain `fetch`, while the same URL had returned 200 minutes earlier. That is an egress/IP restriction, not a code path failure; the catalog request itself now omits `Content-Type` (a regression test covers it).
- **Provider chat behaviour beyond the 401 path is unverified.** Streaming through the registry is covered by unit tests against recorded SSE, but no paid key was available here to complete a real answer.
- **The Playwright screenshot suite exists (`tests/visual/floating.spec.ts`, `npm run test:visual`) but was not executed here**: the browser download did not finish on this runner. The same screenshots were taken through the cloud browser instead (`artifacts/visual/publish-{dark,light,alpine,dune,ember}.png`, `model-sheet-mobile.png`) and inspected: menus are opaque `rgb(...)` (no alpha), sized 250px under the Publish button, and the phone model picker is a 390px bottom sheet with a drag handle; dragging it down closed it.
- **Auth bridge / Firebase sign-in is not implemented.** There is no `/auth-bridge.html`, no Firebase SDK, and no login screen. The UI runs as a single local profile. `SETUP.md` documents what the owner must add.
- **WebContainers runtime is not implemented.** `RuntimeBanner` detects the missing cross-origin isolation (`SharedArrayBuffer`) and shows the limited-mode banner. The system prompt tells the model there is no runtime. Commands/terminal/preview remain UI-only.
- **The development preview (`*.style.dev`) is not cross-origin isolated**, so it will always show the limited banner.
- **Git, GitHub REST, MCP, integrations, skills execution and OAuth are not implemented.** The panel remains a UI mock for those areas.
- **The live agent uses an in-memory project FS** seeded from the mock file contents, per session. Edits do not persist to OPFS and are lost on reload.
- **Backups are JSON, not the `.freecode` ZIP** described by the engine prompt. Import restores settings and sessions only.
- **Passphrase lock** is exposed as crypto helpers (`createVerifier`/`verifyPassphrase`) but is not wired into a lock screen; the vault always uses the device key.
- **Model catalog is empty until refreshed.** With no discovered model, `liveProviderChoice()` returns null and the chat uses the demo scenario (mock).
- **Free-provider consent dialog** is not implemented as a blocking dialog; the Providers tab explains that keys stay on device, but the "shared free service" consent copy is not shown on first use.
- **Provider request log, usage accounting from real usage, compaction, recovery card, multi-tab locks, PWA, CSP enforcement, and the 5 templates are not implemented.**
