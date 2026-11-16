# 2026-11-15 — a persona spec for /community (BACKLOG 3.36)

**What:** `e2e/community-personas.spec.ts`, on the shared helper (`e2e/support/stack.ts`). Three people: Sam owns a project (an announcements channel with a message, a private channel, a task for Jordan, a crew notification); Jordan is confirmed crew; Riley is an outsider.

**Asserts:** Jordan sees the project in Your projects, the task in Yours to do, the announcement in Updates, his role, and the announcements channel's unread in the Lounge card; the private channel does not appear for him until he is made a member, then it does (2 unread). Riley sees no project name, task, announcement, private channel or Sam's name, while What's new (a published hub post) and the section headings stay. Sam sees his own project.

**Note on "What's new":** it is Misfits Cavern's newsletter (`hub_posts`), not project news, so the project's announcement is asserted in Updates and the Lounge unread; What's new is the public part both Jordan and Riley see.

**Verified:** `npx playwright test --list` (3 tests), typecheck, lint. **Not run:** no Docker here; the spec runs on a real stack in the nightly (`e2e-scheduled.yml`, dispatched on this branch). Seeding by service role assumes no trigger on `messages` / `channels` needs `auth.uid()`; if the run says otherwise, adjust the seed.
