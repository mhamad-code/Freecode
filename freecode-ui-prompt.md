# FREECODE — Full UI Build Prompt (Frontend only)

> Paste this whole file to the coding model, and attach the reference screenshots listed in section 1.
> The file is split into numbered PARTS. Build them in order. Do not skip any part and do not simplify the visual design.

---

## 0. ROLE AND MISSION

You are a senior product designer and front-end engineer. Build the complete **front-end** of **Freecode**: a coding agent that runs fully in the browser. The user chats with an agent that can run terminal commands, read and edit files, use Git, call MCP servers, use skills, use integrations (Figma, Gmail, Slack, ...), and drive a cloud browser.

**This task is UI only.** No real backend. Every agent behavior is simulated by a mock data layer (see PART 14) that sits behind an interface, so a real backend can replace it later without touching any component.

**Quality bar:** the result must look like a polished, professional product. It must match the reference screenshots closely: same density, same dark look, same thin-border "pressable" components, same icon style. Do not invent a generic template look. Where this file gives exact values, use them. Where it says "propose", choose values that fit the existing visual language.

### Non-negotiables
1. Match the reference screenshots (section 1). When this text and a screenshot disagree, the screenshot wins for visuals; this text wins for behavior.
2. The whole app is theme-driven. **No hard-coded colors inside components.** Only CSS variables.
3. Mobile-first (design width 360–440 px), and fully responsive up to desktop (PART 3.6).
4. Every interactive element has all states: default, hover, focus-visible, active/pressed, disabled, loading (where relevant).
5. Every list/panel has an empty state, a loading state and an error state.
6. Everything works with keyboard and screen readers (PART 15).
7. All animations respect `prefers-reduced-motion`.
8. No emoji in the UI. Icons are Lucide, stroke 1.7, round caps.
9. No horizontal page overflow on any screen (the reference Integrations screenshot has a bug where rows are cut at the right edge; do not copy that bug).
10. Product name is **Freecode**. Brand files are in `assets/brand/` of this kit (copy them to `src/assets/brand/` and `public/`). See section 1.1 for exact usage. Use the logo in: drawer header, connect page, favicon, loading screen, empty states.

---

## 1. REFERENCE SCREENSHOTS (all are in the `references/` folder of this kit; file names start with R01..R17; the text writes them as R1..R17)

| ID | File | What it shows |
|----|------|---------------|
| R1 | references/R01-appearance-themes.png | Settings > Appearance: theme preset picker (Auto, Dark, Light, OG Shine, Alpine, Dune, Tide, Blossom), All/Dark/Light filter |
| R2 | references/R02-usage.png | Settings > Usage: hours bar, activity streak heatmap, last 7 days |
| R3 | references/R03-integrations.png | Integrations page: connected Figma card, popular list |
| R4 | references/R04-settings-general.png | Settings > General (Arabic UI sample): toggles, feedback, auto-archive |
| R5 | references/R05-chat-activity.png | Chat/Code main screen: collapsed activity rows, composer with suggestion |
| R6 | references/R06-activity-reference.html | **Exact reference implementation of the activity display** (code in Appendix A) |
| R7 | references/R07-connect-page.png | Integration connect page (light, fixed, not themed) |
| R8 | references/R08-drawer.png | Slide-in drawer (new chat, projects, hours, streak) |
| R9 | references/R09-files.png | Files panel |
| R10 | references/R10-launcher.png | New-tab launcher (Overview, Cloud browser, Files, Terminal, Changes) |
| R11 | references/R11-cloud-browser.png | Cloud browser tab (empty state) |
| R12 | references/R12-chat-terminal.png | Chat with docked terminal, composer modes, model selector |
| R13 | references/R13-ember-theme.png | "Ember" theme applied to chat (orange accent, gradient background), follow-up buttons, reaction row |
| R14 | references/R14-sites.png | Sites (templates) page |
| R15 | references/R15-color-palettes.png | Color palette board: source of 4 extra themes (Rose, Graphite, Violet, Lagoon) |
| R16 | references/R16-skills.png | Settings > Skills |
| R17 | references/R17-project-settings.png | Settings > Project settings (startup script, secrets) |

Reference rule: each time this file says "(R#)", open that screenshot and copy its proportions, spacing, radius, border weight and icon style.

### 1.1 Brand assets (folder `assets/brand/`)
The Freecode logo is a bold, rounded "F" built from two blocks (a long top bar and a short lower bar joined by a vertical stem), dark green (`#3A4C2F`) on a pale green tile (`#F7FFEF`).
| File | Size | Use |
|------|------|-----|
| `logo.png` / `apple-touch-icon.png` | 180×180 | Full tile (pale square + dark mark). Use as the app icon, the drawer header logo (render at 28–32px with radius 8), the connect-page tile (R7), loading screen, empty states. The pale tile reads well on every dark theme. |
| `logo-mark-light.png` | 180×180, transparent | Mark only, near-white (`#F2F2F3`). Use where a bare mark is needed on dark surfaces (wordmark lockup, toasts, tab icons). |
| `logo-mark-dark.png` | 180×180, transparent | Mark only, original dark green. Use on light surfaces and light themes (Light, Dune, Blossom). |
| `favicon.ico`, `favicon-16.png`, `favicon-32.png`, `favicon-32x32.webp` | 16/32/48 | `<link rel="icon">` set. |
Rules: never recolor or stretch the mark; keep clear space equal to 25% of the mark height; wordmark text "Freecode" is set in the UI font, weight 700, letter-spacing -0.01em, next to the mark with a 8px gap (Arabic UI keeps the Latin wordmark). In `index.html` add: `<link rel="icon" href="/favicon.ico" sizes="any">`, `<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">`, `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`, and `<meta name="theme-color">` driven by the active theme. The source is raster (180px): use `image-rendering: auto`, never display above 64px; a vector version can replace these files later with the same names (change extension in one config constant `BRAND_LOGO`).

---

## 2. TECH STACK (fixed)

- **Vite + React 18 + TypeScript (strict)**. Single-page app. No Next.js, no SSR.
- **Tailwind CSS** with CSS variables for all colors (`bg-[var(--panel)]` style or extended theme mapping). Component-level CSS allowed via CSS modules only when Tailwind is awkward (shimmer, tab shape).
- **Radix UI primitives** (Dialog, DropdownMenu, Popover, Tooltip, Tabs, Switch is custom-styled, ScrollArea, Collapsible, Select). Restyle fully; never use default Radix look.
- **Zustand** for state (with `persist` for theme, layout, settings).
- **react-router-dom** for routing.
- **Monaco Editor** (`@monaco-editor/react`) for the code editor and diff editor. Lazy loaded.
- **xterm.js** (`@xterm/xterm` + fit addon) for the terminal. Lazy loaded. Fed by the mock layer.
- **react-resizable-panels** for resizable docks.
- **lucide-react** for icons.
- **i18next + react-i18next**: English default, Arabic complete. See 2.2.
- **date-fns** for relative times, **clsx** for classes.
- No UI kit (no MUI, no Chakra, no shadcn look-alike defaults).

### 2.1 Project structure

```
src/
  app/            App.tsx, router.tsx, providers.tsx
  assets/brand/   logo.png, logo-mark-light.png, logo-mark-dark.png (see 1.1); no font files (system stack)
  styles/         tokens.css, themes.css, base.css, motion.css
  themes/         registry.ts, presets/*.ts, applyTheme.ts
  components/
    ui/           Button, IconButton, Input, Textarea, Switch, Select, Chip, Card, Badge, Tabs, SegmentedControl,
                  Tooltip, Dialog, Sheet, Menu, Progress, Skeleton, EmptyState, Kbd, Toast, CodeChip
    shell/        TopBar, SessionTabs, Rail, Drawer, PanelFrame, CommandPalette
    chat/         MessageList, UserMessage, AssistantMessage, ActivityGroup, RunHeader, Composer, ModeSwitch,
                  ModelPicker, ContextRing, FollowUps, ReactionRow, PermissionCard, CheckpointMarker, ScrollToBottom
    panels/       Launcher, FilesPanel, BrowserPanel, TerminalPanel, OverviewPanel, ChangesPanel, PlanPanel, PreviewPanel
    settings/     SettingsLayout, tabs/*
    integrations/ IntegrationsPage, IntegrationCard, ConnectPage
    sites/        SitesPage, TemplateCard
  features/       sessions, themes, shortcuts, permissions, checkpoints, usage, activityLog
  lib/            agentClient (interface), mock/ (mock implementation), summarize.ts, format.ts, bidi.ts
  i18n/           en.json, ar.json
```

### 2.2 Language and direction (important)
- UI language: English and Arabic, switchable in Settings > General.
- **The app chrome layout does NOT mirror in Arabic** (see R4: rail, session tabs and Code/Chat toggle stay on the physical left). Only text blocks are bidirectional.
- Every user-content text block (messages, assistant text, titles, input fields, file names, list items) gets `dir="auto"` and `unicode-bidi: plaintext`.
- Arabic bullet lists align to the right and the bullet sits on the right side, as in R13.
- Code, terminal, paths, URLs, diff and inline code chips are always `dir="ltr"` with `unicode-bidi: isolate`.
- Use logical CSS properties (`margin-inline-start`, `padding-inline-end`, `inset-inline-end`) for anything inside content blocks.
- Fonts: `system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans Arabic", "Noto Sans", sans-serif`. Mono: `ui-monospace, "SF Mono", Menlo, Consolas, monospace`.
- Numbers keep Latin digits in both languages.

---

## 3. DESIGN FOUNDATIONS

### 3.1 Spacing, radius, borders
- Base unit 4 px. Common gaps: 4, 8, 12, 16, 20, 24.
- Radius scale: `--r-sm 8px`, `--r-md 12px` (buttons, inputs), `--r-lg 16px` (cards), `--r-xl 18px` (main panel), `--r-2xl 22px` (composer), `--r-full 999px`.
- Border: 1px `--line` for cards/panels; **1.5px `--line-strong` for controls** (inputs, outline buttons, chips, search boxes, segmented controls).
- **"Pressable" edge (signature of this design):** controls and cards have a slightly thicker, darker bottom edge: `box-shadow: 0 3px 0 var(--edge)` (cards use 0 3px 0, small controls 0 2px 0). On press the control moves down 2 px and the edge shrinks to 1 px. Define `--edge: rgba(0,0,0,.42)` in dark themes and `rgba(60,50,30,.18)` in light themes.

### 3.2 Typography scale (px at a 440 px wide viewport)
| Token | Size / line | Weight | Use |
|-------|-------------|--------|-----|
| display | 28 / 1.15 | 700 | Page titles (Sites, Skills, Usage, Integrations) |
| h2 | 17 / 1.3 | 600 | Section headers with leading icon (Composer, Notifications, ...) |
| body-lg | 17 / 1.55 | 400 | Assistant text, "Worked for" header |
| body | 16 / 1.5 | 400 | Inputs, list rows, user messages |
| ui | 15.5 / 1.3 | 400 | Activity rows, tab labels |
| small | 13.5 / 1.5 | 400 | Details, descriptions, hints |
| micro | 12 / 1.3 | 500 | Badges, kbd |
| mono | 0.86em of context | 400 | Inline code, paths, terminal |
Scale proportionally on larger viewports: multiply by 1.0 up to 640 px, cap at 1.06 on desktop. Headings are tight; muted text is never below 4.5:1 contrast against its surface (use `--muted`, not `--faint`, for readable text; `--faint` is for placeholders and decorative).

