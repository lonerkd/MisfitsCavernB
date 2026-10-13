# Session — 2026-10-13: Spotify search asks for 10 and says why it failed

**Found:** search asked for 12 results; Spotify's February 2026 Development Mode rules cap search at 10, and every failure showed only "Spotify search failed". Connecting also needs the app owner on Premium and each signed-in account on the app's allowlist (Developer Dashboard › User Management); without it sign-in finishes but API calls return 403.

**Changed:** `limit` 12 → 10; `lib/spotify/failure.ts` turns 401/403/429/400/5xx into a sentence that names the likely cause (test: `failure.test.ts`).

**Owner, in the Spotify dashboard (not checkable from here):** owner has Premium; your account is on User Management; `https://misfits-cavern-b.vercel.app/auth/spotify-callback` is a Redirect URI; `NEXT_PUBLIC_SPOTIFY_CLIENT_ID` is set in Vercel.

**Verified:** spotify tests, typecheck, lint. **Not verified:** the real Spotify API (no access from here), build, CI. The connect step itself is unchanged.
