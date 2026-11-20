# Freecode — front-end

The Freecode UI: a browser coding agent with chat, activity runs, a tool pane (files, cloud
browser, terminal, changes, plan), 13 themes, English/Arabic content, integrations and Sites.

Built from `freecode-ui-prompt.md` in the imported kit (`repo/`) with the brand assets from
`repo/assets/brand/` copied to `public/` and `src/assets/brand/`.

## Run

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # type check + production build
npm test         # unit tests (vitest)
npx tsc -b       # strict type check
```

Stack: Vite, React 18, TypeScript (strict), Tailwind CSS, Zustand, react-router-dom,
lucide-react.

## Layout

```
src/
  app/App.tsx          shell, routes, theme application, shortcuts
  styles/index.css     tokens, base styles, component classes
  themes/registry.ts   the 13 presets + applyTheme()
  store.ts             Zustand store, mock run engine and seeded data
  lib/                 types, mock data, i18n (en/ar)
  components/          ui primitives, shell, chat, composer, tool pane
  pages/               Workspace, Settings, Integrations, Connect, Sites
```

## Local engine (this build)

The real engine lives under `src/engine/` and `src/storage/`:

- **Providers** (`src/engine/providers/`): SSE parser, OpenAI-compatible and Anthropic adapters,
  live catalog + capabilities, key pools with cooldowns, fallback decisions, rate-limit counter,
  typed errors, built-in keyless providers and bring-your-own-key presets.
- **Agent** (`src/engine/agent/`): run loop with step limit and repeated-call guard, ordered
  system prompt, risk classifier + permission decisions, checkpoint manifests, file/edit/grep
  tools with a read-before-write guard, and the central redactor.
- **Storage** (`src/storage/`): IndexedDB repositories and schema, an AES-GCM vault, a
  `ProjectFS` contract with OPFS primary + IndexedDB fallback + in-memory backend, and pure
  migrations.

Settings → **Providers** lets you refresh a free provider's catalog or add your own key. Keys are
stored encrypted in IndexedDB and never written to `localStorage`. Once a provider has a
discovered model, `send()` uses `src/lib/agentClient.local.ts`; otherwise it falls back to the
demo scenario. `docs/KNOWN_LIMITS.md` lists what is not implemented yet (auth bridge,
WebContainers, Git/MCP, ZIP backups).

Data: **Settings → General → Data** exports/imports a JSON backup and can reset or delete local
state.

See `docs/ARCHITECTURE.md` and `SETUP.md`.

## Deploy on Cloudflare Pages

The build is static; Cloudflare Pages serves `dist/`. Two files in `public/` are copied into it:
`_headers` (cross-origin isolation) and `_redirects` (`/*  /index.html  200`, SPA routes).
`.node-version` pins Node 20 for the build image.

From a phone:

1. Open the Cloudflare dashboard → **Workers & Pages**.
2. Tap **Create** → **Pages** → **Connect to Git**.
3. Authorize GitHub if asked and pick the `Freecode` repository.
4. Set **Build command** to `npm run build` and **Output directory** to `dist`.
5. Add an environment variable `NODE_VERSION` = `20`.
6. Tap **Save and Deploy**. Every later push to `main` rebuilds automatically.

The GitHub workflow (`build.yml`) only runs `npm ci`, `tsc -b`, `npm test` and
`npm run build`; it does not deploy.

### Check cross-origin isolation after deploy

Open the site, then go to **Settings → General → Data → Runtime status**. It shows the same
values inside the app: runtime state (Full/Limited), whether `crossOriginIsolated` is true, and
the reason when the runtime is limited. The limited banner must not appear on the deployed site.

You can also verify in the browser console:

```js
crossOriginIsolated        // must be true
typeof SharedArrayBuffer   // "function"
```

Or check the response headers:

```bash
curl -I https://<project>.pages.dev/
# Cross-Origin-Opener-Policy: same-origin
# Cross-Origin-Embedder-Policy: credentialless
```

Settings → General → Data → **Runtime status** shows the same values inside the app and
reports the reason when the runtime is limited.

## Swapping the mock agent for a backend

Components never talk to a transport directly. A run is produced by `send()` in `src/store.ts`,
which appends the user message, then drives a *scenario* (`buildScenario`) through
`runScenario`. `runScenario` only mutates session state through the same shapes the UI reads:
text blocks, activity groups with `{ kind, label, value, status }` actions, permission
requests, errors, checkpoints and final text.

To use a real backend, keep those shapes and replace the scenario loop with a stream reader:

```ts
// current: scripted AsyncIterable of steps
// real:    for await (const ev of client.sendMessage(sessionId, text, opts)) { apply(ev) }
```

Events the UI understands: turn start/end, text deltas (stream into the last text block),
tool start/end (push into the current group), `permission.request` (set `turn.permission`,
resolve via `respondPermission`), `file.change`, `usage.update`, `turn.end`.

## Adding a theme

1. Copy any entry in `src/themes/registry.ts` and change its tokens (`bg`, `panel`, `elevated`,
   `line`, `text`, `muted`, `accent`, `accentInk`, and optionally `bgImage` for gradients).
2. Derived tokens (`--hover`, `--edge`, `--code-bg`, diff colours) are computed in CSS from
   those base values, so a theme is only colour data.
3. Register it in `THEMES`. It appears in Settings → Appearance automatically; no component
   changes are needed.

`applyTheme(id)` sets `data-theme` / `data-mode`, writes the CSS variables, updates
`<meta name="theme-color">` and animates the switch. `auto` follows `prefers-color-scheme`.

## Notes

- Motion respects `prefers-reduced-motion` and the Reduce motion setting.
- The integration connect page (`/connect/:service`) is intentionally fixed light and does not
  read app theme tokens.
- Monaco and xterm are represented by lightweight styled editors/terminals in this build; the
  panels and their states match the reference, and both can be swapped in behind the same
  panel components.