### 3.3 Surfaces (layering, dark base theme)
1. `--bg` app background (outside the main panel).
2. `--panel` the large rounded main panel (R3, R5).
3. `--elevated` cards, inputs, chips inside the panel.
4. `--inverse` light button surface (R3 "Custom", R16 "Discover/Create/Upload") — a light beige/gray with dark text, used on dark themes for secondary-prominent actions.

### 3.4 Component library (build these first, in `components/ui`)

**Button** — height 36 px (hit area expanded to 44 px with padding/pseudo-element), padding 0 14px, radius 12, font 15.5/600.
Variants:
- `primary`: bg `--accent`, text `--accent-ink`, edge shadow darker accent. Used for Create, Publish, Connect, Commit, Approve.
- `inverse`: bg `--inverse`, text `--inverse-ink`, edge shadow. Used for Discover/Create/Upload, Add account, Custom, Add.
- `outline`: bg `--elevated`, 1.5px `--line-strong`, edge shadow. Used for Edit, secondary actions.
- `danger`: bg `--danger`, white text, edge darker red. Used for Disconnect, Remove, Delete.
- `ghost`: transparent, no border, text `--muted`; hover bg `--hover`.
States: hover = brightness +6% and translateY(-1px); active = translateY(2px), edge 1px; focus-visible = 2px ring `--focus` with 2px offset; disabled = 45% opacity, no edge, cursor not-allowed (primary disabled in the connect page becomes a washed green, see R7); loading = label replaced by spinner (16px, 2px stroke), width locked.

**IconButton** — 36×36 (hit 44), radius 10, icon 20 px. Variants ghost/outline. Active/selected state (rail, toolbar): bg `--elevated`, 1.5px `--line-strong`, edge shadow (see rail active icon in R5/R8). Tooltip on hover/long-press after 400 ms.

**Input / Search field** — height 40, radius 12, 1.5px `--line-strong`, bg `--elevated`, edge `0 2px 0`. Leading icon 18px muted. Placeholder `--faint` at opacity 1. Focus: border becomes `--accent`, no glow in app themes (the connect page has its own glow, PART 12). Clear (x) button appears when not empty. Textarea variant for code (monospace, resize handle visible bottom corner as in R17).

**Switch (toggle)** — squircle, not a pill (R4): track 46×28, radius 9; thumb 22×22 radius 7, white. On: track `--accent` with darker bottom edge, thumb right. Off: track `--elevated` with `--line-strong` border, thumb `--muted`. Animation 180ms ease-out; thumb slightly stretches (width 26) while pressed.

**Select / Dropdown trigger** — like Input, trailing chevron-down; value right aligned (R4 "Never ⌄"). Menu: popover radius 14, border, shadow `0 12px 32px rgba(0,0,0,.5)`, items 40px high, selected item has check icon at the end.

**Chip** — height 34, radius 12, 1.5px border, text 15.5. Selected chip (R14 "Featured"): bg `--inverse`, text `--inverse-ink`. Unselected: bg `--elevated`, edge shadow. Chips in a row scroll horizontally with hidden scrollbar and a 24px fade on the clipped side.

**SegmentedControl** — container radius 12 with 1.5px `--line-strong` border, inner padding 3px; selected segment is filled `--accent` with `--accent-ink` text (R1 All/Dark/Light, R12 Build/Plan/Mission/Skills). Selection indicator slides between segments (200ms, ease-out).

**Card** — radius 16, 1px `--line`, bg `--elevated`/`--panel-2`, padding 16, edge `0 3px 0 var(--edge)`. Interactive cards: hover lifts 1px and border brightens; active presses.

**Badge** — height 22, radius 8, px 8, font 12/600. Variants: accent (e.g. "6:43" in R8), neutral, warning (amber), danger, info. Status dot variant: 8px circle, with optional pulse.

**Tabs (settings tabs)** — horizontal scroll row; each tab = leading icon 18px + label; selected tab: bg `--elevated`, 1.5px `--line-strong`, edge shadow, radius 12 (R1, R16). The row scrolls and clips at the edge (R16 shows "Keyb…" clipped) with a fade mask. Auto-scroll the selected tab into view.

**Tooltip, Dialog, Sheet, Toast, Skeleton, Progress, Kbd, CodeChip**
- Dialog: radius 18, backdrop `rgba(0,0,0,.6)` blur 2px, enter scale .96→1 + fade 180ms. On mobile dialogs become bottom sheets (drag handle, swipe down to close).
- Toast: bottom, above the composer, radius 14, auto-dismiss 4 s, with optional action.
- Skeleton: elevated surface with a sweeping highlight (1.4s linear infinite).
- Progress (R2 hours bar): height 6, radius 3, track `--elevated`, fill `--accent` (gray `--faint` when empty/exhausted as in R2).
- CodeChip (R5/R12): inline `<code>` with bg `--code-bg`, 1px border `--code-border`, padding 1px 6px, radius 5, mono 0.86em.

### 3.5 Motion system
```
--ease-out: cubic-bezier(.2,.8,.2,1);
--ease-in-out: cubic-bezier(.4,0,.2,1);
--dur-fast: 120ms;  --dur-base: 180ms;  --dur-slow: 260ms;
```
- Hover/press: `--dur-fast`. Toggles, chips, tabs: `--dur-base`. Panels/drawer/sheets: `--dur-slow`.
- Expand/collapse uses the `grid-template-rows: 0fr → 1fr` technique (see Appendix A), never height animation.
- Drawer slides from the left 260ms with backdrop fade; panels cross-fade 120ms.
- List items entering: fade + translateY(6px→0), 180ms, 30ms stagger (max 8 items).
- Numbers (usage, counters) count up over 600ms, ease-out.
- `@media (prefers-reduced-motion: reduce)`: all durations to ~0, no shimmer, no pulse, no count-up.

### 3.6 Responsive layout rules (summary, details in PART 5)
- `< 640px` (primary design): single column. Rail 52px + main panel. Tool panels open full-width over the chat or as the bottom dock (terminal).
- `640–1023px`: drawer can pin; tool pane opens as a right sheet (width 50%).
- `≥ 1024px`: rail + pinned drawer (280px) + chat + tool pane side by side (resizable, default 55/45), terminal docked under the chat.

---

## PART 4. THEME SYSTEM

### 4.1 Architecture
- A theme is **only a set of CSS variables** plus metadata. Adding a theme later = adding one file in `themes/presets/` and registering it. No component changes.
- `applyTheme(id)` sets `data-theme="<id>"` and `data-mode="dark|light"` on `<html>`, writes variables, and updates `<meta name="theme-color">` and `color-scheme`.
- Theme id and "Auto" preference persist in localStorage. `Auto` follows `prefers-color-scheme` live (listens for changes) and maps to `dark` or `light`.
- Switching animates: `transition: background-color, color, border-color, box-shadow 220ms` on `html`, panels, cards. Add a class `theme-switching` for 300ms during the switch, then remove (prevents transitions from running on every normal render). Never flash white.
- **Glass themes** (those with `bg-image`/gradient + translucent panels): the app background is a CSS gradient stack (no image files). Panels use `background: var(--panel)` (rgba) with `backdrop-filter: blur(var(--glass-blur))`. Provide a fallback solid color if backdrop-filter is unsupported.
- **The integration connect page (PART 12) is fixed light and ignores the theme.** Scope its variables to `.connect-root` and never read global tokens.

### 4.2 Token schema (every theme must define all of these)
```
--bg            app background color (solid fallback)
--bg-image      gradient stack or none
--panel         main panel surface (may be rgba)
--panel-2       secondary panel surface (drawer, dock)
--elevated      cards, inputs
--inverse / --inverse-ink   light-button surface/text
--hover         hover overlay for ghost items
--line          subtle border
--line-strong   control border (1.5px)
--edge          bottom "pressable" edge color
--text / --muted / --faint
--accent / --accent-ink / --accent-edge
--info          thinking + browser/MCP icon color (default blue)
--success       read/edit icon color (default green)
--cmd           terminal/command icon color (default orange)
--warning       amber (permission cards)
--danger / --danger-edge
--code-bg / --code-border
--focus         focus ring color
--glass-blur    0px for solid themes, 14–18px for glass themes
--scrim         drawer backdrop color
--diff-add-bg / --diff-add-line / --diff-del-bg / --diff-del-line
```
Semantic icon colors (info/success/cmd) must stay distinguishable from the accent in every theme (Ember overrides `--cmd` to amber because accent is orange).

### 4.3 The 13 presets (id, label, mode, locked flag as in R1)
Values below are the source of truth. Derive missing tokens (hover, edge, code-bg, diff colors) consistently: `--hover` = text at 6% alpha; `--edge` = darker than panel by ~40% (dark) or text at 14% alpha (light); `--code-bg` = text at 8% alpha over panel; diff add/del use success/danger at 14% alpha backgrounds and 100% for the gutter line.

| id | Label | Mode | bg / background | panel | elevated | line / line-strong | text / muted | accent / ink | locked |
|----|-------|------|-----------------|-------|----------|--------------------|--------------|--------------|--------|
| auto | Auto | follows system | — | — | — | — | — | — | no |
| dark | Dark (default) | dark | #0b0b0c | #121214 | #1b1b1e | #2c2c30 / #3b3b40 | #f2f2f3 / #8e8e93 | #6bb34f / #12301a | no |
| light | Light | light | #ecebe6 | #fafaf8 | #ffffff | #dcdad2 / #c9c6bb | #1b1b1a / #6b6b66 | #5a9e3f / #ffffff | no |
| og-shine | OG Shine | dark | #050505 | #0c0c0c | #151515 | #262626 / #353535 | #f5f5f5 / #8a8a8a | #2ee6b0 / #04261c | no |
| alpine | Alpine | dark glass | gradient: top `#2b3a33` to bottom `#0f1a16`, plus faint mist radial near top-left and a dark pine-silhouette feel via layered radial gradients | rgba(12,20,16,.72) | rgba(255,255,255,.06) | rgba(255,255,255,.12) / rgba(255,255,255,.2) | #eef3ee / #9fb0a4 | #8fd19a / #0c2214 | yes |
| dune | Dune | light glass | gradient: `#f1e6d8` top, `#e2c4a0` middle, `#c98a55` bottom, soft diagonal highlight | rgba(255,250,244,.72) | rgba(255,255,255,.55) | rgba(80,50,30,.16) / rgba(80,50,30,.28) | #2b1d12 / #7a6552 | #c0623a / #ffffff | yes |
| tide | Tide | dark glass | gradient: `#0a2530` top, `#0e4a55` middle, `#1fb5b0` bottom edge (water glow) | rgba(6,22,28,.72) | rgba(255,255,255,.06) | rgba(255,255,255,.12) / rgba(255,255,255,.2) | #e9f7f7 / #8fb8bb | #7fe0d0 / #04302b | yes |
| blossom | Blossom | light glass | gradient: `#fbeef0` to `#f2cfd6`, soft white radial blotches top-right | rgba(255,250,251,.74) | rgba(255,255,255,.6) | rgba(120,40,60,.14) / rgba(120,40,60,.26) | #3a1a22 / #8a6068 | #c8566e / #ffffff | yes |
| ember | Ember | dark gradient | `linear-gradient(160deg,#a8420f 0%,#3a1608 35%,#120905 70%,#070403 100%)` | rgba(22,12,8,.86) | #251710 | #4a2c1c / #5e3924 | #fbf1ea / #b69a88 | #ff8a3d / #2a1204 | no; `--cmd:#e0b341` |
| rose | Rose | dark | #12040a with soft pink radial glow at the corners (`#800021` at 35% alpha) | #1c0811 | #2a0e1a | #4a1a2c / #62243a | #ffe4d8 / #c58a98 | #ff6984 / #3a0612 | no |
| graphite | Graphite | dark mono | #0b0b0b | #141414 | #1a1a1a | #333333 / #444444 | #ffffff / #9a9a9a | #ffffff / #0b0b0b | no |
| violet | Violet | dark | #0b0720 with violet radial glow at the edges (`#6a2fc8` at 28% alpha) | #140b30 | #25134d | #3a2470 / #4d3090 | #f2e9ff / #a897d6 | #9d71e8 / #0b0720 | no |
| lagoon | Lagoon | dark | #05161a with teal radial glow at the edges (`#0f969c` at 26% alpha) | #08242a | #072e33 | #134a52 / #1a6069 | #e6f7f8 / #7fb0b6 | #0f969c / #031a1c | no |

