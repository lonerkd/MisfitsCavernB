# 2026-11-22 — the tool beside a project is remembered (BACKLOG 3.47, slice 7)

- `lib/split/pair.ts`: `pairOf`, `validPartner`, `readPartner`/`writePartner` (localStorage `mc_pair_partner_<projectId>`, a device preference like the Two panes offer).
- The split page writes the partner whenever one pane is a project's own page; the project page's Two panes link opens the remembered tool, else the phase's (`projectPairSearch` takes it).
- Conservative choices: device-level (not account), only a safe path that belongs to that project's suite is accepted; no automatic redirect.
- Tests: `lib/split/pair.test.ts`, `core.test.ts`.
- Not done: a phone spec of the stacked panes; the owner using the pair.
