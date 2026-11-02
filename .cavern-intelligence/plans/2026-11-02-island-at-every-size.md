# The island at every size — keyboard, mouse and touch as one workflow (plan)

Owner direction, 2026-11-02: under 760 px the island vanishes and the phone's tab-bar pill takes over, but plenty of devices under 760 px are not phones (narrow desktop windows, split screens, small tablets with keyboards). The island is a key part of the experience; it has to be an extension of the tools at every size, not a stripped pill, and the whole screen should be designed for how a keyboard, a pointer and the island work together: fast, layered, smooth.

## What is true today (checked in the code)

- The island is already one surface with **seven shapes** decided by signals, not a setting (`lib/island/mode.ts`: `rest`, `context`, `open`, `caps`, `live`, `dot`, `activity`). Its brain is React-free where it matters (`activityStore.ts`), `useOnSet` feeds both the dock and the pill, and pages describe themselves to it through one shared contract (`usePillStage` / `usePillZone`, `lib/os/PillContext.tsx`).
- The size switch is two CSS lines: `.dock { display: none }` under 760 px (`island.module.css`) and `.pill { display: flex }` (`mobile.module.css`).
- **The phone is not bare.** The pill shows where you are and the on-set line; it opens a **More sheet** (`MobileTabBar.tsx`) with the active page's own toggles and actions (from the same page descriptor the dock reads), a Places grid, a Tools grid, **Search everything** (the command palette) and Capture. Clicking a zone pins its descriptor (`pinZone`) there too.
- **What the phone lacks against the dock:** held live activities (call, upload, music, sprint, and the recording that has no screen yet); the held keyboard/long-press layer (`caps`, keyboard-only today); the hover context deck (`context`) and its breadcrumb; and **no pill or tab bar at all** on `/editor*`, `/split`, `/auth`, `/login`, `/privacy`, `/terms` and the public pages (`hiddenOn` in `MobileTabBar.tsx`): the Editor, the heart of writing, has no island on a phone.
- Under 760 px the choice is by width alone, whatever the device: a narrow desktop window with a keyboard and a mouse gets the phone's thumb layout and none of the dock's keyboard and hover layers.

## The recommendation

**Choose the surface by capability, not by width, and keep one core.**

1. **One island core** (modes, activities, commands, key map, on-set, search, notifications) with **three presentations** over it: the dock (room, pointer or keyboard), the pill (a thumb, little room), and a bottom sheet that either can open. The core already mostly exists; the pill is a second, thinner implementation to be folded in.
2. **A surface chooser** from signals, not a breakpoint: width class (≥1100, 760–1100, <760) × input (`pointer: fine` / `coarse`, `hover`, a keyboard seen in use). A narrow desktop window gets the *compact dock*; a phone gets the pill + sheet; a tablet with a keyboard gets whichever its last input says.
3. **Four layers, the same at every size** (only the way in changes: a key, a hover, a tap):
   - *Rest*: where you are and the one thing that matters there.
   - *Live*: what is running (call, upload, on set, sprint) with its controls.
   - *Context*: what the thing under the pointer or focus can do (today: hover; add: focus/long-press).
   - *Command*: one palette for everything, a typed grammar ("scene 12", "day 3", "cast maya", "wrap"), the same on a phone sheet as on a desktop. Every tool registers its actions with a key, so the palette, the Caps deck, the help overlay and the docs come from one list (generated, like the parser reference).
4. **Never strip the page to fit the island.** The island adds layers; a tool keeps its own toolbar and its primary controls on screen. The island may take a bounded strip of the screen (a reserved bottom zone, safe-area aware); it never covers content and never becomes the only way to a primary action.

## "Every inch": the screen contract

For each surface class, define the zones and who owns them — tool header, content, the island's zone, the sheet — and what the keyboard, the pointer and the touch each do in each zone. Four classes to design: ≥1100 pointer + keyboard; 760–1100 mixed; <760 touch; <760 pointer/keyboard (the narrow desktop that is missing today). The deliverable is a one-page map per class, checked in a browser at those sizes, before any build.

## Order