Palette references for the four extra themes (R15, six-step ramps; use them for gradients, glows, charts and the mini preview):
- Rose: #800021, #881144, #D43A66, #C24366, #FF6984, #FFE4D8
- Graphite: #0B0B0B, #1A1A1A, #333333, #6B6B6B, #D9D9D9, #FFFFFF
- Violet: #0B0720, #25134D, #6A2FC8, #9D71E8, #D1B8FF, #F2E9FF
- Lagoon: #05161A, #072E33, #0C7075, #0F969C, #6DA5C0, #294D61

Locked themes: show a lock icon (accent color) at the bottom-right of the card (R1). For now locked themes are selectable normally (there is no billing logic); keep a `locked: boolean` field and a single `isThemeAvailable(id)` function so a paywall can be added later.

Light and glass-light themes: text on accent uses `--accent-ink`; shadows/edges switch to the warm low-alpha version; icons keep semantic colors but darken each by ~12% (define `--info/--success/--cmd` per mode).

### 4.4 Appearance screen (Settings > Appearance) (R1)
- Header row: palette icon + "Select a preset" (h2) on the left, SegmentedControl **All / Dark / Light** on the right (filters the grid with a 180ms cross-fade; glass-dark counts as Dark).
- Grid: 2 columns, gap 16, each cell is a **theme card**: preview thumbnail (aspect 1.55:1, radius 12, 1px border) + label under it (16px/500) + trailing indicator (check icon in accent for the active theme, lock icon for locked).
- **Mini preview** inside each thumbnail (draw with divs, themed by that preset's own tokens, not the current theme): three small gray dots at the left (a rail, the first dot in that theme's accent), a framed panel at the right with two short title lines, a muted line, and at the bottom-right a rounded bar containing a short line and an accent square (this mimics R1 exactly). For gradient/glass themes the thumbnail background is that theme's gradient.
- **Auto card:** diagonal split (light-left, dark-right, cut line slanted), sun icon on the left half, moon icon on the right half; selected state = 2px accent outline and a check bottom-right.
- Selected card: 2px `--accent` outline + subtle edge. Hover: lift 2px. Press: scale .98. Selecting applies the theme immediately with the switching transition and shows a toast "Theme: Ember".
- Under the grid: toggle "Reduce motion" (overrides system), slider "Panel transparency" (glass themes only, 40–95%), and "Accent color override" (optional: 8 swatches that override `--accent` while keeping the theme).

---

## PART 5. APP SHELL (R5, R8, R12)

### 5.1 Overall frame
```
┌───────────────────────────────────────────────┐
│ [Code|Chat]  (session tabs …………………… +)        │  top bar (≈34px high content, 8px outer padding)
├──┬────────────────────────────────────────────┤
│R │  MAIN PANEL (rounded, bordered)            │
│a │   panel toolbar                            │
│i │   content (chat / files / settings / …)    │
│l │                                            │
│  │                                            │
│? │                                            │
│M │                                            │
└──┴────────────────────────────────────────────┘
```
- Outer background `--bg` (+ `--bg-image`). The main panel has radius 18, 1px `--line`, bg `--panel`, margin 0 8px 8px 0, and fills the remaining space. Panel inner padding 16.
- Safe areas: top uses `env(safe-area-inset-top)`, bottom uses `env(safe-area-inset-bottom)`; viewport meta includes `viewport-fit=cover`; the app root uses `height: 100dvh`.

### 5.2 Top bar
**Mode toggle (left)** — a SegmentedControl "Code | Chat" (Arabic: "رمز | دردشة"). Selected segment is filled accent. This switches the main panel between the *Code workspace* (chat + tools, the default) and *Chat only* (a plain conversation view without tool docks). Persist per session.

**Session tabs (center, scrollable)** — browser-like tabs, one per parallel agent session (feature: parallel sessions).
- Active tab has a **folder-tab shape**: its bottom merges into the main panel; the two bottom corners flare outward with inverted radius (16px) so the tab and panel look like one surface. Implement with two pseudo-elements using radial-gradient masks (no images). Active tab bg = `--panel`.
- Inactive tabs: bg `--bg` tinted by `--elevated` at 40%, no border, text `--muted`.
- Tab content: optional leading icon, title (single line, ellipsis, dir auto; fade mask when truncated), trailing **status dot** (8px; green solid = idle-complete, green pulsing = agent running, amber = waiting for permission, red = error; see R5/R12) or the close "x" (the x replaces the dot on hover/focus and on the active tab).
- Tab width: flexible 120–220px; when many tabs, the strip scrolls horizontally with edge fade masks; the "+" button stays pinned at the end.
- Interactions: click = switch (no animation except the panel cross-fade); middle-click or x = close (running sessions ask for confirmation in a small popover "Stop and close?"); drag to reorder (pointer events, 8px threshold, ghost follows pointer, others slide 180ms); double-click title = rename inline; right-click/long-press = menu (Rename, Duplicate, Pin, Archive, Close others).
- "+" opens a new empty chat session (focus goes to the composer). Long-press "+" = menu (New chat, New project, Open launcher).
- New tab enter animation: width 0→auto + fade, 180ms. Closing: width collapse 160ms.

### 5.3 Left rail (width 52px, bg `--bg`, no border)
Vertical stack of IconButtons (icon 22px, hit 44px), gap 6:
1. **Home** (house icon): opens the current session workspace (Code/Chat).
2. **Sites** (layout/panel-top icon): Sites page (PART 13).
3. **Integrations** (grid-with-one-offset-square icon): Integrations page (PART 12).
4. **Settings** (gear icon): Settings.
5. **Rewards** (gift icon): Invite friends / streak popover (PART 5.5).
Bottom: **Help** (circle-question icon, small, `--faint`) opens a menu (Docs, Shortcuts, Report issue, What's new, Discord); **Avatar** button (square-rounded 36px with the user's initial; bordered like the active IconButton) opens the account menu (Account, Usage, Billing, Theme quick-switch, Language, Sign out).
- Active destination: the IconButton gets the selected style (bg `--elevated`, 1.5px `--line-strong`, edge shadow); the icon switches to a **filled/bolder variant** (e.g. the active settings gear is solid). Transition 160ms.
- Hover: bg `--hover`; tooltip to the right after 400ms (desktop) with the label and shortcut.
- Badge dot (accent) on Integrations when a connection needs re-auth; on Rewards when a reward is claimable.

### 5.4 Panel toolbar (top of the main panel in the workspace) (R5, R12, R13)
Row inside the panel, height 40:
- Left: **Drawer toggle** (sidebar-with-arrow icon). Opens the drawer.
- Right group (icons, 20px): **Activity/Overview** (lines-with-dots icon), **Terminal** (terminal-square icon; toggles the docked terminal), **Files** (folder icon; opens the tool pane on the Files tab), **Layout** (panel-right icon; toggles the tool pane / swaps split orientation).
- Far right: **Publish** button (primary, rocket icon + label + chevron). It opens a menu: Publish to Freecode Sites, Export as ZIP, Copy preview link, Deploy settings. While the agent is running the button is disabled with tooltip "Wait for the agent to finish".
- The toolbar floats with a translucent blurred background (`backdrop-filter: blur(10px)`, bg `--panel` at 80%) and content scrolls under it (visible in R12/R13 where message text passes behind the icons). A 1px bottom border appears only after the content scrolls.
- Active toolbar icon (e.g. terminal open) uses the selected IconButton style.

### 5.5 Drawer (R8)
Slides from the left, over the content (it does not push). Width: `min(86vw, 340px)` on mobile, 280px pinned on desktop. Bg `--panel-2`, right border 1px `--line`. Opening: translateX(-100%→0) 260ms `--ease-out` + backdrop (`--scrim`, 0→60%). Close by backdrop tap, swipe left (velocity-based), Esc, or the collapse icon. Focus trap while open (unpinned).

Layout top to bottom:
1. **Header row:** Freecode logo + wordmark (left), **Search** icon button (opens command palette scoped to chats) and **Collapse** icon button (right).
2. **Primary actions** (rows 44px, icon 20px + label 16px):
   - New chat (square-pen icon) — creates a session and closes the drawer on mobile.
   - New project (folder-plus icon) — dialog: name, template (Blank, From Git URL, From Sites template), start-up script.
   - **Daily hours** (hourglass icon) with a trailing **accent badge** showing time left `6:43` (counts down live while the agent runs; turns amber under 10 minutes, red at 0:00). Click = Usage page.
   - Upgrade row (arrow-up icon): "Get 7x usage for $8" — a plain row, hover underlines nothing, just bg `--hover`. Make the label and price configurable.
3. **Projects section:** header "Projects" (muted 16px) with trailing "new project" icon and a collapse chevron (rotates 180° with 180ms). Each project row: folder icon, name (one line, ellipsis, dir auto), trailing "…" menu button and a "edit/rename" icon button that appear on hover/focus (always visible on touch). Row click opens the project's most recent chat, expanded rows show that project's chats (indented 20px, small title, relative time muted). Active project/chat: bg `--elevated`.
4. **Chats section** (below Projects, same pattern): "Recent" list grouped Today / Yesterday / Earlier with sticky tiny group labels; swipe-left a row to reveal Archive / Delete; pinned chats first with a pin icon.
5. **Footer (pinned bottom):**
   - "Session remaining" label (muted) with a right-aligned timer `21:55` (tabular numbers).
   - **Invite friends** row (gift icon) with trailing count `0/3`.
   - **Streak row:** flame mascot/icon + "7-day streak" + 7 small squares (14px, radius 3). Filled squares use `--accent`; today pulses once when completed. Hover shows tooltip with the date.
- Scrolling: only the middle area scrolls; header and footer are fixed.
- Empty state for Projects: dashed outline row "No projects yet — New project".

### 5.6 Layout system for the workspace
The workspace = **Chat pane** + **Tool pane** + **Terminal dock**.
- **Chat pane:** the conversation (PART 6–8). Always exists.
- **Terminal dock (R12):** appears at the bottom of the chat pane. Its top edge has a drag handle (a 4px×36px pill, centered, hit area 24px). Heights snap to 0 / 35% / 70% of the pane; default 35%. Contains its own tab strip (see 9.4). On mobile when the dock is open the chat pane shrinks above it and the composer stays visible just above the dock (as in R12).
- **Tool pane:** a full tab-based area with its own folder-tab strip and "+" (R9, R10, R11). On mobile it replaces the chat view inside the same main panel (a toolbar icon or swipe from the right edge brings the chat back); on tablet it is a right sheet; on desktop it sits at the right in a resizable split.
- The Layout toolbar icon cycles: chat only → chat + tool pane → tool pane only (mobile) / split sides (desktop).
- All sizes persist per session. Use react-resizable-panels on ≥640px; plain CSS + pointer handlers on mobile.

