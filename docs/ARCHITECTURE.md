# Architecture

Browser-only agent. No server of ours. Model traffic is `fetch` from the tab to the provider the user picks.

```
UI (React) ──► store.send ──► lib/agentClient.local.ts ──► engine/agent/loop.ts
                                   │
                                   ├─ engine/providers/registry.ts ─► SSE parser ─► adapters
                                   ├─ engine/agent/tools/*  ─► lib/projectBridge.ts ─► storage/projectFs (OPFS | IDB)
├─ runtime/*  ─► WebContainer (lazy) ─► jsh shell + static preview server
                                   ├─ engine/agent/permissions.ts + lib/checkpoints.ts (restore)
                                   ├─ store.writeProjectFile ─► syncFile ─► container
                                   └─ storage/vault.ts (AES-GCM keys)
```

## Module map

| Path | Responsibility |
|------|----------------|
| `src/engine/providers/sse.ts` | Robust SSE parser (partial chunks, multi-byte, comments, `[DONE]`). |
| `src/engine/providers/adapters/openaiCompatible.ts` | OpenAI-compatible request builder + streaming parser. `parseOpenAIStream` accepts the `data:` payload strings. |
| `src/engine/providers/adapters/anthropic.ts` | Anthropic Messages API request builder + typed-event parser. |
| `src/engine/providers/registry.ts` | Catalog refresh, headers/auth, first-byte + idle timeouts, `chat()` and `testConnection()`. |
| `src/engine/providers/catalog.ts` | Catalog parsers (`openai`, `openrouter`, `kilo`), staleness, retirement, default-model choice. |
| `src/engine/providers/capabilities.ts` | Family inference and reported-value precedence. |
| `src/engine/providers/keys.ts` / `fallback.ts` / `rateLimit.ts` / `errors.ts` | Key pools/cooldowns, fallback decisions (never replay after output), sliding-window counter, typed errors. |
| `src/engine/providers/lite.ts` | Lite mode: compact request for free providers with tight token limits (no tools, ≤1024 output tokens, one retry at 256 when the service rate-limits the reservation). |
| `src/engine/providers/queue.ts` | One in-flight request per provider, shared by `chat` and `refreshCatalog`. |
| `src/engine/providers/backoff.ts` | Retry-After aware retry policy (default one extra attempt, never after output). |
| `src/engine/providers/builtin/freeProviders.ts` / `presets.ts` | Keyless free providers and bring-your-own-key presets. Model ids are never hard-coded. |
| `src/engine/agent/loop.ts` | The run loop: model → tools → permission → results → final. Step limit and repeated-call guard. |
| `src/engine/agent/prompt.ts` | Ordered system prompt. |
| `src/engine/agent/permissions.ts` | Shell risk classifier and per-mode decisions. |
| `src/engine/agent/checkpoints.ts` | Manifest snapshots and diffs. |
| `src/engine/agent/tools/edit.ts` | Unique exact match, whitespace-normalized fuzzy match with indentation rebasing, write guard. |
| `src/engine/agent/tools/fs.ts` / `search.ts` | File tools over `ProjectFS`, and a pure grep implementation. |
| `src/engine/redact.ts` | Central secret redactor. |
| `src/storage/db.ts` | IndexedDB schema (`freecode:<profileId>`), upgrade, typed repositories. |
| `src/storage/vault.ts` | AES-GCM 256 device key in IndexedDB + PBKDF2 passphrase verifier helpers. |
| `src/storage/projectFs/*` | `ProjectFS` contract, path safety, SHA-256 snapshots, OPFS primary + IndexedDB fallback + in-memory backend. |
| `src/storage/migrations.ts` | Numbered, pure data migrations. |
| `src/lib/agentClient.local.ts` | Implements the live turn for the UI using the registry and the session's persisted `ProjectFS`; mounts the editor's files before the turn and reports every write back. |
| `src/lib/projectBridge.ts` | One cached `ProjectFS` per session (`createProjectFs`) plus `mountProjectFiles`/`readProjectFile`, shared by the agent and the store. |
| `src/lib/checkpoints.ts` | Per-turn file snapshots (capped at 20 per session), `diffContents`, `treeFromContents`, and `exportCheckpoints`/`restoreCheckpoints` for the profile snapshot. |
| `src/lib/persist.ts` | One profile snapshot in IndexedDB (`meta/profile` in `freecode:local`): sessions, active chat, files and checkpoints. Hydrates before the first render, autosaves on a debounce and on `pagehide`. |
| `src/lib/archive.ts` | The `.freecode` ZIP (fflate): `manifest.json` + `files/<path>`, with path checks on both export and import. |
| `src/lib/providersStore.ts` | Provider configs in `localStorage`; keys in the vault. |
| `src/lib/backup.ts` | Reads the older JSON backup format (still accepted on import). |
| `src/lib/brandLogos.ts` | `simple-icons` marks keyed by our integration/provider ids, their brand hex, and `NO_BRAND_LOGO` for the brands the package does not ship. |
| `src/components/ServiceLogo.tsx` | `BrandGlyph`, the integrations `ServiceTile` and the provider `ProviderMark`; monogram/generic fallback when no mark exists. |
| `src/components/CodeEditor.tsx` | CodeMirror 6 editor + `@codemirror/merge` compare view. Reached only through `lazy()` from `ToolPane`. |
| `src/components/XTerm.tsx` | xterm.js terminal surface, themed from the live CSS variables. With cross-origin isolation it is wired to the container shell; otherwise it echoes and answers with the honest no-runtime line. Lazy chunk. |
| `src/runtime/webcontainer.ts` | Capability check (`runtimeSupport`), the single lazy `import('@webcontainer/api')` and `WebContainer.boot({ coep: 'credentialless' })`. |
| `src/runtime/workspace.ts` | Converts the flat `path → contents` map into a `FileSystemTree`, mounts it into the container, and writes editor saves through (`syncFile`). |
| `src/runtime/terminal.ts` | Bridges an xterm surface to `container.spawn('jsh')`: input, output stream and resize. |
| `src/runtime/previewServer.ts` / `preview.ts` | The static server written into `.freecode/preview-server.cjs` and the runner that waits for the `server-ready` event on port 5173. |
| `src/runtime/state.ts` / `index.ts` | External store for boot/preview state and the public runtime facade used by the panels. |