0. **Audit, as generated data (S) — first part built 2026-11-02 ([`island-coverage.md`](../island-coverage.md)):** an island-coverage reference (`npm run island:coverage`, a test keeps it current, like `parser-reference.md`): per route and view its stage, zones, actions and keys, against the four layers; what the pill lacks against the dock; the old-vs-new screenshot comparison. The generated route inventory and `keyboard-audit.spec.ts` are the start.
1. **Compact dock for narrow non-touch (S–M):** the quickest real win: under 760 px with a fine pointer or a keyboard, show a compact dock instead of nothing.
2. **One core, three presentations (M):** fold the pill into the core; activities, on-set line and search on the pill (this also makes the recording activity worth building: BACKLOG 4.1).
3. **Action registry and command grammar (M–L):** every tool registers actions with keys; the palette and Caps deck read it; generated reference and a help overlay.
4. **Tool-by-tool screen pass (L):** the zone maps applied route by route, starting with the Editor and the Studio schedule, measured in keystrokes and taps to reach the ten most common actions.

## Where the island came from — and whether anything was lost (checked in git and the notes, 2026-11-02)

Until the 2026-10-03 "one adaptive dock" change (`5a11e46d`, #96; the notes call it "the island session", `STATE-history.md`) the desk chrome was **two things side by side**: a dock (the app icons, a carousel) and, beside it, a **context capsule** (`ContextCapsule` in the old `EcosystemTaskbar.tsx`): a pulsing dot with the page's lead number that slid out to the right of the dock and, on hover or by key, opened into the page's full strip (its fields, toggles and actions) with a **zone breadcrumb** above it and a keyboard focus ring through the controls. The Caps Lock hotkeys (apps on keys, `b18722ba`, 2026-07-04) were older still and already drove "apps and pill navigation".

The island merged them into one surface that changes shape, in seven shapes (`lib/island/mode.ts`): `rest` is the old dot and lead number, `context` is the capsule's strip (breadcrumb included), `open` is the dock, `caps` is the keyboard deck (1–6 apps, Q–I the page's controls, `/` search), `dot` is a typing dot, and later `activity` holds what is running. So the slide-out dot was **folded into rest/context, not replaced by Caps Lock**; Caps Lock is the keyboard way into both the dock and the capsule.

**Nothing functional is missing in the code** (lead, fields, toggles, actions, breadcrumb, transient messages, keyboard focus all still exist in `EcosystemTaskbar.tsx`), but one thing about the *form* changed and is worth deciding on purpose: the dock and the context strip used to be **visible together and independent** (context slid out beside navigation and collapsed on its own); now one body takes one shape at a time (the open and Caps decks show both, but at rest/context the other is gone), and the app-icon carousel is gone. Not verified: how the old UI *looked* — that is from the code, not a screenshot; a build of `a9ba029b` can be screenshotted beside today's to settle it.

## What the island has to work with today (coverage, counted in the code)

The island is only as deep as what pages tell it. Pages register with `usePillStage` (the page's own pill) or `usePillZone` (a hover/focus zone): **6 stages** do (Studio, Projects, Portfolio, Jobs, Editor, and the Lounge through `useLounge`) and **3 zones** (the editor's centre views, the crew boards, the production manager). Every other area (Today, Hub, Soundtrack, Settings, Profile, Crew, Admin, Split, the call page) gets only a fallback name and next places from `lib/island/routes.ts`. The Studio is one stage for dozens of views (Schedule, Readiness, Locations, Money, On set, Cast & crew…), none with a zone of its own. So the work of "design every inch" is first **data**: a generated island-coverage reference (like the parser reference) listing, per route and per view, its stage, its zones, its actions and their keys, and what is missing — so the design is argued from what is there, not from memory.

## Owner answers so far (2026-11-02)

