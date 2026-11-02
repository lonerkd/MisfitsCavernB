# Session — 2026-11-02: the island says where the shoot day is

On a shoot day the island's rest pill said only "On set · Day 1". It now also says where the day is: **"On set · Day 1 · Rolling · 3h 01m on set · 59m to wrap"** (the phone pill is shorter: "Rolling · 3h 01m on set"). The phase (crew called, rolling, lunch, wrapped), the time on set with lunch taken out, and the time to the call sheet's planned wrap, or "25m over" once it passes. Nothing is said before the crew call is stamped.

**How:** the pure `onSetLine(status)` (and `duration`) in `lib/island/onset.ts` word the existing `dayStatus` from the On set view (`lib/studio/onset.ts`), so the island and the On set screen cannot disagree. `useOnSet` reads the day's call sheet and set log live, and ticks every 30 seconds, only while today is a shoot day and the person has not stepped out (the subscriptions are off otherwise, so no extra cost on other days).

**Verified:** unit tests for the wording (phase, minutes, to wrap, over, wrapped, nothing before the call); a real browser (`e2e/island-onset-clock.spec.ts`: a call stamped 3 hours ago and rolling, the island reads "Rolling · 3h … on set · … to wrap"; the planned wrap is then moved 20 minutes into the past and, live, it reads "… 2xm over"); typecheck, lint, bundle budget unchanged (/studio 363.2 of 364 kB). No migration.

**Left:** a held activity with a Wrap button in the activity deck (BACKLOG 4.1).
