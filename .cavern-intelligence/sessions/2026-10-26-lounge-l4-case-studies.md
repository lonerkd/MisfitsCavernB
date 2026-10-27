# Session — 2026-10-26: Lounge L4 — Case studies, owner opt-in, behind a flag

**Decision (owner):** a production is featured only if its owner opts in.

**Built:** migration `20261028000000_hub_case_studies.sql` —
`projects.case_study_ok` (default off; only the creator can change it, by the
existing projects update policy); `hub_posts.kind` gains `case_study` and a
nullable `project_id` (only for that kind). Triggers: linking requires consent
(`hub_posts_check_consent`); withdrawing consent unlinks and unpublishes
(`projects_withdraw_case_study`). Two definer RPCs: `admin_case_study_projects`
(admin-only list of consenting productions) and `hub_case_study_project`
(title and logline, for readers of a published case study). UI: a Case studies
tab on `/hub`, the kind and production picker in `/admin/hub`, a production
card on the post page, and the owner's switch in Studio › Share
(`CaseStudyConsent`).

**Flag:** `hub_case_studies` — local and preview on, production admins only.

**Verified:** typecheck, lint (0 errors), unit tests, the new persona test
(8 pass: no link without consent, owner-only consent, admin list, Riley sees
the title only for a published consented case study, withdrawal pulls it back).
**Not applied** to production or staging — after merge.

**Left:** the production's media and a link to it on the case study.
