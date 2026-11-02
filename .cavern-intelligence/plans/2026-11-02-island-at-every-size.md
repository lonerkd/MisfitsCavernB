# The island at every size — keyboard, mouse and touch as one workflow (plan)

Owner direction, 2026-11-02: under 760 px the island vanishes and the phone's tab-bar pill takes over, but plenty of devices under 760 px are not phones (narrow desktop windows, split screens, small tablets with keyboards). The island is a key part of the experience; it has to be an extension of the tools at every size, not a stripped pill, and the whole screen should be designed for how a keyboard, a pointer and the island work together: fast, layered, smooth.

## What is true today (checked in the code)

- The island is already "one surface with six shapes" decided by signals, not a setting (`lib/island/mode.ts`: activity, dot, rest, live, context, open, caps). Its brain is React-free where it matters (`activityStore.ts`), and `useOnSet` already feeds both the dock and the pill.
- The size switch is two CSS lines: `.dock { display: none }` under 760 px (`island.module.css`) and `.pill { display: flex }` (`mobile.module.css`). Everything under 760 px gets the pill, whatever the device: no live activities, no context deck, no Caps layer, no command depth.
- Two of the island's shapes need a keyboard or a hover (`caps`, `context`); on touch nothing replaces them.

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

0. **Audit (S):** every route's keyboard and pointer actions against the four layers (the generated route inventory and `keyboard-audit.spec.ts` are the start); list what the pill lacks against the dock.
1. **Compact dock for narrow non-touch (S–M):** the quickest real win: under 760 px with a fine pointer or a keyboard, show a compact dock instead of nothing.
2. **One core, three presentations (M):** fold the pill into the core; activities, on-set line and search on the pill (this also makes the recording activity worth building: BACKLOG 4.1).
3. **Action registry and command grammar (M–L):** every tool registers actions with keys; the palette and Caps deck read it; generated reference and a help overlay.
4. **Tool-by-tool screen pass (L):** the zone maps applied route by route, starting with the Editor and the Studio schedule, measured in keystrokes and taps to reach the ten most common actions.

## Decisions needed from the owner (these are design, not code)

1. On a phone, does the island replace the tab bar, or sit beside it (today: the pill *is* the tab bar)?
2. The ten fast-path actions per tool (write, schedule, cast, call sheet, wrap…) in the owner's own priority — these set the key map and the thumb zone.
3. Where on a phone the thumb should reach: bottom only, or a bottom sheet that grows?
4. Whether a Caps Lock-style held layer should exist on touch (a long-press equivalent) or stay a keyboard thing.
