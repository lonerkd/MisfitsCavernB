# 2026-11-26 — The owner's marked-up changes (auth heading, greeting, landing trim)

Owner session: Peter sent annotated screenshots of the phone app. His markup
is a design language — a red X means remove/replace, text written beside an
element is his suggested alternative, circles highlight problem areas. This PR
builds the two changes he marked in words:

- **Sign-up heading:** X over "JOIN THE", "WELCOME" written beside it — and the
  lower line stays (owner's clarification the same evening). `authHeading('signup')`
  now returns `['WELCOME', 'CAVERN']`. A unit test pins the copy. The italic
  "Join the cavern." line underneath is untouched.
- **Sign-in greeting:** his "Good to see you again, misfit." replaces the
  italic subline "Welcome back, misfit." (the duplicate line in his shot was
  his replacement sitting next to the original).
- **Landing:** the whole "BEGIN YOUR FILM" closing section was X'd — removed,
  not restyled. `ClosingCta` is no longer rendered on the home page and the
  component + its test are deleted.

Verified locally: bible regenerated, typecheck clean, `lib/auth/heading.test.ts`
2/2, eslint clean on the touched files. The visual proof is the owner's phone
after deploy.