## Provider contract

`ProviderConfig` is defined in `src/engine/providers/types.ts`. It holds no secrets: only key refs and header names. Secrets are fetched from the vault by `getSecret(providerId, keyId)`.

`ProviderRegistry.chat(providerId, ChatRequest, onDelta?)`:
1. Picks a key (`pickKey`) and resolves its secret from the vault.
2. Builds headers (`bearer`, custom `header`, or none) and the provider-specific body.
3. `fetch` with a first-byte timeout (default 60 s), then an idle-stream timeout (default 90 s).
4. Parses the stream with the protocol adapter, emitting `{type:'text'}` / `{type:'thinking'}` deltas.
5. Maps non-2xx responses to `ProviderError` with a code, `Retry-After`, and a hint.

Fallback rules live in `decideFallback`: never retry or switch once output has started; quota/auth/model-not-found switch immediately; rate/server/network/timeout retry first, then switch.

The registry itself serializes requests per provider (`SerialQueue`) and retries rate/server/network/timeout failures once through `withBackoff`, honoring `Retry-After` and refusing to retry after the first delta. Lite mode (`lite.ts`) is applied in `lib/agentClient.local.ts` before the turn starts.

## Local data

- IndexedDB database `freecode:<profileId>`, stores listed in `src/storage/db.ts`.
- Project files: OPFS at `/profiles/<pid>/projects/<projectId>/tree/…`, with an IndexedDB fallback that persists an in-memory snapshot.
- Vault: non-extractable AES-GCM key in IndexedDB (`vaultKeys`), encrypted items in `vaultItems`.
- Profile: `meta/profile` holds `{ version, savedAt, activeSessionId, sessions, files, fileContents, checkpoints }`, written by `lib/persist.ts`. `main.tsx` loads it before rendering.
- Backup format: a `.freecode` ZIP with `manifest.json` (`format:"freecode"`, `version:1`, `createdAt`, `activeSessionId`, `settings`, `sessions`, `checkpoints`) and `files/<path>` entries. The settings import still accepts the older `{ format:"freecode-backup", version:1 }` JSON.
- PWA: `public/manifest.webmanifest` plus `public/sw.js` (shell precache, network-first navigations, cache-on-use assets), registered only in production builds.
