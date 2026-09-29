## What

<!-- What changes for the people using the suite, in plain words. -->

## Database

<!-- "No migration", or the migration file and what it changes. A migration is
applied to production (and the fingerprint checked) before merging. -->

## Tests

<!-- Unit / integration (personas: owner, crew, outsider) / e2e added or changed,
and what you ran locally. -->

## Checklist

- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run test` pass
- [ ] RLS changes tested as owner, crew and outsider
- [ ] Feedback via `useToast()`, confirmations via `useConfirm()`
- [ ] `.cavern-intelligence/STATE.md` updated, `npm run sync-intel` run