### 5.7 Command palette (Ctrl/Cmd+K) (feature: command palette)
- Centered dialog (mobile: top sheet), width min(92vw, 560px), radius 18. Search input (autofocus, no border), a result list grouped: Actions (New chat, New project, Open settings, Toggle terminal, Toggle files, Switch theme…), Sessions, Files (fuzzy), Skills, MCP tools, Settings pages, Git actions (Commit, Push, Create branch…).
- Fuzzy matching with highlighted matched letters in accent. Arrow keys move selection (selected row bg `--elevated`, left 2px accent bar), Enter runs, Tab autocompletes the group prefix (`>` actions, `@` files, `/` skills, `#` sessions). Each row shows icon, label, and right-aligned `Kbd` shortcut.
- Opening animation: scale .97→1 + fade 160ms. Recent items first when the query is empty. Empty result: "No results for …" + tip.

### 5.8 Global shortcuts (feature: keyboard shortcuts; all remappable in Settings > Keyboard)
| Action | Default |
|--------|---------|
| Command palette | Ctrl/Cmd+K |
| New chat | Ctrl/Cmd+Shift+O |
| Toggle drawer | Ctrl/Cmd+B |
| Toggle terminal | Ctrl+` |
| Toggle files | Ctrl/Cmd+Shift+E |
| Focus composer | Ctrl/Cmd+L |
| Switch mode Build/Plan/Mission/Skills | Alt+1..4 |
| Next / previous session tab | Ctrl+Tab / Ctrl+Shift+Tab |
| Close session tab | Ctrl/Cmd+W |
| Send | Enter (Shift+Enter = newline) |
| Stop agent | Esc (when running and composer empty) |
| Open settings | Ctrl/Cmd+, |
| Accept hunk / Reject hunk (Changes) | Y / N |
| Next / previous change | J / K |
| Commit | Ctrl/Cmd+Enter (in the commit box) |
Show a "Keyboard shortcuts" cheat sheet dialog on `?`.

---

## PART 6. CHAT VIEW (R5, R12, R13)

### 6.1 Message list
- Scroll container with `overscroll-behavior: contain`, padding 18px 18px 28px, bottom padding enough to clear the composer. Auto-follow the stream while the user is within 80px of the bottom; stop following when the user scrolls up.
- **Scroll-to-bottom button:** circular 40px, bg `--elevated`, 1.5px `--line-strong`, chevron-down, centered horizontally, 12px above the composer. Appears (fade + translateY 6px→0, 200ms) when the user is >120px from the bottom; click smooth-scrolls and re-enables follow. A small accent dot appears on it when new content arrived while scrolled away.
- **Empty state (new chat):** centered logo (48px, muted), headline "What should we build?", muted subtext, and 4 suggestion cards (2×2): "Clone a website", "Fix a bug in my repo", "Review my last commit", "Set up a project". Cards use the Card style; click fills the composer.
- Messages animate in with fade + translateY(6px→0), 180ms.

### 6.2 User message (R12, R13)
- Right-aligned bubble: `width: fit-content; max-width: 88%`, margin `0 0 6px auto`, bg `--elevated`, 1px `--line-strong`, radius 16, padding 10px 14px, 16/1.5, `white-space: pre-wrap`, `word-break: break-word`, `dir="auto"`. Long messages (>8 lines) collapse with a fade and "Show more".
- Below the bubble, a small **action row** (icons 18px, `--faint`, gap 14, right-aligned): **Edit** (pencil), **Restore to here** (counter-clockwise arrow = checkpoint, PART 6.6), **Copy**. Visible always on touch; on desktop shown on hover/focus-within with a 120ms fade. Tooltips on each. Edit turns the bubble into an inline textarea with Save/Cancel (saving forks the conversation from that point after a confirm dialog).
- Attachments (images, files) render as small chips above the text: thumbnail 40px or file icon + name.

### 6.3 Assistant turn
Structure of one turn (this is the heart of the UI):
1. **Run header** (button): `Worked for 3m 29s` + a small chevron. Muted `--muted`, 17px. While running it reads `Working for 12s` with a live timer. Click collapses/expands the entire activity of the turn (default: expanded while running, **collapsed automatically when the run finishes**; the final answer stays visible). Chevron rotates -90° when collapsed (200ms).
2. **Activity stream** (inside the collapsible): interleaved assistant text and **activity groups** (PART 7).
3. **Final answer text** (always visible): body-lg 17/1.55, `dir="auto"`. Supports Markdown: paragraphs, bullet and numbered lists (Arabic lists mirror), inline code chips, fenced code blocks (with language label, copy button, line wrap toggle; radius 12; bg `--code-bg`), tables (scroll inside their own container), links (accent, underline on hover), blockquotes (2px accent bar at the start side).
4. **Follow-up suggestions** (R13): up to 3 buttons below the answer, outline Button variant with the edge shadow, wrapping to multiple rows (e.g. "Verify main builds", "Debug project error", "Brainstorm follow-ups"). Click sends the text as a user message. Appear with a staggered fade 180ms after the stream ends.
5. **Reaction row** (R13): icons 20px `--muted`, gap 14: **Comment/annotate** (message-square), **Thumbs up**, **Thumbs down**, **Copy**. Thumbs toggle to filled accent; thumbs down opens a small popover with reason chips (Incorrect, Incomplete, Too slow, Other) and an optional text field. Copy shows a check for 1.2s.
- While streaming, a blinking caret (2px × 1.1em, accent, 1s steps) trails the last character; the Stop button is active in the composer.

### 6.4 Errors and permissions inside a turn (never auto-collapse)
- **Error block:** radius 14, border `--danger` at 50%, bg danger at 8%, icon alert-triangle, title, short message, collapsible "Details" (mono), buttons Retry (outline) and "Ask agent to fix" (primary).
- **Permission card (feature: permission system):** shown inline in the stream where the agent paused; it **never collapses** and also lifts the tab dot to amber and shows a toast if the user is on another tab. Layout: radius 16, border `--warning` at 55%, bg warning at 8%, header row (shield icon + "Permission needed"), a line explaining the action in plain words, the exact command/path in a mono block (copyable, horizontally scrollable), a **risk badge** (Low = neutral, Medium = amber, High = red, e.g. `rm -rf`, force-push, network calls to unknown hosts), and buttons: **Allow once** (primary), **Always allow for this project** (outline), **Deny** (danger-outline). Keyboard: Y / A / N while the card is focused. After a choice the card collapses into a one-line result ("Allowed once: npm run build") that remains in the stream.
- Permission modes (Settings > General > Agent permissions): Ask every time (default), Ask for risky actions only, Allow all in this project, Read-only. A small shield chip in the composer shows the current mode and opens the same choices.

### 6.5 Plan and mission blocks in the stream
- When mode is Plan, the agent's first output is a **Plan card** (PART 10.3) with an Approve button.
- In Mission mode the stream shows a pinned **Mission banner** under the toolbar: goal text (1 line), progress "step 3/9", elapsed time, and Pause/Stop buttons.

### 6.6 Checkpoints (feature: restore points)
- A checkpoint is created automatically before each agent run that edits files. In the stream, show a thin **checkpoint marker** between a user message and its run: a 1px dashed line with a small clock-rewind icon and the label "Checkpoint" (muted) that turns into a "Restore" ghost button on hover/focus.
- **Restore flow:** click Restore (or the rewind icon on a user message) opens a dialog listing what will change ("12 files will be reverted, 3 untracked files kept"), options: Restore code and conversation / Restore code only / Restore conversation only, and Cancel. After restoring, a toast with Undo (10 s).
- The Overview panel shows the full checkpoint timeline (PART 10.1).

---

## PART 7. ACTIVITY DISPLAY (exact behavior is implemented in Appendix A, R6)

Replicate the reference HTML 1:1 as React components (`RunHeader`, `ActivityGroup`, `summarize`, `iconFor`). Rules recap:
- A **group** is a run of consecutive tool actions and optional thinking. It renders as **one single row only**: no border, no card, no background. Icon 19px + summary label 15.5px in `--muted`, min row height 29px, 12px gap; the label truncates with an ellipsis.
- **Icon by group:** group contains thinking → sparkle, `--info`. Otherwise by the first tool: browser or MCP → plug, `--info`; read → file, `--success`; edit → file-with-pen, `--success`; command → terminal-square, `--cmd`.
- **Summary label** is generated automatically from the actions in order of first appearance, without numbers: singular if one (`Ran a command`), plural if more (`Ran commands`), browser stays `Used the browser`, parts joined with `, `, first letter uppercase. Examples: `Ran a command`, `Used the browser, ran commands, read files`, `Edited files, ran a command`. Thinking is never named in the label (it only drives the icon). MCP calls are labeled `Used MCP tools` (add to the category map); skills `Used a skill`; git `Ran git commands` (only when no plain command).
- **While running:** the current group shows a 15px spinner (2px border, `--info` top) instead of the icon, and the label shows the present-continuous text of the current action (`Thinking…`, `Running a command…`, `Using the browser…`, `Reading files…`, `Editing files…`) with the **shimmer** gradient animation. When finished it collapses to its summary line and the icon appears.
- **Tapping a row** toggles a detail area (grid-rows 0fr→1fr, 220ms) with one line per action: key (muted) + value (mono, `#9a9aa0`, ellipsis), e.g. `Ran  npm run build`, `Read  src/routes/chat.tsx`, `Edited  vite.config.ts`, `Thought  for 7s`. In the real app tapping an edit/command line opens the **real tool card** (diff viewer or terminal output) in a sheet; the demo shows simple lines.
- **Errors and permission requests are never collapsed** (they render as the blocks in 6.4 even inside a group).
- Header `Worked for …` format: `Xs` under a minute, `Xm Ys` otherwise; when stopped by the user: `Stopped after Xs`.
- Respect reduced motion: no shimmer, spinner stays (slowed).

---

## PART 8. COMPOSER (R5, R12, R13)

Container: margin `6px 12px calc(12px + safe-area-bottom)`, padding 12px 14px 10px, 1.5px `--line-strong` border, radius 22, bg `--panel-2` (slightly darker than panel). Focus-within: border `--accent` at 60%.

### 8.1 Elements, top to bottom
1. **Attachment chips row** (only if any): file/image chips with remove x; drag-and-drop and paste of images/files supported; drop overlay with dashed accent border "Drop files to attach".
2. **Textarea:** min-height 66px (3 rows), max 170px then scrolls, auto-grow, 16/1.55, `dir="auto"`, no border. **Placeholder doubles as the AI suggestion** (long faint text, up to 3 lines, e.g. "Check that main builds after the branch cleanup, without changing anything."). Typing `/` opens the skill picker, `@` opens the file/context picker, `#` opens the session picker.
3. **"Use suggestion"** button (plain text, 15px, `--text`, no border) under the placeholder; visible only when the textarea is empty and the agent is idle. Click fills the textarea with the suggestion and focuses.
4. **Mode switch** (SegmentedControl): **Build · Plan · Mission · Skills** (R12). Meaning:
   - *Build*: the agent edits files and runs commands normally.
   - *Plan*: the agent proposes a step plan first and waits for approval; no edits.
   - *Mission*: long-running autonomous goal mode with periodic check-ins and a progress banner.
   - *Skills*: shows a horizontal chip row of enabled skills above the textarea; selecting one inserts a `/skill-name` token chip into the text.
   Selected segment: accent fill. Keep the control compact (height 32, text 14px). Alt+1..4 shortcuts.
