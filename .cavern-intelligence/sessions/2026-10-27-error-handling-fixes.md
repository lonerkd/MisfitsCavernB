# Session — 2026-10-27: three error-handling fixes from the local-model batch (#268, #269, #274)

**Why:** an automation batch opened 16 small "stop swallowing errors" PRs. They were each read; three were real, the rest were comment-only noise or harmful and were closed with a reason.

**Merged:** #268 (Settings tells the person when a preference cannot be saved), #269 (the Lounge reports when the profile fails to load, using the existing `reportError`), #274 (the transcript player reports when playback fails, using the existing toast).

**Verified:** each PR's CI (checks, conventional title, history, GitGuardian, Vercel preview) was green after catching up with `main` and before the squash merge; each diff was read against the repo's rule that every save checks its error and tells the person.

**Not verified:** no new unit tests cover these three catch paths; they are behaviour on failure only.
