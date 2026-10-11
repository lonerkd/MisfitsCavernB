# The Cavern's design language

Agreed with the owner 2026-10-10, from a side-by-side of three art directions
on the same call sheet (`Lens`, `Sheet`, `Sky`) and then of the two picks
joined. The owner's words: *"3 is most polished and intuitive for what the
tool is, but 2 has the swag."* The brief behind it: the suite looked tacky
(one typewriter-style face on everything, cream on every word, small tracked
capitals), had a lot of reading on every page, and should teach itself
instead of being a book to learn.

**The idea: the day's sky on top, production paper underneath.**
What you read at a glance is drawn (the sun, the light, the limit). What you
fill in and send is paper: heavy type, ruled boxes, stamps. Everything else is
quiet.

## The rules

1. **Show, don't write.** A working screen has no paragraphs. State is shown
   as a shape, a colour, a stamp, a number or a drawing. A sentence appears
   when something needs saying that a mark can't, and then it is one line.
   Budget: if a screen has more than about 30 words that aren't a name or a
   value, cut.
2. **One interface face.** Hanken Grotesk, variable. Titles at 800–900, tight
   (`letter-spacing: -0.02em`), sentence case. Body 400–500. Numbers are
   tabular (`font-variant-numeric: tabular-nums`, set on `body`), so times and
   page counts line up without a monospace.
3. **The typewriter is for the script.** Courier Prime (`--script`) on the
   screenplay surfaces only. Monospace (`--code`, DM Mono) for code and the
   Terminal theme. Cormorant (`--read`) for long reading (the legal pages).
