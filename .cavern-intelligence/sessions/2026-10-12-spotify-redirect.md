# Session — 2026-10-12: Spotify's red "redirect" error

Owner: "fix Spotify, the red URL". Spotify's own sign-in page shows a red
"INVALID_CLIENT: Invalid redirect URI" when the address the app sends isn't
registered, exactly, in the Spotify app's settings. Likely causes in this code:
- it always sent the production address (or `NEXT_PUBLIC_APP_URL`, whose value I
  cannot read — env values are off limits) whatever site the person was on, so a
  preview or local start was bound to fail, and even a working start lost its
  sign-in state (kept in the starting tab) on the way back;
- `localhost` is no longer accepted by Spotify (loopback must be `127.0.0.1`);
- the Connect buttons called the sign-in function directly, so a failure was
  silent.

**Changed:** `lib/spotify/redirect.ts` (pure, 6 tests) decides where Spotify may
send the person back to: the deployed site (and an https `NEXT_PUBLIC_APP_URL`),
or `127.0.0.1`; otherwise it returns a reason. `redirectToSpotifyAuth` now
returns that reason (shown as a toast by both Connect buttons), refuses with a
message when there is no client id, and stores the redirect address it used so
the token exchange sends exactly the same. Documented in `bible/06`.

**Owner (cannot be done from the code):** in the Spotify dashboard › the app ›
Redirect URIs, have exactly `https://misfits-cavern-b.vercel.app/auth/spotify-callback`
(and, for local work, `http://127.0.0.1:<port>/auth/spotify-callback`); remove
`http://localhost…`. Check `NEXT_PUBLIC_SPOTIFY_CLIENT_ID` is set in Vercel, and that
`NEXT_PUBLIC_APP_URL` is empty or exactly the production address.

**Not verified:** a real sign-in with Spotify (needs the owner's Spotify app).
Verified: unit tests, eslint, typecheck, and `spotify-connect.spec.ts` on a local
build (the message appears, the person stays on the site). If a red error still
shows on Spotify's page, send me its exact text: it names the cause.
