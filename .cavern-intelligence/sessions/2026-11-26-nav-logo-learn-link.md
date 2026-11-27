# 2026-11-26 — Home nav clears the clock; Learn / What's new lands on the feed

Two owner reports from the phone, same evening batch:

1. **The home nav's logo hid under the status-bar clock.** `Navigation` is
   fixed at `top: 0` with a flat 12/18 px top padding, so in the installed
   app the iOS clock overlays the mark. The bar now adds the app's own
   `--mc-safe-top` inset to its top padding: the frosted background still
   runs to the top edge, the logo and links sit just under the time, and
   desktop (inset 0) is unchanged.

2. **"Learn / What's new" went to the home page.** The Lounge rail row
   linked `/hub`, which is now only a redirect to `/` — the anchor was
   lost and the tap landed at the top of home. The feed itself is the
   home page's updates section (`YourDay`'s `<section id="updates">`), so
   the rail now links `/#updates` directly, and the `/hub` redirect lands
   on `/#updates` too (query string preserved). The rail test's four href
   pins moved with the fix.

No database changes. The phone checks are the owner's: the logo visible
under the clock on the home page, and the rail row landing on the feed.
