# Every tool page: the header leads (and the Nov 27 pool)

Owner, Nov 27, 2026, over the Library tab: the view chips (Library /
Mood boards) rendered above the tool's header card. "Make all the
tool header the top of their page and everything else below they so
there is consistency."

## The audit

Every Studio tab was read for its order. Post, Overview, Scenes,
Promos and Share already lead with their header (TabHeader, with the
page-level ToolIntro above it on scenes/post/promos). Pitch renders
the deck itself — a presentation surface, no sub-nav — and is left
as the exception. Two offenders:

- **Library** — the chips sat above the header, and Mood boards had
  no header at all. Now both views lead with their TabHeader
  (References & Media / Mood boards), the switch sits under it, then
  the work.
- **Production** — the open tool's ToolIntro + ToolHeader rendered
  below the tool browser (search, your tools, recents, the grouped
  list), so a tool's page opened with navigation machinery instead
  of the tool. The header block now leads under the section header,
  the view follows, and the browser sits below the work — same
  controls, same ids, reachable by scrolling or the island's jump.

Pins: `components/studio/tabs/header-order.test.ts`.

## The pool

The owner also directed the queue be pooled under RULES 9 /
STATE §2b (the Vercel budget: 2–3 PRs open, one push per PR, one PR
per batch). This branch carries the seven green PRs of Nov 26 —
#806 (script scroll line), #807 (island one row + split-button
choice), #808 (split divider drag), #810 (cavern clean screen),
#811 (hub honest numbers), #812 (hub island room), #813 (readiness
in one line) — merged onto one branch with this header fix, verified
once, pushed once, as one PR. The seven close as superseded by it.

The Vercel free-plan deploy limit (hit Nov 26 ~22:52 CST) resets
~24h later; this PR's merge deploy is expected to fail against the
cap like the others. After the reset, one redeploy of `main` lands
everything queued since #800.
