# Session — 2026-10-27: the deep brain, B4 document profile

**Built:** `lib/scriptos/profile.ts` deterministically summarizes Fountain-forced
cue names and casing, scene-heading number styles, and transition punctuation.
Two or more explicit cue anchors in a title-case script allow the decoder to
recognize a later title-case cue; exact Fountain syntax remains fixed. Focused
tests cover the profile summary and this use as parser evidence.

**Still open:** broader profile inference needs independent labeled scripts;
B7 places/previous draft and B8 line overrides/per-writer memory remain open.
The private corpus and the target accuracy are unverified without owner-provided
scripts the owner has the right to use.

**Verified:** targeted ScriptOS tests, typecheck, and changed-file lint.
