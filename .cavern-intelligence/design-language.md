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

## Not yet done (in order)

1. Live activities in the island (a call, a recording, an upload, music, a timer, sync state): the pill's resting text is the slot they take over.
2. The rest of the suite, screen by screen, to the word budget (breakdown, readiness, locations, on set, money, the project hub…).
3. Role- and phase-aware first screens ("my day").
