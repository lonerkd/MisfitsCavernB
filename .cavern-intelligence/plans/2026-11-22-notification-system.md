# Notifications that know the project (BACKLOG 3.53)

Owner, 2026-11-22: "a useful and impactful thing we need to design and build around the deep knowledge we can get from these tools and the context we can drive through well designed notifications, timing and user behaviour". Prompted by a talk on notification design (Duolingo's timing, Google Photos' specificity, the habit loop, and how phone AI now summarises and filters notifications). The owner said "dive in", so the design below is my own call and the owner can correct it.

## Why

The Cavern knows what no generic app does: the shoot day, who is called, which permit is open, what changed since the call sheet was issued, the phase, the budget. A notification built from that is *specific* ("the permit at the dock is still needed and you shoot there in 4 days") instead of a nudge ("check your project"). And the cost of a missed one is real money on set, so **trust beats engagement**.

## Principles (what we take from the talk, and what we leave)

1. **Specificity over personalisation.** Name the thing, the place, the day, the number. Every notification must make sense on its own, because a phone's AI summary may rewrite it.
2. **Context timing, not a fixed hour.** Send when it can be acted on: before a shoot, before a deadline, at a time this person has shown they read things.
3. **One strong notification beats three weak ones.** Urgent (a call sheet for a coming shoot) gets through always; the rest can wait, batch or stay in the bell.
4. **No dark patterns.** No streak guilt, no curiosity-gap bait ("someone viewed your…"), no loss-aversion for engagement's sake. A reminder is only sent when something real is at stake. This is a paid tool for working filmmakers, not a feed.
5. **The person is in control and can see why.** Quiet hours, per-kind switches, and (later) "why am I seeing this".
6. **Behaviour data stays private and is used only to time the person's own notifications.** Per person, never shared, never aggregated for anyone else.

## What exists (2026-11-22)

`notifications` (type, title, body, link, read), per-kind switches, Web Push live (sent the instant a row is written), about ten writers, the over-budget alert and call-sheet notices. No timing, no batching, no record of what people read.

## Built, slice 1 (2026-11-22, migration `20261122000300`)

- **Quiet hours** (Settings › Notifications): the person's own window in their time zone, which may cross midnight. A normal push is held (it stays in the bell, switched-off style, nothing is lost); **a call sheet is never held** (`URGENT_TYPES` in `lib/notifications/prefs.ts`).
- **What happened to each notification is recorded**: `read_at` (the database stamps it when `read` turns true), `pushed_at` (when the push went out) and `push_skipped` (switched-off, quiet-hours, no-devices, failed): the last two only the push sender can write. Together they give time-to-read per person per kind: the raw material for timing.

## Next slices, in order (each its own PR)

2. **Deliver what was held**: when quiet hours end, send one batched push ("3 things while you were away", each specific) instead of dropping them to the bell only. Needs a scheduled flush (pg_cron plus the existing dispatch route).
3. **Context notifications from the film graph**, evaluated daily per project, each only when something is genuinely at stake and never repeated for the same fact: a shoot in N days with an unconfirmed location or an open permit (the world checks already compute this), a call sheet changed since it was issued, notes still open on a cut the owner is about to lock, a budget that moved since it was approved, a milestone one step from done. Copy is specific; the link opens the exact place.
4. **Timing from behaviour**: per person and kind, the hour they usually read things (from `read_at`), used to pick the send time inside the day's window; a minimum gap between two pushes; a daily cap with the urgent kinds exempt.
5. **The person's view**: a "Why this?" line on each notification, per-kind switches for the new kinds, and a digest option (one summary a day, at a time they choose).
6. **Email** after the domain and Resend are set up: the same notifications, as a digest, for the people who do not use push.

## Non-goals

Streaks or badges for opening the app; marketing sends through this system; any notification that exists only to bring someone back; sharing a person's reading habits with anyone, including the project's owner.

## Open (owner)

Which context notifications matter most on a real shoot (slice 3 will start with the shoot-soon check unless told otherwise); whether the digest should default on or off; whether crew should be able to mute a project's notifications without leaving it.
