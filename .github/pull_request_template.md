## What

<!-- What changes for the people using the suite, in plain words. -->

## Database

<!-- "No migration", or the migration file and what it changes. A migration is
applied to production (and the fingerprint checked) before merging. -->

## Verified

<!-- `Verified: <what you ran and what you saw>`: the checks, the specs, a build against the local stack and, for anything a
person sees, what you looked at in a browser. Not-run or not-looked-at is not ready (the gate fails it); a real device, a real
account or a person may be named as the one thing not checked. -->

Verified: 

## Tests

<!-- Unit / integration (personas: owner, crew, outsider) / e2e added or changed,
and what you ran locally. -->

## Checklist

- [ ] PR title is a conventional commit (`feat: …`, `fix(editor): …`,
      `docs: …`) — it becomes the commit message on main
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run test` pass
- [ ] RLS changes tested as owner, crew and outsider
- [ ] Feedback via `useToast()`, confirmations via `useConfirm()`
- [ ] A note added in `.cavern-intelligence/sessions/`, `BACKLOG.md` updated, `npm run sync-intel` run (`STATE.md` only if the handoff changed)
