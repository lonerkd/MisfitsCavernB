# The Project Brief — the shared project model

Every system in the suite (ScriptOS, Studio, the Lounge, Jobs, the phase
engine) writes what it learns about a project into the database. The brief is
what the project **is and is aiming for**, collected as choices phase by
phase. `lib/brief` reads both and tells each tool what this project needs.
Think Dynamic Link between Premiere and After Effects, for a whole production.

```
 brief_questions (catalogue, admin data)      project_context(project)  ← scenes, locations, night EXTs,
        │ options carry `implies`                     │                   crew crafts, breakdown, castings,
        ▼                                             │                   channels, viewers, budget
 project_brief (answers, validated)                   │
        └──────────────► lib/brief ◄──────────────────┘ ◄── script runtime/pages (lib/scriptos/timing)
                           │  implications(): crafts · breakdown · channels · pages/day
                           │  nextMoves(): ask · warn · gap · tip (ranked, phase-aware)
                           ▼
   Project page (BriefPanel) · Studio Crew & Breakdown (BriefHints) · Editor Stats (target length)
   · Lounge (channel suggestions) · Jobs (role posts written from the project)
```

## Data

| Table / function | What |
|---|---|
| `brief_questions` | The catalogue: `key`, `phase`, `label`, `hint`, `kind` (`one`/`many`/`number`), `options` `[{id,label,hint?,implies?}]`, `unit`, `min_value`/`max_value`, `ask_when` (`formats`, `not_formats`, `answer:{key:[ids]}`), `position`. Read by anyone; admins write. |
| `project_brief` | One row per (project, question). Checked by `internal.project_brief_guard` against the catalogue; `answered_by`/`updated_at` set by the server. Read: `can_access_project`. Write: `internal.can_shape_project` (owner, or confirmed lead/contributor — not viewers). |
| `channel_presets` | Lounge channels a production tends to want: name, type, audience, post policy, topic, the phase they become useful, why. Admin data. |
| `project_context(p)` | jsonb of what the suite knows (null for outsiders). |

`implies` on an option: `crafts` (names in `crafts`), `breakdown` (category
keys), `channels` (preset keys), `pages_per_day` (pace). An integration test
checks every implied craft exists.

## Read from the screenplay (`lib/brief/script.ts`)

An option may carry `detect`: `words` (whole words in action lines, with
s/es/ed/d/ing endings), `night_exteriors` (EXT…NIGHT headings) or
`ages_under` (a character intro like "TOMMY (8)"). `scanScript` returns
evidence per option with scene numbers. Until the question is answered the
evidence counts as chosen (roles, breakdown, reasons like "stunts or fights
in the script (scene 2)"); after, it's suggested (`script:<question>` move
with one-click Add; chips marked "· script"). Tune the words in the
catalogue — no code change.

## Analysis (`lib/brief/core.ts`, pure + unit-tested)

- `visibleQuestions` / `isAsked` — format and earlier answers decide what's asked.
- `implications` — crafts, breakdown categories, channels and pace the answers call for, with the choices behind each (`because`).
- `nextMoves` — ranked moves for the current phase: unanswered questions (this phase and the next), script vs target length, festival shorts over 40 min, shoot days vs pace, missing roles, empty breakdown categories, night exteriors without a gaffer, scenes without references, uncast characters, channels the brief calls for, a vertical cut for social, licensed music vs release.
- `suggestChannels` — presets reached by phase or implied, not open, with an audience to fill.
- `rolePost` — a job post for a role, written from the brief and context.

## Adding to it

- **A question or option**: insert into `brief_questions` (a migration for built-ins). No code change — it appears on the project page, and its `implies` flow into every tool.
- **A new kind of implication or move**: extend `Implies` / `nextMoves` in `lib/brief/core.ts` with a test; show it where the work is done via `<BriefHints ids={[…]} />`.
- **A tool that should adapt**: read `useProjectBrief(projectId, format, phase)` (or `useBriefAnswer` for one value) — never re-ask what the brief knows.
