# 2026-11-15 — One main landmark per suite page (BACKLOG 3.46 item 8)

- 15 suite pages rendered their own `<main>` inside the layout's `<main id="main-content">`; each is now a `div` (attributes kept), and the layout is untouched.
- `e2e/password-recovery.spec.ts` and `e2e/studio-journey.spec.ts` locate `#main-content` instead of `main`; a vitest guard (`app/(suite)/one-main-landmark.test.tsx`) fails if any suite page renders `<main` again.