4. **Cream is paper, not text.** Text is a cool neutral (`--fg` #e9ebef). The
   cream (`--paper`, #ece8d5, with `--on-paper` ink) is a *surface* for the
   forms people work in: call sheets, breakdown sheets, anything printed or
   sent. `--cream` (#e0ddae) survives as a title colour on dark, sparingly.
5. **Red means "past a limit", and nothing else.** `--limit` (the sinopia
   accent): wrap after sunset, over budget, over the day's pages. Buttons
   that are merely primary use the ink or paper, not red.
6. **No tracked capitals.** Labels are sentence case, except the small field labels printed on Paper (a form's "Date", "Call", "Scenes"), which are capitals as on a printed form. Capitals and their
   tracking go through `--caps` / `--caps-track` (both off by default;
   Terminal turns them on). The screenplay's own capitals (slug lines, cues,
   transitions) are format, and are left alone.
7. **Type has a floor.** 11px, on a desk as well as a phone
   (`--mc-min-font`). Scale: 11 · 12 · 13 · 14 · 16 · 20 · 24 · 32, plus
   display sizes for titles. Contrast and the axe gate are unchanged.
8. **Structure is information.** A rule, a border or a number means
   something: a ruled box is a field on a form; a coloured strip is a kind of
   scene; a black strip is a company move; the stamp is the state of the
   document. Nothing is decoration.

## The pieces

| Piece | Means | Where |
|---|---|---|
| **Sky** | A day's light at a place: the sun's path from sunrise to sunset, magic hour, and the working day laid on it, with the hours past sunset drawn in `--limit`. Computed from the film graph (`lib/film`). | Call sheet header; each day on the schedule; a location |
| **Paper** | A form: ruled boxes, heavy type, ink on cream. | Call sheet, breakdown sheet, anything that prints |
| **Time box** | A ruled cell holding one time (Call, Shoot, Wrap). Filled `--limit` when it breaks a limit; empty when unset. | Call sheet, schedule |
| **Stamp** | The state of a document (Draft, Issued, Wrapped), tilted, outlined, said once. | Call sheets, schedules, paperwork |
| **Strip** | One scene as a stripboard strip, in the paper board's colours (`--strip-*`): yellow day exterior, white day interior, blue night interior, green night exterior. A black strip marks a company move. | Schedule |
| **The pill** | The island on a phone: one pill at the foot, replacing the tab bar. Where you are, and one tap to everything. | Phone shell |

## The suite learns you

Nobody should read a book to use this. The interface adapts, and keeps
adapting, to **who you are** (your craft), **where the production is** (its
phase), and **what you have actually done** (not a questionnaire). It uses
all three to decide what you see first, how dense it is, and which hint
shows. Hints appear at the moment of need and retire for good once the thing
is done. The connected film graph is what makes this possible (the same
facts, filtered to your job), and "my day, per role" is the first expression
of it. Today the suite only uses phase and craft to unlock tools and to
offer guides; moving that into the interface itself is the next work.

## How it is built

- Tokens in `app/globals.css`: `--ui`, `--code`, `--read`, `--display`
  (= `--ui`), `--wordmark`, `--paper`, `--on-paper`, `--paper-faint`,
  `--paper-rule`, `--limit`, `--strip-ext-day` / `-int-day` / `-int-night` /
  `-ext-night`, `--cream`, `--caps`, `--caps-track`. `--mono` stays as the
  name of the interface-text role the suite already used 858 times; it now
  resolves to `--ui` (and to `--code` in Terminal), so the whole suite
  changed from one token.
- Every theme can restyle the language through the same tokens. A new theme
  sets colours; it inherits the type, the caps switch and the floor.
- Colour is never the only carrier of state: the stamp has words, the limit
  has the time beside it, a strip has its label.

## Built

`components/film/` (`Sky`, `Paper`, `TimeBox`, `Stamp`; geometry in `lib/film/sky.ts`), and on them the **call sheet** (the day's sky, then paper: ruled Call / Shoot / Wrap boxes, a stamp, strips, calls) and the **stripboard** (each day with its own sky and date, strips in the paper board's colours, black strips for company moves).

**The island on a phone** is one pill (project, page, unread) with Capture beside it, replacing the tab bar.

## One island, everywhere (owner, 2026-10-11)

The top bar goes. The back button, the page title, the logo and the project switcher are all **part of the island**, structured in and around it, and the phone and the desk are **the same island**: one design, scaled, not two. What differs is the mode, not the layout:

- **Normal**: the island as designed. Where you are, the next places, Capture.
- **Offline**: the island says so and what is waiting to sync. Everything that works offline stays reachable; what can't says why.
- **On set / remote set**: the day's controls first (the clock, the shot, continuity, Capture), big and one-handed; the rest a tap away.

And **no duplicated information**: a fact is shown once, in the place that owns it. A project's name isn't in a bar *and* a heading *and* a pill; a phase isn't in a stepper *and* a panel; a count isn't beside a title *and* in the body. When the island carries it, the page doesn't.

## The suite-wide pass

Screen by screen, to the rules above. Each pass is a PR; a pass ends when its screens read at a glance.

1. **Done — the shared pieces** (every Studio tab, the hub, every empty state): page headers are a title and the numbers that matter (no eyebrow, no description); the "New here" banner is one line (the tool and what it is; why it arrived is a tooltip); hub tiles are a name and an icon (the blurb is a tooltip); empty states are an icon, a title and one short line that invites an action.
2. **Done: the project board and hub.** The board lost its phase strip and empty-column boxes; the hub lost its header stepper and eyebrow, the logline reads as a line of text, only the next milestone explains itself. Tracked spacing on non-capital text is gone suite-wide (it goes through `--caps-track`).
2b. **Next: the island absorbs the top bar** (above): one island on desk and phone, the offline and on-set modes, and the duplicates removed as each page loses its bar.
3. Jobs, Crew and the profile; the Lounge.
4. Settings, Portfolio, Soundtrack, the editor's chrome (not the script).
5. Money, Paperwork, Breakdown and Readiness on Paper (forms) and Sky where a day or a place is involved.
6. Live activities in the phone pill (a call, a recording, an upload, sync state).
7. Role- and phase-aware first screens ("my day").


## On set (decided 2026-10-11)

The island takes over by itself on a shoot day: a chip reading "On set · Day N" that opens the on-set tools, with a × to step out for that day (kept per device). Offline is the same on desk and phone: "Offline · N waiting", then "Sending N" when the connection is back. Both come from `lib/island/` (`condition.ts`, `onset.ts`).
