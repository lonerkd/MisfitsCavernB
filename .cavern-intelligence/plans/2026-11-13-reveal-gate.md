# The Reveal Gate (owner direction, 2026-11-12)

**Direction.** The owner has no film or tech network, so the launch is a private, finite **reveal** of the whole suite, not an early public golden-path launch. The reveal happens when a fixed, written checklist is green, not when it feels ready. Before it: secret testing by 3-5 trusted people, and the first creative drop ready.

## The gate (every line is checkable)

1. **Tests**: `e2e-local` nightly green for 7 days running; `main` CI green.
2. **Strangers**: sign-up, email confirmation and password reset work on production through a custom SMTP sender (BACKLOG 1, 3.15).
3. **Security**: leaked-password protection on; no open P0/P1; advisors reviewed.
4. **Production**: Vercel deploys current with `main` (a Hobby pause once left it behind: see the 2026-11 session note), Supabase usage inside its plan.
5. **Phone**: one real iPhone pass (3.41), install to Home Screen.
6. **Embarrassments gone**: the stats ticker shows no total under a floor ("2 Creators"), 3.46 findings fixed or decided against, throwaway QA accounts deleted (3.37).
7. **Legal**: lawyer review of `/privacy` and `/terms`.
8. **First drop**: one finished creative piece made in the suite, ready to show.

## Audience matrix (measured against the code, 2026-11-12)

| Audience | State | Gap |
|---|---|---|
| Filmmakers | built end to end | owner use, real iPhone |
| Commercial ad writers | built (3.32) | branded PDF, past-version export, non-Latin PDF font |
| Podcast / documentary | partial (`podcast`, `doc-outline` formats) | no audio-first tools |
| YouTubers | **no native format** | the registry (`lib/formats/script-formats.ts`) has 7: screenplay, teleplay, stage-play, treatment, podcast, doc-outline, copy |
| Blog writers | none | no format |
| Spotify | real, needs Premium, fakes only in tests | a real Premium pass |
| Discord | own Lounge chat and voice (cap 8) | SFU (3.24); Discord integration (4.2) blocked |
| Pinterest / Drive-style docs and sheets | absent | not scoped |

## Decisions still the owner's

Which audiences must be in the reveal (YouTube and blog formats are new work, M each); the date or the trigger; who the 3-5 testers are.
