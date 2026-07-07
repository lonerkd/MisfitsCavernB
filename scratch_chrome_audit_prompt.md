You're auditing **Misfits Cavern** (repo `lonerkd/MisfitsCavernB`), a production suite for indie
filmmakers — think Arc Studio + Pinterest + Notion + Final Draft + Discord + Spotify, all
project-scoped. Production URL: https://misfits-cavern-b.vercel.app. It's a Next.js 14 + Supabase
app; you have a real browser, so use it — click, drag, scroll, type, don't just read the DOM.

A coding agent (me, working from the terminal/repo side, no real browser available) just shipped a
batch of changes it could only verify via `tsc`/`next build`, never by actually using them. Your job
is to actually use them, find what's broken, and turn the working paths into a real Playwright test
suite so this stops happening. There is currently **no test suite in this repo at all** — you're
starting from zero.

## Setup

1. Sign up a fresh throwaway account (don't reuse a real one) via `/auth`. If sign-up requires email
   confirmation and you can't complete that, tell me instead of giving up silently.
2. Create at least one test project so the project-scoped features below have something to attach to.
3. Open the browser console and **check it after every interaction** — a page can render its shell
   while a data fetch or a click handler silently throws. Don't declare something "working" off a
   clean screenshot alone.

## Priority 1 — things I could not verify at all (no browser access)

These are the highest-risk items. I traced the logic by reading code, but never watched it run.

**EcosystemTaskbar (the floating dock at the bottom of every page):**
- Click the small chevron on the dock's left edge. It should collapse the whole dock down to a
  minimal pill (chevron + a colored dot) and expand back on click. Confirm the collapsed state
  survives a page reload (it's stored in `localStorage` under `mc_taskbar_collapsed`).
- The row of app icons (Hub/ScriptOS/Studio/Lounge/Portfolio) is supposed to be an **infinite-loop
  horizontal carousel**: scroll it with your mouse wheel and by click-dragging. It should never hit a
  hard stop in either direction — scrolling far enough should loop seamlessly back to the start. This
  is the part I'm least confident in; if you see a visible jump/flicker instead of a seamless wrap,
  that's a real bug, describe exactly when it happens.
- Hover over a page element that shows the "context pill" (top-right-ish capsule near the dock,
  appears on hovering certain in-page controls) so it expands. The app-icon row should narrow to
  about 2 icons wide with a fade at the edges, *not* relayout the rest of the dock. When you stop
  interacting with the carousel, after roughly a second it should smoothly glide back to its original
  scroll position on its own — but only once you've stopped scrolling; it should never fight an
  active scroll/drag.
- Holding Caps Lock is supposed to arm a keyboard-hotkey layer and also count as "context expanded"
  (same shrink behavior as above). Check this doesn't conflict with the carousel.
- Confirm dock icons for a module hide/reappear correctly when you toggle that module off in a
  project's Settings panel (see below) — e.g. turning off "Studio" should remove Studio's dock icon
  *for that project* and Cmd/Ctrl+1..5 hotkeys should skip it too.

**Auth (`/auth`):**
- Try signing in with a wrong password. You should see an inline red "Incorrect email or password."
  message, not a silent failure. I found the code path looks correct but want it confirmed live.
- Try the weak-password gate on sign-up, invalid email format, empty fields.

**Project hub (`/projects/[id]`) — new panels:**
- **Settings panel**: change the "Default script format" dropdown, toggle each ecosystem module
  (ScriptOS/Studio/Lounge/Portfolio/Distribution) off and on. Confirm each toggle actually
  hides/shows that department's tile on this same hub page live, without a refresh.
- **Festival Submissions panel**: add a submission with a name + deadline, change its status via the
  dropdown, delete it. Confirm it persists across a reload.

**Editor (`/editor`):**
- Confirm there's now a small colored pill near the top-left showing the active project's name,
  clickable, linking to that project's hub. Switch active project (via the taskbar's project
  switcher) and confirm this indicator updates.
- If you set a project's "Default script format" in its Settings panel, then create a *new* script
  for that project, confirm the new script actually uses that format (not just the project-type
  default).

**Studio (`/studio`) — Promos tab:**
- Confirm the "Promos" tab disappears entirely when you turn off the Distribution module for the
  active project (Settings panel), and reappears when you turn it back on.
- Create a campaign with a target demographic and a budget number. Confirm it displays correctly and
  that "Campaign Overview" shows a real spend/budget total once you set one.

## Priority 2 — general regression pass

Click through every top-level area at least once and watch the console: Home, Projects (board +
hub), Editor, Studio (all tabs), Lounge, Crew, Jobs, Portfolio (+ manage), Profile, Settings,
Soundtrack, Admin (if your account has access). Look specifically for anything that a recent
project-settings/module-toggle change could have broken elsewhere in the suite — e.g. a page that
assumed all modules are always enabled.

## Deliverable

1. A written list of real bugs found, each with: exact repro steps, what you expected vs. what
   happened, and a console error/screenshot if there was one. Don't fix anything blind — report
   first so a human can prioritize.
2. A Playwright test suite (`playwright.config.ts` + tests under `e2e/`) covering the golden path for
   every flow above that actually worked when you tried it. Use real assertions (visible text,
   element state, `localStorage` value) — not just "the page didn't crash." Structure one spec file
   per feature area (e.g. `e2e/taskbar.spec.ts`, `e2e/auth.spec.ts`, `e2e/project-settings.spec.ts`,
   `e2e/editor.spec.ts`, `e2e/studio-campaigns.spec.ts`) so it's easy to see what's covered.
3. If you had to install anything or work around missing tooling to get Playwright running against
   this app, note that too — it should be a one-command `npm test` for the next person.