1. On a phone the island should **replace** the tab bar (leaning; the pill becomes the island's phone presentation, not a second thing).
4. A **long-press equivalent on touch** for the held layer: yes.
2. and 3. (the ten fast-path actions per tool; where a thumb should reach) still open: the coverage reference above is the input to 2.

## Delegated to Claude (owner, 2026-11-02: "I can't answer yet, I'll come with actually trying it; take charge")

The two open decisions are mine to make now and the owner's to correct after trying them. Defaults, with the reason, so they can be argued with:

**The ten fast-path actions: one fixed set of ten slots, the same keys in every tool** (muscle memory beats per-tool cleverness; the Caps deck already gives a page eight control keys, `CONTROL_KEYS` Q–I, so the set is eight keyed slots plus two on the held layer). Each tool fills the slots with its own action, or leaves one empty (never repurposed):

| Key | Slot | Editor | Studio schedule | Today |
|---|---|---|---|---|
| Q | **Create** | new scene | add a scene to a day | new task |
| W | **Jump** | go to scene / character | go to day / scene | go to project |
| E | **Find** | find and replace | filter the board | search |
| R | **View** | write / board / outline | strips / day-out-of-days | — |
| T | **Share / export** | export | print / call sheet | — |
| Y | **People** | cast and characters | cast and crew | — |
| U | **Note** | scene note | day note | — |
| I | **Live** | table read / sprint | wrap, roll (On set) | open the day |
| O, P (held layer) | **Undo / redo**, **Back up a level** | | | |

This is a draft to be corrected by use, not a final: step 0 (the generated coverage reference) fills the real table for every route from what pages already register, and the owner edits that.

**The thumb zone: bottom-anchored, three detents, mirrored on request.** The pill sits at the bottom; a sheet grows **upward** from it in three detents (peek: the page's top four actions; half: all ten slots plus search; full: places and tools); the primary action is bottom-right with a setting to mirror it for the left hand; nothing a tool needs often sits in the top third of a phone. **Long-press** on the pill is the held layer (the Caps layer's touch equivalent, per the owner); long-press on any zone is that zone's actions (the touch equivalent of hover context).

**To try, not to take on faith:** the narrow-window dock and the phone presentation ship behind an account flag (`island_v2`, `lib/flags.ts`) so the owner turns it on, tries it, and changes it; and the slots' use is counted per account (which key, which tool, how often, locally first) so the defaults are tuned by what the owner actually does rather than by this table. Both are part of step 1.

## What is still the owner's, after trying it

Whether the island replaces the tab bar on phones is leaning yes (owner, 2026-11-02), confirmed or reversed after trying `island_v2`; everything above is a default that the owner can change.

## The key model (owner, 2026-11-02) — three layers, one grammar

The owner's rule, recorded as a design decision (the owner delegated the open details):

1. **Ctrl/⌘ chords are global and mean the same in every tool.** Undo (⌘Z) and redo (⇧⌘Z / ⌘Y), save (⌘S), find (⌘F), new (⌘N), command palette (⌘K), go-to (⌘G), help (⌘/) — one meaning everywhere; a tool that cannot do one says so in the island rather than ignoring the key. A tool's own chords are added on top, never in conflict.
2. **Without Caps Lock, the island is the hover/context layer:** the controls of whatever the pointer or focus is on (the stage and zones pages register), the "screen-backed" controls.
3. **Caps Lock on adds the suite layer on top of 1 and 2:** the app switcher (every tool, project, place), the ten-slot deck, and everything the hover context offers — "all of that plus more". Nothing in the context layer disappears when Caps Lock is on.

**What the code does today (found 2026-11-02):** Caps Lock only toggles the deck (`kbActive`, `lib/os/PillContext.tsx`). Ctrl/⌘ chords are page-local: only the editor has them (`app/(suite)/editor/page.tsx`: ⌘S, F, E, G, /, and its own undo/redo bound to its textarea); the Split view has ⌘\; the Studio and the rest have no ⌘Z at all, and the shortcuts overlay (`ShortcutsOverlay.tsx`) lists what the editor and taskbar do, not a single table.

**Build order:** (a) one chord registry (`lib/os/chords.ts`: the global chords, who handles them now, a conflict test — no tool may bind a global chord to something else), with the editor's bindings moved onto it; (b) a suite-wide undo stack for non-text actions (delete, move, rename, status change) so ⌘Z is real outside the editor — each action registers its inverse, nothing is undone that cannot truly be undone; (c) the island shows the keys beside every action it offers (the coverage reference gains a keys column); (d) the shortcuts overlay is generated from the registry. Done when ⌘Z undoes the last action in the Studio, Projects and Jobs as it does in the editor, a test fails when two tools bind one chord differently, and Caps Lock shows the switcher plus the hover context together.