5. **Bottom row** (flex, space-between, aligned center):
   - Left: **+** button (plus icon 22px, muted) opening a menu: Upload files, Add from project, Attach screenshot of browser, Add MCP resource, Take a snapshot.
   - Then **Model picker**: text button `DeepSeek V4.1 Flash` + muted `High` + chevron. Opens a popover with model list (name, short description, speed/cost dots), and a **reasoning effort** segmented control (Low / Medium / High). Persist per session.
   - **Context ring:** 20px circular progress showing context used (stroke `--accent` → amber at 80% → red at 95%). Tap = popover: "Context 61% used · 124k / 200k tokens", cost this session `$0.42`, button "Compact conversation" (feature: usage display).
   - **Primary action button** (48×38, radius 11, accent): morphs by state with a 160ms icon cross-fade/scale: **voice waveform** (empty input, idle) → **arrow-up send** (has text) → **stop square** (agent running; bg `--elevated`, text `--text`). While transcribing voice it shows a pulsing ring.
6. A **shield chip** (permission mode) and **branch chip** (current Git branch) may sit at the start of the bottom row on wider screens (≥640px); on mobile they live in the `+` menu.

### 8.2 Behavior
- Enter sends (Shift+Enter newline, never while IME composing). Sending clears the field with a quick fade, appends the user bubble, scrolls to bottom and starts the mock run.
- While running, the composer stays usable: typing queues the next message ("Queued" chip with an x to cancel) and Stop interrupts immediately.
- Up arrow in an empty composer recalls the last message. Draft per session is persisted.
- Voice: tap = dictation toggle (mock: types text word by word), long-press = hold-to-talk.
- Errors (network) render a red inline hint under the textarea with Retry.

### 8.3 Slash and mention menus
Popover above the composer, max 6 rows, keyboard navigable, each row: icon, name, muted description, right-aligned source badge (Skill / File / MCP / Session). Filter as you type; Esc closes; Enter inserts a token chip (accent text on `--code-bg`, radius 6) that deletes as one unit with Backspace.

---

## PART 9. TOOL PANE: LAUNCHER, FILES, BROWSER, TERMINAL (R9, R10, R11, R12)

### 9.1 Tool pane tab strip (R9, R10, R11)
- Inside the pane's top edge: folder-tab strip using the same shape language as the session tabs, but one level deeper (active tab bg `--panel`, merged with the content below; the divider line under the strip is 1px `--line`).
- Each tab: icon 18px + title + close x. The active tab shows the x; inactive tabs show it at lower opacity. Browser tabs show the page favicon/title ("New tab" until loaded).
- Trailing: **+** button (opens a Launcher tab) and, at the far end, the **collapse pane** icon (panel-right-close) that hides the whole tool pane.
- Drag to reorder; middle-click closes; at least one tab always exists (closing the last opens the Launcher).

### 9.2 Launcher ("New tab") (R10)
Empty tab content: a vertically and horizontally centered list of 5 rows, each icon 20px + label 17px `--muted`, row height 48, spacing 8:
1. **Overview** (lines-with-dots icon)
2. **Cloud browser** (globe)
3. **Files** (folder)
4. **Terminal** (terminal-square)
5. **Changes** (git-branch)
Hover: row bg `--hover`, text `--text`, icon shifts 2px. Click replaces the Launcher tab with that panel (cross-fade 120ms). Keyboard: arrow keys + Enter, or the number keys 1–5. Additional rows (proposed, below a thin divider): **Plan**, **Live preview**, **Activity log**, **MCP**.

### 9.3 Files panel (R9)
- **Toolbar:** Filter input (placeholder "Filter files") taking the free width + three square outline IconButtons (40×40): **New file** (file-plus), **New folder** (folder-plus), **Upload** (upload). Edge shadows as controls.
- **Tree:** rows 36px: chevron (right when collapsed, rotates 90° on expand, 140ms), folder or file icon (18px, `--muted`), name 16px. Folders first, then files, alphabetical, dotfolders included (e.g. `.sdk`, `.tools`). Indent 16px per level with faint vertical guide lines.
- Interactions: click folder toggles (children slide open via grid-rows). Click a file opens it in the **Editor tab** (Monaco). Double-click renames inline. Right-click/long-press menu: Open, Rename, Duplicate, Delete (with confirm), Copy path, Reveal in terminal, Ask agent about this file. Drag a file onto the composer to attach it; drag within the tree to move.
- Filter highlights matches (accent) and auto-expands matching parents; if none: empty state "No files match".
- **Git decorations:** colored status letter or dot at the end of a row (M amber, A green, D red, U gray) and a muted name for ignored files. Files the agent is currently editing get a small pulsing accent dot.
- **File icons:** by extension (generic file icon is fine; add colored tint for ts/js/json/md/css/html/py/sh using the semantic colors sparingly).
- Empty project: centered "No files yet", buttons New file and Upload.
- **Editor tab:** Monaco themed from tokens (build a Monaco theme from the active theme: background `--panel`, selection accent at 25%, etc., and re-apply on theme change). Tab shows a dirty dot; Ctrl+S saves (mock). Breadcrumb bar with path; read-only badge when the agent is editing that file; "Agent edited this file" ribbon with a Show diff button.

