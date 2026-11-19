# AGENTS.md — Freecode non-negotiables

- Stack: Vite 5 + React 18 + TypeScript (strict) + Tailwind 3. Zustand for UI state. No server owned by us.
- **No hard-coded colors.** Use the CSS variables/theme tokens in `src/themes/registry.ts` and `src/styles/index.css`.
- **All UI strings go through i18n** (`src/lib/i18n.ts`), English and Arabic. A unit test fails when a key exists in one language only.
- **No secrets in the model context, logs, exports, or URLs.** Secrets live only in `src/storage/vault.ts` (AES-GCM). Every string leaving the engine must pass `src/engine/redact.ts`.
- **No server code.** Model traffic goes from the browser straight to the provider the user chooses.
- **Never claim something works without running it.** Report failures and unverified assumptions in `docs/KNOWN_LIMITS.md`.
- Keep the mock agent selectable (`?mock=1`) and default when no provider is configured.
- RTL applies to content text only; the app chrome stays anchored to the left.
