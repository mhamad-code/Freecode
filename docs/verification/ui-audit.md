# UI honesty audit

Rule: every interactive element either works, or is visibly disabled with a reason (tooltip/sub-label). No silent click. No invented content.

Checked in a real Chromium (cloud browser, build served by `scripts/serve-dist.mjs` on an isolated origin, 390×844 viewport). Items marked **needs manual check** were not exercised in this pass; they are listed so the gap is visible.

## Files panel

| Element | Before | Fix | After |
|---|---|---|---|
| New file | Always created `notes.md`, no prompt | Inline focused input, Enter/Esc, nested paths (`src/utils/a.ts`), opens the file in the editor | Works, verified: empty name shows “Enter a name.”, nested file created and opened |
| New folder | Toast “New folder” only | Inline input + real folder node in the tree | Works, and the empty folder survives a reload (IndexedDB snapshot) |
| Folder with no files | Disappeared after reload | Tree node stored explicitly; panel shows “Empty folder” | Verified after reload |
| Path validation | None | `src/lib/pathValidation.ts`: empty, `\`, control chars, `.`/`..`, empty segment, >255 name, >1024 path, duplicate, file-as-parent | Unit-tested (7 cases) and verified for empty + nested |
| Upload | Toast “Upload” only | Menu: files / folder (`webkitdirectory`), drag & drop, 512 kB per file, 4 MB total, progress bar, conflict dialog (replace / keep both / cancel), binary files kept as base64 and shown as non-editable | Reads real files; binary placeholder rendered by the editor |
| Context menu | None | Right-click / long-press: open, new file/folder here, rename, duplicate, delete with confirmation, copy path | Wired to the same store operations |
| Rename / duplicate / delete | None | Tree, contents, binary map, editor tabs, runtime and agent `ProjectFS` all updated; every op appended to the activity log | Unit-tested tree ops; UI wiring inspected |
| Activity log | Only agent actions | New “File activity” section in Overview with the last 12 file operations | Rendered from `fsLog` |

## Browser tab

| Element | Before | Fix | After |
|---|---|---|---|
| Tab name | “Cloud browser” | “Browser” everywhere (tab title, launcher, i18n) | Verified |
| Demo page | Fake rendered page claiming “The agent can open pages, click, type and screenshot them” | Deleted; honest empty state instead | Verified absent from the DOM and guarded by the bundle check |
| Project preview | Nothing loaded | Loads `runtime.previewUrl` in the iframe; “Start the project preview” when stopped | Verified with the real preview |
| External URL | Pretended to load | Opens a new browser tab + inline note “External sites open in a new tab…” | Verified: note shown, no iframe |
| Back / forward / reload | Back/forward changed a fake state; reload faked a 700 ms spinner | Operate on the real preview history; reload bumps the iframe key | History of loaded preview URLs only |
| “…” menu | Zoom, device frame, “send screenshot to agent”, devtools, cookies | Only real actions: open in a new tab, copy address | Verified |

## Composer and chat

| Element | Before | Fix | After |
|---|---|---|---|
| Dictation button | Typed the placeholder phrase on a timer (fake) | Real Web Speech API; when the API is missing the button is disabled with an explanation | Chromium exposes the API, so the button is enabled and calls `SpeechRecognition` |
| Attachments (+, paperclip, screenshot, MCP resource, snapshot) | Menu items did nothing | Disabled items with the reason “model requests in this build cannot upload files” | Verified disabled + tooltip |
| Branch chip “main” | Fake branch | Removed until Git is real | — |
| Context popover | “200k tokens” fixed, compact button just closed | Real session numbers; compaction disabled with reason | Verified |
| User message edit | Toast only, text unchanged | Rewrites the message and truncates everything after it (real fork), then sends | Store action `resendFromMessage` |
| “Restore to here” | Toast only | Truncates the conversation to that message | Store action `truncateFromMessage` |
| Comment button | Toast only | Removed (with the thumbs up/down pair that only changed local state) | — |
| Mission banner | Fake “Mission: ship the multi-page build · step 3/9 · 34%” | Deleted | Guarded by the bundle check |
| Follow-up suggestions / scroll-to-bottom / copy | Real | Unchanged | — |

## Shell, drawer, palette

| Element | Before | Fix | After |
|---|---|---|---|
| Command palette files | Five hard-coded fake paths | Real project files from the store | Verified |
| Drawer “New project” | Toast | Disabled with “Projects arrive with the Git phase” | — |
| Drawer recent chats | Every row showed “2m” | Real `updatedAt` time | — |
| Share/report/what’s new | Toasts | Copy link real; others disabled with reasons | — |
| Help menu | Items did nothing | Shortcuts opens the real shortcuts page; Docs/Report/Discord disabled with reasons | — |
| Account → Sign out | Did nothing | Disabled with the auth-phase reason | — |
| Publish menu | “Downloading…”, “Building…”, fake push/deploy toasts | Download project now builds a real ZIP of the files; build/push/deploy disabled with reasons | ZIP path uses `fflate` |
| Session tabs | New/close/rename real; no reorder | Context rename/move left/right/close still pending; reorder is **not implemented** | needs manual check (see PROGRESS) |

## Changes / Overview

| Element | Before | Fix | After |
|---|---|---|---|
| Overview context/cost cards | Clickable buttons with empty handlers | Plain cards | — |
| Diff “Show 24 unchanged lines” | Toast | Removed | — |
| Diff file counter “2 of 7” | Hard-coded | Removed | — |
| Generate commit message | Toast “unavailable” | Disabled with the reason | — |
| Amend / create PR | Menu items claimed to work | Disabled with the Git-phase reason | — |
| History commit rows | Click toast “Opened …” | Static rows until Git exists | — |

## Settings

| Element | Before | Fix | After |
|---|---|---|---|
| Report issue / Discord | Toasts | Disabled with reasons | — |
| Reset | Toast said “Demo data reset” | Real reset + accurate toast | — |
| Delete all chats | Toast only | Really replaces the chats with a blank one | — |
| Skills gallery / upload / edit | Fake gallery and toasts | Discover+upload disabled, fake gallery deleted, edit disabled | Create/enable/disable still real |
| Project → Startup script | “Startup script ran” toast | Disabled with the sandbox reason | — |
| Project → Secrets | Claimed encrypted storage; values were component state | Copy corrected to “session only, not read by the agent yet” | Still not vault-backed (F8) |
| Project → Delete project | Toast | Disabled with reason | — |
| Keyboard | Editable key chips + reset did nothing; listed unimplemented shortcuts | Read-only real shortcuts; fake “Changes” group removed | — |
| Account | Fake email, GitHub handle, devices | Removed; display name now really saved to `localStorage` | — |
| GitHub/Google/2FA/delete account | Toasts | Disabled with auth-phase reasons | — |
| MCP add/import/test/remove | Toasts / no-op policy | Disabled with the MCP-phase reason | — |
| Themes, language, providers, export/import | Real | Unchanged | Export/import verified in F6 |

## Integrations / Sites

| Element | Before | Fix | After |
|---|---|---|---|
| Add custom integration | Dialog whose inputs did nothing | Button disabled with reason; fake dialog removed | — |
| Request integration | Toast | Disabled with reason | — |
| Connection screen | Simulated 1.1 s success for OAuth services | Banner added: the screen records locally and does not contact the provider | OAuth itself is still simulated → needs F8/F9 |
| Sites “Create with agent” | Created a blank chat and said “creating” | Creates the chat and sends the description to it | Verified in store logic |
| Site-type chips | Did nothing | Append their label to the description | — |

## F3–F6 re-check (this pass)

| Claim | Result |
|---|---|
| F3 real logos | `/integrations` renders 63 brand `<path>` elements and the honest local-only banner. Verified in this build. |
| F4 WebContainer shell | Terminal attached to `jsh`; `node -v` → `v24.22.2` (screenshot `ui-terminal.png`). |
| F4 preview | `index.html` rendered in the preview iframe (`ui-preview.png`); after editing and saving it, reloading the preview showed the new text (`ui-preview-updated.png`). |
| F4 project mount | Terminal `ls -la` now lists `index.html`, `src/`, `.freecode/` — this was broken (terminal booted without mounting the project) and is fixed. |
| F4 `npm install` / `npm run dev` | **Not supported.** The preview is a static server; it does not run the project's package manager or dev script. Recorded in `KNOWN_LIMITS.md`. |
| F5 checkpoints / recovery / steering | Not re-exercised today; covered by unit tests and the F5 record. |
| F6 reload persistence | Empty folder and `index.html` survived a reload; IndexedDB snapshot contains the tree, contents and the empty dir. |
| F6 export/import | Not re-run today (verified in F6), archive code unchanged in this pass. |
| F6 service worker / manifest | SW registered and controlling; manifest served. |
| Phone width (390×844) | All screens above were used at this width; the terminal dock bug at <1024 px was found and fixed. |
