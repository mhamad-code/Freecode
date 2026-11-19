# Owner setup

Freecode is a static front end. You host files; there is no server of ours. Follow only the steps you need.

## 1. Build and host

```bash
npm ci
npm run build      # emits dist/
```

Host `dist/` on any static host. Two header sets are provided:

- `firebase.json` — Firebase Hosting (routes, rewrites and COOP/COEP headers).
- `public/_headers` — Cloudflare Pages / Netlify style.

After deploying, confirm cross-origin isolation:

```bash
curl -I https://<site>/app
# Cross-Origin-Opener-Policy: same-origin
# Cross-Origin-Embedder-Policy: credentialless
```

In DevTools, `crossOriginIsolated` must be `true` for a full runtime. This build does not run WebContainers, so the banner will show until that runtime is added.

## 2. Firebase Auth (not wired in this build)

The engine prompt specifies Google/GitHub sign-in through a non-isolated `/auth-bridge.html`. This build has no auth code. If you add it:

1. Create a Firebase project; enable Hosting and Authentication.
2. Enable Google. For GitHub, create a GitHub OAuth App (Homepage URL = site URL; callback `https://<authDomain>/__/auth/handler`) and paste its client id/secret into Firebase.
3. Add the production domain and `localhost` as authorized domains.
4. Google Cloud Console: configure the OAuth consent screen and a Web client id for Google Identity Services.
5. Put the public Firebase values in `.env` (see `.env.example`). They are public by design; no secret belongs in the bundle.

## 3. Providers

No setup is required to open the UI: with no provider configured, chat uses the built-in demo scenario. To use real models:

1. Settings → Providers → **Refresh** on a built-in free provider to discover models (this makes a catalog request from your browser).
2. Or **Add provider**, choose a preset (OpenRouter, Gemini, Anthropic, OpenAI, DeepSeek, Groq, Mistral, xAI, Together, Ollama, LM Studio), paste a key and Save. The key is stored encrypted in IndexedDB; save is followed by a catalog test.
3. Once a provider has models, new messages use it. Removing the provider returns to the demo scenario.

Provider key and header values never enter model context, logs or exports.

## 4. Optional env

Copy `.env.example` to `.env` and fill what you use. Vite only exposes `VITE_*` variables to the client, so never put a secret there.

## 5. Not included yet

WebContainers (needs a commercial licence for for-profit production use), the auth bridge, Git/GitHub REST, MCP, integrations, OAuth, PWA and the `.freecode` ZIP format. See `docs/KNOWN_LIMITS.md`.
