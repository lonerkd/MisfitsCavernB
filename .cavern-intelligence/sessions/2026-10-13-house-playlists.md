# Session — 2026-10-13: the player lists The Cavern's four playlists first

**Changed:** `lib/spotify/house.ts` holds The Trophy, Misfits Cavern, Misfits Too and Solitude (the owner's Spotify playlists). The player's list (`GlobalAudioWidget`) now starts with them, then the project's references, then the listener's own playlists (the house four are not repeated). Test: `lib/spotify/house.test.ts`.

**Why connecting may still fail (checked in code, not in the dashboard):** sign-in only works from `https://misfits-cavern-b.vercel.app` (or `NEXT_PUBLIC_APP_URL`), needs `NEXT_PUBLIC_SPOTIFY_CLIENT_ID` set in Vercel, and `<origin>/auth/spotify-callback` registered under Redirect URIs in the Spotify app. The Vercel connector can't read env variables here (403), so the owner has to check those three.

**Verified:** spotify tests 13/13, typecheck, lint (0 errors). **Not verified:** the player in a browser, the Spotify connection itself, build, CI.
