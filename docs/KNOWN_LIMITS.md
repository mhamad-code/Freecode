# Known limits

Everything below is what this build actually does and what remains unverified. Do not treat the list as a roadmap promise.

## Verified in this workspace

- `npx tsc -b` passes (strict).
- `npx vitest run` passes: **65 tests** covering the SSE parser (fragmented chunks, multi-byte, comments, `[DONE]`, early end), both adapters (text, reasoning, tool-call fragments, object arguments, inline thinking, mid-stream errors), errors/status mapping, sliding-window rate counter, key pool/cooldowns, fallback decisions, edit application (exact/multiple/fuzzy/indent/trailing newline), write guard, manifest diff, grep, system prompt, agent loop (tool run, permission ask/deny), vault AES-GCM round-trip and passphrase verify, redactor, path safety, the `MemoryFS` ProjectFS contract, and EN/AR key parity.
- `npx vite build` passes (≈139 KB gzip JS).

## Unverified or not implemented

- **Live provider calls were not exercised from this sandbox.** CORS behaviour of `kilo-free`, `llm7`, `ovh-anon`, Gemini, OpenRouter etc. is unknown here. The UI marks a provider unreachable when its catalog request fails; enable "Refresh" in Settings → Providers on a real browser to populate models, then chat goes live.
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