### 9.4 Terminal panel and dock (R12)
- Terminal tab strip: a tab "Terminal" (terminal-square icon + title + x), a **+** (new terminal), and a **split** icon (columns icon) that splits the terminal view in two (react-resizable-panels). Tabs are renameable. Agent-run commands appear in a dedicated read-only tab "Agent" with a small accent badge; user terminals are interactive.
- **xterm.js** area: bg `--panel` (slightly darker), font mono 13px, line-height 1.35, cursor accent block, selection accent 30%. Map ANSI colors to the theme (semantic colors for green/blue/yellow/red).
- **Connecting state (R12):** the bottom shows an outlined input row (1.5px border, radius 10, padding 10px 12px) reading "Connecting terminal…" with a tiny spinner; once connected it becomes the prompt line `~/project $` with a blinking caret. (On mobile, add a **special-keys bar** above the keyboard: Esc, Tab, Ctrl, ↑ ↓ ← →, `|`, `/`, `-`, and a Paste button.)
- Mock: respond to `ls`, `pwd`, `git status`, `npm run build`, `help`, and echo anything else with `command not found`. Long output streams at ~60 lines/sec.
- Header actions (in the tab strip's overflow menu): Clear, Copy all, Kill process, Open in tool pane, Font size +/-.
- **Dock behavior:** handle drag, snap points 0 / 35% / 70%; double-tap the handle toggles 35%↔70%; the dock opens with translateY 100%→0, 260ms.
- Running commands show an indeterminate 2px accent progress line under the tab strip.

### 9.5 Cloud browser (R11)
- **Toolbar** (height 48, below the tab strip, 1px bottom border): **Back** and **Forward** icon buttons (disabled = `--faint` when no history), **Reload** (rotating while loading; becomes an x to stop), **Address field** (pill-ish Input, placeholder "Search or enter URL", selects all on focus, shows lock icon + domain + muted path when loaded, loading bar 2px accent along its bottom edge), **+** (new browser tab), **Open externally** (arrow-up-right square), **More** ("…" menu: Zoom, Desktop site, Device frame (Phone/Tablet/Desktop), Take screenshot, Send screenshot to agent, DevTools console, Clear cookies).
- **Empty state (R11):** centered globe icon (48px, `--muted`), title "Start browsing" (22px/700, `--muted`), text "Enter an address above, or ask the agent to open a page." (15px, centered, max 280px). Below, a row of 4 quick-link chips (Localhost, Docs, GitHub, Preview).
- **Content area:** an iframe placeholder in the mock (render a sample page or a "Cloud browser session" screenshot image with a fake cursor). When the **agent controls** the browser, show a thin accent border around the viewport, a pill "Agent is browsing" (top center, with a spinner) and a "Take over" button; user input is blocked until the user taps Take over.
- **Live preview mode (feature: live preview):** a tab type "Preview" bound to the project's dev server (default `localhost:5173`): auto-reloads when the agent edits files (small "Reloaded" flash at the toolbar), device toggle (Phone/Tablet/Desktop) with a framed viewport, and a "Inspect element → send to agent" button (mock: highlights a box and inserts a chip into the composer).

---

## PART 10. OVERVIEW, CHANGES (GIT), PLAN (proposed designs, same visual language)

### 10.1 Overview (session dashboard)
Scrollable column of cards (gap 12, padding 16):
1. **Header:** session title (editable), status badge (running = pulsing green dot "Running 04:12", waiting = amber, done = green check, error = red), and a "…" menu (Rename, Duplicate, Export transcript, Archive).
2. **Current task card:** goal text (2 lines), a 6px progress bar with a travelling highlight while running, and the **plan steps** list: done = check in `--success`, current = accent dot with shimmer label, upcoming = hollow circle muted. "Open plan" link to the Plan panel.
3. **Pending permission card (amber, only when present):** identical to 6.4 (Allow/Deny), never collapses.
4. **Stats grid 2×2** (Cards, counts animate): *Files changed* (`7 · +214 −38`), *Commands run* (`23`), *Context* (ring chart 61%), *Cost* (`$0.42` + tokens). Tapping a card opens the relevant panel (Changes, Terminal, Usage).
5. **Checkpoint timeline:** vertical line with nodes. Each node: time, user prompt excerpt (1 line), `+N −M` files, and a **Restore** outline button. The current state is the top node with an accent ring.
6. **Activity log (feature: activity log):** chronological list with filter chips (All, Commands, Files, Browser, MCP, Git, Permissions); each entry = icon (semantic color), one-line description, relative time, and expandable details. "Export JSON" button.
7. **Quick actions row:** Preview, Run tests, Commit, Create PR (outline buttons, horizontal scroll).
8. **Project instructions card:** shows the active instructions file (`AGENTS.md`) first 3 lines with "Edit" (opens Project settings > Instructions) and a toggle "Agent reads this file automatically".

### 10.2 Changes (Git + diff review)
**Header area:**
- Branch chip (git-branch icon + `main` + chevron) opens a branch menu (search, recent, "Create new branch…", "Checkout…"). Next to it ahead/behind counters `↑2 ↓0` and buttons **Pull** and **Push** (outline; show spinner and a toast on completion; Push disabled when nothing ahead).
- SegmentedControl: **Changes · History · Branches**.

**Changes tab:**
- **Summary bar:** `7 files  +214  −38` with a proportional 6px bar (green/red segments).
- **Grouped list:** "Staged (2)" and "Changes (5)" headers (collapsible, with "Stage all"/"Unstage all" ghost buttons). Row: checkbox (squircle, accent when checked), status letter badge (M amber, A green, D red, R blue, U violet), file name (path dimmed, filename bright, truncated in the middle), `+x −y` counts. Swipe right = stage, swipe left = discard (confirm). Tap = open the diff view.
- Agent-edited files show a tiny sparkle icon; the file the agent is editing right now shows a pulsing dot.

**Diff view** (pushes in from the right on mobile, or opens as a tab):
- Header: file path, `+x −y`, view toggle **Unified / Split** (split only ≥640px), "Open file" and "Copy path".
- Body: Monaco diff or custom renderer: line numbers (old/new), added lines bg `--diff-add-bg` with a 3px left bar `--diff-add-line`, removed lines bg `--diff-del-bg` with bar `--diff-del-line`, **word-level highlights** inside changed lines (stronger tint), unchanged regions collapsed as "Show 24 unchanged lines" rows that expand on tap.
- **Hunk review (agent edits):** each hunk has a floating mini-toolbar at its top-right: **Accept** (check, success) and **Reject** (x, danger) plus "Ask agent to change". Accepted hunks get a faint check badge; rejected hunks revert instantly with a 160ms slide and are listed in a "Rejected (n)" chip. Top bar actions: **Accept all**, **Reject all** (confirm).
- Bottom sticky bar: ← Previous change · "File 2 of 7" · Next change →, plus Y/N/J/K shortcuts.
- Binary/large files: placeholder card "Binary file changed" or "Large diff — Load anyway".

**Commit area (sticky at the bottom of Changes):**
- Textarea "Commit message" (2 rows) with a trailing sparkle **Generate** icon button (fills the message from the diff with a typing animation), character hint for the 72-char subject line.
- Button row: **Commit** (primary; label becomes "Commit 5 files") with a split chevron menu: Commit & Push, Commit & Create PR, Amend last commit. Disabled until something is staged and a message exists.
- After commit: toast "Committed a0765d8" with Undo (soft reset) and View.

**History tab:** commit list (avatar, message, short hash chip, author, relative time), graph rail on the left (colored lanes), tap opens that commit's files and diff.
**Branches tab:** local/remote lists, current branch highlighted, ahead/behind, row actions (Checkout, Merge into current, Delete with confirm, Compare).
**Merge conflicts state:** red badge "3 conflicts" in the header; conflict files list; 3-pane editor (Current / Incoming / Result stacked on mobile) with per-block buttons Accept current / Accept incoming / Accept both and a final "Mark as resolved".

### 10.3 Plan panel (mode: Plan)
- Appears as a **Plan card** in the chat when the agent proposes a plan, and as a full tab in the tool pane (same data).
- Header: title, steps count, estimated time chip, status badge (Draft, Approved, Running, Done).
- **Steps:** vertical list; each step = drag handle, status icon (○ pending, accent spinner running, ✓ done, ! failed), editable title (tap to edit, dir auto), expandable body with description, affected files (CodeChips), and risk badge. Add step button at the end (dashed outline row). Steps can be reordered by drag, deleted by swipe, and skipped by a toggle.
- Footer actions: **Approve & build** (primary; switches the mode to Build and starts the run), **Edit in chat** (outline), **Discard** (ghost danger).
- While running, the current step label shimmers and the top progress bar fills proportionally; completed steps collapse to one line.

---

## PART 11. SETTINGS (R1, R2, R4, R16, R17)

### 11.1 Settings layout
- Page inside the main panel. Top: **Search settings** field (full width, Input style with search icon; filters sections across all tabs and jumps to matches, highlighting the label in accent for 1.5s).
- Below: **horizontal tab row** (scrollable, fade mask, selected tab = bordered/elevated pill). Tabs in order, each with a 18px icon: **General** (sliders), **Account** (user-circle), **Appearance** (palette), **Usage** (gauge), **Billing** (credit-card), **Developer API** (code/terminal), **Project settings** (folder-cog), **Skills** (sparkles), **MCP** (plug), **Keyboard** (keyboard).
- Each tab has a display title (28/700) under the tab row, with a "?" help icon where useful (opens a popover). Sections inside: **section header** = icon 18px + title (h2 17/600) + optional help icon; under it a **setting card** (Card style, padding 16, 12px between rows, hairline dividers between rows).
- Setting row: label (16px) with optional "?" help popover, description (13.5px muted) under it, control aligned to the inline end (Switch, Select, Button).
- Deep links: `/settings/:tab` and `#section-id` (plain hash only).
- Mobile: tab row sticks under the search field. Content padding 16. Save is instant (no Save button) except where stated; each change shows a tiny "Saved" check next to the label for 1s.

### 11.2 General (R4)
Sections and rows:
- **Composer:** Advanced Mode (switch, "?" explains: show model picker, effort, branch chip), Send with Enter (switch, default on), Show suggestions in composer (switch).
- **Notifications:** Notification sounds (switch), Desktop/browser notifications when the agent finishes or needs permission (switch + permission request flow), Sound volume (slider, appears when sounds on).
- **Sessions:** Auto-renew sessions (switch), Keep sessions alive in background (switch).
- **Feedback:** card containing two buttons in one row: **Report issue or feature** (inverse button) and a square **Discord** icon button (inverse).
- **Auto-archive chats:** Select (Never, After 1 day, 7 days, 30 days) — the card shows the label with "?" and the value right with chevron (R4).
- **Agent instructions** (file-text icon): toggle "Include AGENTS.md and project rules automatically" plus a link "Edit global instructions" (opens a Dialog with a Markdown editor, 4000-char counter).
- **Agent permissions:** Select for permission mode (see 6.4) and a list of "Always allowed commands" with remove x chips.
- **Language:** Select English / العربية. Applies immediately; text direction behavior per 2.2.
- **Data:** Export all chats (button), Delete all chats (danger outline, confirm dialog requiring typing DELETE).

### 11.3 Account
Profile card (avatar with initial, display name Input, email read-only with a Verified badge), connected sign-in providers (GitHub, Google rows with Connect/Disconnect), Change password, Two-factor (switch + setup dialog), Active devices list with "Sign out of other devices", **Danger zone** card (Delete account, danger button, typed confirmation).

### 11.4 Appearance
See PART 4.4.

### 11.5 Usage (R2)
- Title "Usage".
- **Hours** section (clock icon + "?"): Card with label "Daily" on the left and `0:00 left of 1:00` on the right (tabular numbers, muted) and a Progress bar under it (gray track; fill accent; the exhausted state shows only the gray track, as in R2). Under it a muted line "Resets in 6h 12m" and an inverse button "Get more hours".
- **Activity** section (activity-pulse icon + "?"): Card with a 2×2 stats area: *Current streak* `2 days`, *Longest streak* `2 days`, *Active days* `2` (numbers 34px/700, labels muted 15px). Below, the **contribution heatmap**: 7 rows × 23 columns of squares (size 14px, gap 3px, radius 3px), empty = `--elevated` at 80%, levels 1–4 mix `--accent` at 25/50/75/100%. Tooltip per cell (date, minutes). Cells fade in column by column (400ms total). Month labels above, weekday labels at the start.
- **Last 7 days** section (bar-chart icon + "?"): Card with *Messages* `140` and *Total tokens* `24.7M` big stats, then rows *Input tokens*, *Output tokens*, *Cached tokens* (label muted, value right, mono), then a small 7-bar chart (SVG, bars in accent with the selected bar highlighted, tooltips) — proposed. Range selector chips: 7d / 30d / 90d.
- Skeletons while loading; numbers count up on first view.

### 11.6 Billing (proposed)
Current plan card (name, price, renewal date, "Manage" button), plan comparison list (Free, Pro, Max) as selectable cards with feature lines, usage-based extras toggle with spend limit input, payment method card, invoices table (date, amount, status badge, download icon).

### 11.7 Developer API (proposed)
- **API keys** card: list rows (name, masked key `fc_••••3f9a`, created date, last used, Revoke danger button). "Create key" (inverse button) opens a dialog (name, scopes checkboxes, expiry select); after creation shows the secret **once** in a mono box with Copy and a warning banner.
- **Usage by key** mini table. **Webhooks** (URL input, events multiselect, Test button). **Docs** card with 3 short code samples (curl, JS, Python) in tabs with copy buttons.

### 11.8 Project settings (R17)
- Title "Project settings". Under it a **project Select** (full-width-ish pill, project name + chevron).
- **Startup script** (terminal-prompt icon + "?"): Card containing a code Textarea (mono 16px, min-height 100, resize handle bottom-right, placeholder `bun install`), helper text "Runs every time the workspace starts", and a ghost "Run now" button. Line numbers optional.
- **Secrets** (key icon + "?"): Card. Each existing secret row: name (mono, `GHToken`), masked value (mono, muted, `••••nyyj`, tap the eye icon to reveal for 10s), and a **Remove** danger button (confirm popover). Below: two Inputs stacked: `NAME` (uppercase auto-format, validates `[A-Z0-9_]`) and `Value` (password type) with an **Add** inverse button at the end of the Value row. Duplicate names show an inline error. Values are never shown after saving except masked.
- **Environment variables** (proposed): same list without masking.
- **Instructions (AGENTS.md)** (proposed, feature: project instruction file): Monaco-lite Markdown editor with a template button ("Insert template": project overview, commands, code style, do-not rules), auto-save, "Last read by the agent: 2m ago".
- **Danger zone:** Delete project.

### 11.9 Skills (R16)
- Title "Skills" with "?" popover (what skills are).
- One big Card containing: **Search skills** field; a row of three inverse buttons **Discover**, **Create**, **Upload**; then the skill list.
- **Skill row:** left a 40px rounded square (elevated, sparkles icon), center: name (17px/600, mono-ish kebab-case, dir ltr), description (15px muted, clamp 2 lines), and below it right-aligned **Edit** (outline button) and a **Switch**. Hairline separators between rows. Proposed extras: scope badge (Global / Project) after the name, "Used 12 times" muted text.
- **Discover:** opens a full-screen sheet with a searchable gallery of ready-made skills (cards: name, description, author, installs, **Install** inverse button → becomes "Installed" with check).
- **Create:** wizard sheet: name (kebab-case validation), description (when to use it), instructions (Markdown editor), optional files (upload), scope (Global/Project), **Test with a prompt** (mock run), Save.
- **Upload:** drag-drop zone for a folder/zip containing `SKILL.md`, shows parsed name/description before confirming.
- **Edit:** the same editor as Create with Delete (danger) at the bottom.
- Toggle off dims the row (opacity .6). Mock skills to seed: `web-design-guidelines`, `ai-video-generation`, `canvas-design`, `frontend-design`, `pdf`, `docx`.

### 11.10 MCP (proposed)
- Title "MCP servers", header actions **Add server** (inverse) and **Import JSON** (outline).
- **Server card:** logo/icon, name, transport badge (`stdio` / `HTTP` / `SSE`), **status dot** (green connected, amber connecting with pulse, red error, gray disabled), tools count `12 tools`, a Switch to enable. Tap expands: connection line (command or URL, mono), env var names (values masked), **Test connection** button (spinner → success/failed toast with latency), last error (collapsible red mono block), tools list with a Switch per tool, a **permission policy** Select per server and per tool (Ask / Auto-allow / Block), and Remove (danger).
- **Add server dialog:** toggle between **Form** (name, transport, command + args chips, URL, headers/env key-value rows) and **JSON** (Monaco, schema-validated with inline errors). Preset gallery: Filesystem, GitHub, Postgres, Playwright, Fetch, Memory, Figma.
- Empty state: plug illustration (simple line icon), text, and the Add server button.

### 11.11 Keyboard (proposed)
- Search field "Search shortcuts". Grouped list (General, Chat, Files, Terminal, Git). Row = action name left, `Kbd` chips right (e.g. Ctrl + K). Tap a shortcut → it turns into "Press new keys…" capture mode (accent border pulse); Esc cancels, Backspace clears, conflicts show an inline amber message with "Replace". "Reset to default" ghost button per row and "Reset all" at the bottom. Show Mac symbols on macOS.

---

## PART 12. INTEGRATIONS AND CONNECT PAGE (R3, R7)

### 12.1 Integrations page (R3)
- Title "Integrations" (display). Under it a row: **search field** "Explore more integrations" (flex 1) + inverse button **Custom** (opens "Add custom integration" dialog: name, MCP/HTTP URL, auth type, headers).
- **Connected** section: label (muted 15px). Each connected service = Card containing a header row (logo tile 52px white rounded square with the brand logo, service name 20px/600, trailing **Add account** inverse button with plus icon) and, inside, one **account sub-card per account** (elevated, radius 14, border): account name ("Figma account"), muted "Connected 18 Nov" (localized date), and a **Disconnect** danger button at the end. Disconnect opens a confirm popover; success removes the sub-card with a collapse animation and a toast.
- **Popular** section: list of rows (Card style, height 64): logo tile 52px, name (17px/500), trailing plus icon (muted). Order: Gmail, Google Calendar, Google Drive, Slack, Notion, Linear, PostHog, Sentry, GitHub, Supabase, Vercel, Stripe, Figma, Jira, Asana, Zapier. Clicking a row opens the **Connect page** (12.2). Search filters this list and shows a "Request this integration" row when nothing matches.
- Rows never overflow horizontally; the plus icon sits at the inline end with 16px padding.
- Status variants on a connected card: "Needs reconnect" amber badge with a Reconnect primary button; "Error" red badge.
- Logos: use inline SVG placeholders (simple monograms) in the mock; structure `logo: ReactNode | url` so real brand logos can be dropped in.

### 12.2 Connect page (R7) — FIXED LIGHT, NOT THEMED
Route `/connect/:service`, full-screen, independent of the app theme (scope all colors to `.connect-root` with its own variables).
- **Page:** bg `#fafafa` with a faint dot grid (radial-gradient dots, 24px spacing, `rgba(0,0,0,.05)`), content centered vertically.
- **Card:** width `min(100% - 32px, 440px)`, bg `#ffffff`, radius 16, shadow `0 1px 2px rgba(0,0,0,.06), 0 8px 30px rgba(0,0,0,.06)`, overflow hidden.
- **Hero header** (height ≈ 200): gradient background: `linear-gradient(135deg, #e3d2ff 0%, #f1a9bf 45%, #fbc3a0 80%, #ffffff 100%)` fading to white at the bottom (mask or overlay). Centered: two white rounded-square tiles (68×68, radius 18, soft shadow) — left = Freecode logo, right = service logo — joined by two short horizontal connector lines (one purple, one orange, 24px wide, 2px thick, vertically offset by 6px) that animate (draw-in left to right, 600ms) on load. Below: title "Freecode wants to connect to your {Service}" (24/700, centered, `#111`, max 2 lines).
- **Form area** (padding 24): for each required field: label (16/600 `#6b6b6b`, red asterisk if required), helper text (14/1.5 `#7a7a7a`), Input (height 52, radius 12, bg `#fafafa`, border 1px `#d9d9de`, text 18px `#111`; **focus:** border `#6366f1` 2px + outer ring `0 0 0 4px rgba(99,102,241,.25)`; error: red border + message below).
- **Footer** (separated by a 1px `#eee` line, padding 24): primary button full width, height 52, radius 12, label "Connect Account" (17px/500). Disabled/empty state = washed green `#b5cfa8` with dark text, enabled = `#6bb34f` with `#12301a` text (hover darker 6%, press translateY 1px, loading = spinner + "Connecting…"). Under it, centered caption "Secured by {provider logo} {provider name}" (14px `#777`) — provider text/logo configurable (`connectProvider` setting; default text "Composio").
- **Field sets per service** (config-driven in `integrations.config.ts`): API key (Supabase: "Base URL" prefilled `https://api.supabase.com` with the helper text from R7 + "Access token"), token services (GitHub PAT), URL+key (custom). OAuth services (Gmail, Google Calendar, Google Drive, Slack, Notion, Linear, Figma) show instead a single description line + a "Continue with {Service}" button that opens a **popup window mock** (centered 480×640 browser-style window with "Authorize" and "Cancel" buttons).
- **States:** validating (button loading), success (card content cross-fades to a large check with "Connected" and auto-redirect back to Integrations after 1.2s with a toast), error (red inline banner above the footer with Retry). Back/close X at the top-right of the card.
- The page must look identical in every app theme.

---

## PART 13. SITES (R14)

- Title "Sites" (display) with a primary **Create** button (plus icon) at the inline end. Create opens a sheet: describe the site (textarea), pick a type chip, **Create with agent** → starts a new session in Build mode with the prompt prefilled.
- **Filter chips** (horizontal scroll with fade): Featured (selected by default), All, Landing pages, Stores, Games, Portfolios, Dashboards, Docs. Switching filters cross-fades the grid 160ms.
- **Start from scratch card:** dashed 1.5px border (`--line-strong`), radius 16, padding 28, centered: a 70px circle (elevated) with a plus icon, title "Start from scratch" (20px/600), subtitle "Bring your own idea to life." (muted). Hover: border becomes solid and brightens, the plus rotates 90° (180ms). Click = new empty project.
- **Template card:** Card (radius 16, padding 10) with a large preview (aspect ~1.6:1, radius 12, 1px inner border; image or CSS gradient placeholder in the mock; lazy loaded with skeleton), title below (22px/700 → use h2 20px), description clamped to 2 lines with ellipsis (16px, muted→text at 80%). Hover/press: preview scales 1.02 within its overflow-hidden frame (260ms), card lifts 2px. Click opens a **detail sheet**: large preview (swipeable gallery), title, description, tags, stats, buttons **Use template** (primary) and **Preview** (outline, opens Cloud browser).
- Mock templates: "Crosscut" (voxel shooter, game), "Phosphor" (retro terminal landing), "Atlas" (dashboard), "Bloom" (store), "Folio" (portfolio), "Docsy" (docs site) with gradient previews.
- Empty/error states: "Couldn't load templates" + Retry.

---

## PART 14. MOCK DATA LAYER (backend replaced later)

### 14.1 Interface (`lib/agentClient.ts`)
Components talk only to this interface. The mock implements it; a real backend will implement the same interface (WebSocket/HTTP) later.
```ts
export type ToolKind = 'think' | 'cmd' | 'read' | 'edit' | 'browser' | 'mcp' | 'skill' | 'git';

export type AgentEvent =
  | { type: 'turn.start'; turnId: string; at: number }
  | { type: 'text.delta'; turnId: string; text: string; final?: boolean }
  | { type: 'tool.start'; turnId: string; id: string; kind: ToolKind; label: string; detail?: string }
  | { type: 'tool.end'; turnId: string; id: string; ok: boolean; output?: string }
  | { type: 'permission.request'; turnId: string; id: string; action: string; command?: string; path?: string; risk: 'low' | 'medium' | 'high' }
  | { type: 'plan.update'; turnId: string; steps: PlanStep[] }
  | { type: 'checkpoint.create'; turnId: string; id: string; label: string; files: number }
  | { type: 'file.change'; path: string; status: 'A' | 'M' | 'D'; additions: number; deletions: number }
  | { type: 'terminal.data'; terminalId: string; data: string }
  | { type: 'usage.update'; contextUsed: number; contextMax: number; tokens: number; costUsd: number }
  | { type: 'turn.end'; turnId: string; ok: boolean; durationMs: number };

export interface AgentClient {
  sendMessage(sessionId: string, text: string, opts: { mode: 'build'|'plan'|'mission'|'skills'; model: string; effort: 'low'|'medium'|'high'; attachments?: File[] }): AsyncIterable<AgentEvent>;
  stop(sessionId: string): Promise<void>;
  respondPermission(id: string, decision: 'allow-once' | 'allow-always' | 'deny'): Promise<void>;
  restoreCheckpoint(sessionId: string, checkpointId: string, scope: 'code'|'conversation'|'both'): Promise<void>;
  listFiles(path: string): Promise<FileNode[]>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  git: { status(): Promise<GitStatus>; diff(path: string): Promise<Diff>; stage(paths: string[]): Promise<void>; commit(msg: string): Promise<string>; push(): Promise<void>; pull(): Promise<void>; branches(): Promise<Branch[]>; log(): Promise<Commit[]> };
  terminal: { open(): string; write(id: string, data: string): void; onData(id: string, cb: (d: string) => void): () => void };
  integrations: { list(): Promise<Integration[]>; connect(service: string, fields: Record<string,string>): Promise<void>; disconnect(accountId: string): Promise<void> };
  mcp: { list(): Promise<McpServer[]>; test(id: string): Promise<{ ok: boolean; latencyMs: number }>; upsert(s: McpServer): Promise<void>; remove(id: string): Promise<void> };
  skills: { list(): Promise<Skill[]>; toggle(id: string, on: boolean): Promise<void>; upsert(s: Skill): Promise<void> };
  usage: { get(range: '7d'|'30d'|'90d'): Promise<UsageReport> };
}
```
Define all referenced types in `lib/types.ts` (PlanStep, FileNode, GitStatus, Diff with hunks and word ranges, Branch, Commit, Integration with accounts, McpServer with tools, Skill, UsageReport with heatmap cells).

### 14.2 Mock behavior
- Implement `MockAgentClient` with an event scheduler that emits realistic timing: thinking 3–8s (as `think` tool), then groups of 2–6 tools (random durations 320–640ms each in demo mode; a "slow demo" setting makes them 1–2s), interleaved text deltas streamed word by word (18–42 ms per word), a final text, follow-up suggestions, and a `usage.update` after each tool.
- Seed scripts: (1) the sample from Appendix A (build `/chat` and `/cli` routes), (2) a "delete branches and keep main" Git scenario with Arabic text (use R13 content, to test RTL bullets and code chips), (3) a scenario that triggers a **permission request** (`rm -rf node_modules`, risk medium; `git push --force`, risk high), (4) an **error** scenario (build fails with a stack trace), (5) a **plan** scenario producing 6 plan steps.
- Mock file system in memory (a small Vite+React project tree plus the odd folders from R9: `.sdk`, `.tools`, `.verify`, `AndroidHarness`, `signing`, `VEXORA-artifacts`, `rename_package.sh`, `UNCHANGED_NAME_OCCURRENCES.txt`).
- Mock Git state with 7 changed files, 2 staged, branches `main`, `feature/activity-ui`, remote `origin/main`; diffs with realistic hunks and word-level changes.
- Mock sessions: 3 sessions seeded ("Clone Website Request", "Design System Extractor", "New chat") with history, one "running" to show the pulsing dot.
- Mock usage: 7-day numbers from R2 (140 messages, 24.7M tokens) and a heatmap with 2 active days.
- Persist sessions, settings and secrets (masked) in localStorage through Zustand persist. Provide a "Reset demo data" button in Settings > General > Data.
- A dev-only floating "Mock controls" panel (toggle via Ctrl+Shift+M): trigger scenarios, speed, simulate disconnect, simulate error.

### 14.3 State stores (Zustand)
`useSessions` (tabs, active id, messages, run state), `useWorkspace` (layout sizes, open tool tabs, dock height), `useSettings`, `useThemeStore`, `usePermissions`, `useGit`, `useFiles`, `useUsage`, `useShortcuts`. Keep stores small, selector-based, and never put high-frequency streaming text in a store that triggers whole-tree re-renders (stream into a ref-backed buffer and flush with `requestAnimationFrame`).

---

## PART 15. ACCESSIBILITY, PERFORMANCE, QUALITY

### Accessibility
- All interactive elements are real `button`/`a`/`input`; custom widgets implement ARIA roles (tabs, switch, menu, dialog, listbox, tree for Files, log for the chat stream with `aria-live="polite"`).
- Focus-visible ring on everything (2px `--focus`, offset 2px); focus is trapped in dialogs/drawer and restored on close.
- Touch targets ≥ 44×44 (visually smaller controls get expanded hit areas).
- Color contrast ≥ 4.5:1 for text, 3:1 for UI borders/icons, in every theme (write a small dev script that checks token pairs and fails the build on violations).
- Status is never color-only (dots have text/tooltips; diff lines have +/− gutters).
- Screen reader labels in both languages. Announce run start/end, permission requests and errors.
- Full keyboard navigation incl. tabs (arrow keys), tree (arrow keys, Enter, F2 rename), menus, palette.

### Performance
- Route-level code splitting; lazy load Monaco, xterm, Diff, Heatmap. Prefetch on hover of the corresponding launcher row.
- Virtualize long lists (messages > 200, file tree > 500 rows, logs, history) with a small virtualization hook.
- Animate only `transform` and `opacity` (except the grid-rows expand). Use `content-visibility: auto` for off-screen messages.
- Streaming text updates batched with rAF; no layout thrash while streaming.
- Images lazy, fonts system only. Initial JS < 250KB gzip before lazy chunks.

### Quality rules (anti-patterns to avoid)
- No default browser controls anywhere (selects, checkboxes, scrollbars). Style thin scrollbars (6px, `--line-strong` thumb, transparent track) on desktop; hide on touch.
- No pure `#000`/`#fff` surfaces except where specified; no random gradients outside the theme definitions.
- No drop shadows on text; no emojis; no stock illustrations.
- Consistent icon size per context (20 toolbar, 19 activity rows, 18 inline, 22 rail).
- Don't add features or copy that are not in this file unless needed for empty/loading/error states.
- Every string goes through i18n keys (`t('chat.run.workedFor', { time })`). Provide complete English and Arabic JSON files.

---

## PART 16. BUILD ORDER AND ACCEPTANCE CHECKLIST

### Build order (complete each before the next; keep the app running at every step)
1. **Foundation:** Vite setup, Tailwind with variables, tokens, theme registry with all 13 presets, `applyTheme`, i18n (EN/AR), the full `components/ui` library, and a hidden `/kitchen-sink` route showing every component in every state under a theme switcher.
2. **Shell:** top bar, session tabs (folder shape), rail, drawer, panel frame, responsive layout, command palette, shortcuts.
3. **Chat:** messages, run header, activity groups (Appendix A parity), composer with modes, model picker, context ring, permission card, checkpoints, follow-ups, reactions, scroll button; mock agent client with the seeded scenarios.
4. **Tool pane:** tab strip, launcher, files + editor, cloud browser + live preview, terminal dock, overview, changes (git + diff + commit), plan.
5. **Pages:** settings (all tabs), usage, integrations, connect page (fixed light), sites, skills, project settings, MCP, developer API, keyboard.
6. **Polish:** animations, empty/loading/error states, a11y pass, contrast script, reduced motion, performance pass, README with how to swap the mock client for a real backend and how to add a theme.

### Acceptance checklist (the work is not done until all are true)
- [ ] Side-by-side with R1–R17 at 390×844, each screen matches proportions, radius, border weight, icon style and the "pressable" bottom edge.
- [ ] Activity display behaves exactly like R6: one-row groups, auto summaries, spinner + shimmer while running, tap to expand details, header collapses after the run.
- [ ] All 13 themes switch instantly without flash; Auto follows the system; connect page stays light in all of them.
- [ ] Arabic mode: chrome not mirrored, text blocks RTL via `dir="auto"`, code LTR, lists correct (compare to R13).
- [ ] Parallel sessions work: 3 tabs, drag reorder, status dots, independent runs.
- [ ] Permission card blocks the run until answered; allow/deny affect the mock run; never auto-collapses.
- [ ] Checkpoint restore dialog works with the three scopes and Undo toast.
- [ ] Command palette and all listed shortcuts work and are remappable.
- [ ] Changes: stage/unstage, diff with word highlights, hunk accept/reject, commit with generated message, push/pull toasts.
- [ ] Terminal dock resizes with snap points; "Connecting terminal…" then a working mock prompt.
- [ ] No horizontal overflow at 320px width on any screen. No console errors. Lighthouse accessibility ≥ 95.
- [ ] README documents the `AgentClient` contract and theme authoring.

### Items to confirm with the owner (use these defaults until told otherwise)
1. Desktop layout (≥1024px) is included as specified in 3.6 and 5.6.
2. Locked themes are selectable (no paywall yet).
3. Mission mode semantics as defined in 8.1.
4. The connect page footer says "Secured by Composio" by default (configurable).
5. Proposed screens (Overview, Changes, Plan, MCP, Developer API, Keyboard, Billing, Account) follow the visual language but are not from screenshots.

---

## APPENDIX A. ACTIVITY DISPLAY REFERENCE (from R6, port to React 1:1)

### A.1 CSS essentials
```css
:root { --blue:#5aa9f0; --green:#4fc38a; --orange:#d28c4c; }

.runhead { display:flex; align-items:center; gap:6px; padding:4px 0; margin:0 0 6px; background:none; border:0;
  cursor:pointer; color:var(--muted); font-size:17px; line-height:1.3; text-align:start; }
.runhead svg { width:16px; height:16px; flex:none; transition:transform .2s ease; }
.turn.collapsed .runhead svg { transform:rotate(-90deg); }
.runbody { display:grid; grid-template-rows:1fr; transition:grid-template-rows .25s ease; }
.turn.collapsed .runbody { grid-template-rows:0fr; }
.runbody > .inner { overflow:hidden; min-height:0; }

.txt { font-size:17px; line-height:1.55; margin:14px 0; word-break:break-word; }
.txt code { font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace; font-size:.86em;
  background:#232326; border:1px solid #38383c; padding:1px 6px; border-radius:5px; }

.grp-row { display:flex; align-items:center; gap:12px; padding:5px 0; min-height:29px; color:var(--muted);
  font-size:15.5px; line-height:1.3; cursor:pointer; -webkit-tap-highlight-color:transparent; outline:none; border-radius:6px; }
.grp-row:focus-visible { box-shadow:0 0 0 2px #3b6ea8; }
.grp-row .ico { width:19px; height:19px; flex:none; display:grid; place-items:center; }
.grp-row .ico svg { width:19px; height:19px; fill:none; stroke:currentColor; stroke-width:1.7; stroke-linecap:round; stroke-linejoin:round; }
.grp-row .lbl { flex:1; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.c-blue{color:var(--blue)} .c-green{color:var(--green)} .c-orange{color:var(--orange)}

.grp.running .lbl { background:linear-gradient(90deg,#6c6c71 0%,#d6d6da 50%,#6c6c71 100%); background-size:200% 100%;
  -webkit-background-clip:text; background-clip:text; color:transparent; animation:shimmer 1.4s linear infinite; }
.spinner { width:15px; height:15px; border-radius:50%; border:2px solid #3a3a3e; border-top-color:var(--blue); animation:spin .8s linear infinite; }
@keyframes spin { to { transform:rotate(360deg); } }
@keyframes shimmer { to { background-position:-200% 0; } }

.detail { display:grid; grid-template-rows:0fr; transition:grid-template-rows .22s ease; }
.grp.open .detail { grid-template-rows:1fr; }
.detail > .inner { overflow:hidden; min-height:0; padding-inline-start:31px; }
.grp.open .detail > .inner { padding-bottom:6px; }
.dline { display:flex; gap:8px; align-items:baseline; color:#77777c; font-size:13.5px; line-height:1.5; padding:2px 0; min-width:0; }
.dline .k { flex:none; }
.dline .v { font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace; color:#9a9aa0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; min-width:0; }

.scrollbtn { position:absolute; left:50%; bottom:12px; width:40px; height:40px; margin-left:-20px; border-radius:50%;
  background:#1b1b1e; border:1.5px solid #3b3b40; display:grid; place-items:center; cursor:pointer; opacity:0; pointer-events:none;
  transform:translateY(6px); transition:opacity .2s ease, transform .2s ease; }
.scrollbtn.show { opacity:1; pointer-events:auto; transform:none; }

@media (prefers-reduced-motion: reduce) { *,*::before,*::after { animation-duration:.001ms!important; transition-duration:.001ms!important; } }
```
(In the app, replace the hard-coded colors above with theme variables; keep sizes, spacing, timing and easing identical.)

### A.2 Icons (24×24, stroke, Lucide paths; use `lucide-react` equivalents: Sparkles, Plug, File, FilePen, SquareTerminal, ChevronDown, AudioLines, ArrowUp, Square)
- sparkle (thinking) = `Sparkles`; plug (browser/MCP) = `Plug`; file (read) = `File`; edit = `FilePen`; terminal (commands) = `SquareTerminal`.

### A.3 Summary and icon logic
```ts
const CATS = {
  cmd:     { one: 'ran a command',    many: 'ran commands' },
  browser: { one: 'used the browser', many: 'used the browser' },
  read:    { one: 'read a file',      many: 'read files' },
  edit:    { one: 'edited a file',    many: 'edited files' },
  mcp:     { one: 'used an MCP tool', many: 'used MCP tools' },
  skill:   { one: 'used a skill',     many: 'used skills' },
  git:     { one: 'ran a git command', many: 'ran git commands' },
};
const RUNNING = { think:'Thinking…', cmd:'Running a command…', browser:'Using the browser…', read:'Reading files…',
  edit:'Editing files…', mcp:'Calling an MCP tool…', skill:'Using a skill…', git:'Running git…' };

function summarize(actions: string[]) {
  const order: string[] = [], counts: Record<string, number> = {};
  for (const a of actions) { if (a === 'think') continue; if (!(a in counts)) { counts[a] = 0; order.push(a); } counts[a]++; }
  const s = order.map(a => counts[a] === 1 ? CATS[a].one : CATS[a].many).join(', ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function iconFor(actions: string[]) {
  if (actions.includes('think')) return { icon: 'Sparkles', cls: 'c-blue' };
  switch (actions.find(a => a !== 'think')) {
    case 'browser': case 'mcp': return { icon: 'Plug', cls: 'c-blue' };
    case 'read':    return { icon: 'File', cls: 'c-green' };
    case 'edit':    return { icon: 'FilePen', cls: 'c-green' };
    default:        return { icon: 'SquareTerminal', cls: 'c-orange' };
  }
}
const fmt = (s: number) => { const m = Math.floor(s / 60), r = s % 60; return m ? `${m}m ${r}s` : `${r}s`; };
```

### A.4 Demo run (copy of the screenshot, use as the first seeded scenario)
Groups in order: `[think,cmd]` → text "Two routes: `/chat` (AI chat) and `/cli` (coding in your terminal). Let me inspect both." → `[browser,cmd,cmd,read]` → `[read,read,cmd,cmd,browser]` → `[think,browser,cmd,cmd,read]` → `[browser,cmd]` → text "Now I'll build both pages: multi-page Vite config, then the chat and CLI routes." → `[edit,edit,cmd]` → `[think,edit,cmd,cmd,browser]` → `[read,read,edit,edit,cmd,cmd]` → `[think,cmd,browser,read,read]` → `[edit,edit,browser,read,read]` → `[cmd,cmd,read,read,browser]`. Final text: "Both routes are built: `/chat` for the AI chat and `/cli` for the terminal. The build passes and the dev server is running."
Detail pools per kind: think (`Thought for 4s`, `for 7s`); cmd (`ls src`, `npm run build`, `git status --short`, `npx vite build`, `grep -rn "route" src`, `node scripts/check.mjs`); browser (`Opened localhost:5173/chat`, `Opened localhost:5173/cli`, `Clicked Send`, `Screenshot viewport 390x844`); read (`vite.config.ts`, `src/routes/chat.tsx`, `src/routes/cli.tsx`, `package.json`, `index.html`); edit (same files, label `Edited`).
Timing: each action 320–640 ms; after a group collapses wait 120–260 ms; text streams word by word at 18–42 ms.
Composer button states and the scroll-to-bottom behavior are as in 8.1 and 6.1. Timer label updates every 500 ms.

---
END OF PROMPT
