# Session — 2026-10-12: notify() says when it failed

`notify()` threw away the insert's error, so a notification that could not be sent looked sent. It now returns the error message (null on success). The announcement box uses it: if some crew could not be told it says so ("Posted, but 1 person could not be told — they will still see it in the Lounge."). The other callers still ignore the result (BACKLOG 3.23) — fix each as it is touched.

**Verified:** typecheck, eslint; announcements and community specs on a real build. **Not verified:** CI (billing).
