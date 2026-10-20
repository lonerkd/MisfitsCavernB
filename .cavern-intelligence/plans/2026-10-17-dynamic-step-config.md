# Dynamic step configuration — steps as data, not TypeScript

**Status: proposal (design only, 2026-10-17). Nothing built. Needs an owner call on §7 before slice 1.**

Source: ecosystem study of `lib/guides` (work order "Propose dynamic step
configuration"). Today a new guide step means editing `lib/guides/steps.ts`
(a ~500-line array `S: StepDef[]`) and, to appear in any guide, a string in
`lib/guides/workflows.ts`. This plan externalises both as validated JSON.

## 1. What is code and what is data today

| Piece | Where | Data-shaped? |
|---|---|---|
| `id, phase, title, hours, learn, teams, depts, text{do,tip,why,how,watch}` | `StepDef` in `steps.ts` | **Yes** — plain values |
| `place` | helper calls `hub()`, `studio()`, `view()`, `editor` → a `Place` union (`lib/os/progress.ts`) | **Yes** — the union is already JSON |
| `milestone` | a string id into `MILESTONES` (`lib/os/progress.ts`) | **Yes** — a reference |
| `auto: (s: ProjectSignals) => boolean` | 3 steps (`breakdown`, `revisions`, `record-episodes`) | **No** — a function; every use is `signal > 0` |
| Workflows: `steps: string[]`, `overrides` | `workflows.ts` | **Yes** — ids and partial text |
| `STRUCTURES`, `departmentOf()` (regexes), `withStructure()` special-case on `id === 'beats'` | `steps.ts`, `engine.ts` | Structures yes; the regexes and the `beats` hook stay code |

So only one field blocks "all JSON": `auto`. Everything else is a literal.

## 2. Design

### 2.1 Files

```
lib/guides/content/
  steps/            one JSON file per phase, arrays of StepConfig
    development.json
    pre-production.json
    production.json
    post-production.json
    delivery.json
    crew.json       (the on-the-crew steps; their `phase` still says where they sit)
  workflows/
    short-first.json  short.json  feature.json  ...   one Workflow each
  structures.json   (STRUCTURES)
lib/guides/config.ts   schema (zod), loader, compile step: StepConfig -> StepDef
```

Static `import x from './content/steps/development.json'` (tsconfig already has
`resolveJsonModule`), so it bundles at build time — **no runtime fetch, no
database**. "Without modifying TypeScript" means: add a JSON file/entry, run
`npm run test`, ship. Keeping it in the repo keeps the migration/RLS surface at
zero and the guide deterministic and unit-testable (RULES §2).

### 2.2 `StepConfig` — the JSON shape

It is `StepDef` with the function replaced by a declarative `autoWhen` and the
`Place` helpers replaced by the `Place` union literally.

```ts
// lib/guides/config.ts
import { z } from 'zod';

const SIGNAL_KEYS = [ /* numeric/boolean keys of ProjectSignals, derived — see §2.4 */ ] as const;

const Predicate = z.discriminatedUnion('op', [
  z.object({ op: z.literal('gt'),  signal: z.enum(SIGNAL_KEYS), value: z.number() }),
  z.object({ op: z.literal('gte'), signal: z.enum(SIGNAL_KEYS), value: z.number() }),
  z.object({ op: z.literal('is'),  signal: z.enum(SIGNAL_KEYS), value: z.boolean() }),
  z.object({ op: z.literal('all'), of: z.array(z.lazy(() => Predicate)).min(1) }),
  z.object({ op: z.literal('any'), of: z.array(z.lazy(() => Predicate)).min(1) }),
]);

export const StepConfig = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/),
  phase: z.enum(['development', 'pre-production', 'production', 'post-production', 'delivery']),
  title: z.string().min(1),
  place: PlaceSchema,                       // mirrors the Place union in lib/os/progress.ts
  hours: z.number().positive(),
  milestone: z.string().optional(),         // must exist in MILESTONES (checked in the test, §4)
  autoWhen: Predicate.optional(),           // replaces `auto`
  learn: z.boolean().optional(),
  teams: z.array(z.enum(['solo', 'small', 'crew'])).optional(),
  depts: z.array(DeptSchema).optional(),
  text: z.object({
    do: z.string(), tip: z.string(), why: z.string(),
    how: z.array(z.string()).min(1), watch: z.string().optional(),
  }),
}).strict().refine((s) => !(s.milestone && s.autoWhen), 'a step ticks from a milestone or a predicate, not both');
```

`compile(StepConfig): StepDef` is ~15 lines: copy fields, and turn `autoWhen`
into `(s) => evaluate(autoWhen, s)`. **`StepDef`, `engine.ts`, `applyOverride`,
and every consumer stay unchanged** — the engine still sees functions. That is
the whole integration point.

### 2.3 Before / after

Today (`steps.ts:225`, abridged):

```ts
{ id: 'breakdown', phase: 'pre-production', title: 'Break down the script',
  place: view('breakdown'), hours: 4, auto: (s) => s.breakdown_elements > 0, text: { ... } },
```

As data (`content/steps/pre-production.json`):

```json
{
  "id": "breakdown",
  "phase": "pre-production",
  "title": "Break down the script",
  "place": { "kind": "studio", "tab": "production", "view": "breakdown" },
  "hours": 4,
  "autoWhen": { "op": "gt", "signal": "breakdown_elements", "value": 0 },
  "text": { "do": "…", "tip": "…", "why": "…", "how": ["…"] }
}
```

A brand-new step, no TypeScript touched (`content/steps/production.json`):

```json
{
  "id": "safety-briefing",
  "phase": "production",
  "title": "Hold a safety briefing",
  "place": { "kind": "studio", "tab": "production", "view": "paperwork" },
  "hours": 0.5,
  "teams": ["small", "crew"],
  "autoWhen": { "op": "gte", "signal": "call_sheets", "value": 1 },
  "text": {
    "do": "Walk the crew through hazards, first aid and the nearest hospital before the first shot.",
    "tip": "Do it at the start of every shoot day, not just day one.",
    "why": "Most set injuries come from skipped routines on a rushed morning.",
    "how": ["Name the first-aider.", "Point out exits and hazards.", "Note it on the call sheet."]
  }
}
```

…and one line in a workflow (`content/workflows/short.json`):

```json
{
  "id": "short", "label": "Short film", "blurb": "Script to festivals, at a working pace.",
  "steps": ["logline", "brief", "...", "gear", "safety-briefing", "rehearse", "..."],
  "overrides": { "draft": { "hours": 12 } }
}
```

Workflow JSON is today's `Workflow` verbatim, which is why `workflows.ts` can
keep exporting `WORKFLOWS` / `WORKFLOW_BY_ID` / `pickWorkflow` / `applyOverride`
and just build the array from the imported files. The `POST` shared tail
(`...POST`) is expanded by one optional key, `"include": ["post"]`, resolved by
the loader against named groups in `workflows/_groups.json` (otherwise the
tail would be pasted into six files and drift).

### 2.4 What must stay code (and why)

- **`auto` logic beyond comparisons.** The predicate DSL covers every current
  use (`>0`) plus `>=`, booleans, `all`/`any`. Anything fancier (date maths on
  `shoot_start`, ratios like `scenes_wrapped / scenes`) is a **milestone** in
  `lib/os/progress.ts` — code, with a test — and the step references it by id.
  This keeps the DSL tiny and non-Turing-complete; no `eval`, no expression
  strings.
- **`signal` names.** `SIGNAL_KEYS` is derived from `ProjectSignals`
  (a `const` tuple kept next to the interface plus a type test that fails
  compilation when the two differ), so a typo in JSON fails the test, not
  production. Adding a *new signal* (a new query on the project) is still a
  code change — correctly, since it needs a data fetch and, maybe, RLS.
- **`departmentOf()` regexes** and the `beats` ↔ `STRUCTURES` special case in
  `withStructure`: left as code. (Optional later: `"structureBeats": true` on a
  step instead of the hard-coded id.)

### 2.5 Validation — failures at build, not in front of users

A new `lib/guides/config.test.ts` (runs in `npm run test`, so CI and the
`checks` job catch it) asserts, across all content files:

1. every file parses against `StepConfig` / `WorkflowConfig` (`.strict()`, so a
   misspelt key is an error, not silently ignored);
2. step ids unique; every workflow `steps[]` and `overrides` key names an
   existing step; no workflow lists a step twice;
3. every `milestone` exists in `MILESTONES`, and every `autoWhen.signal` is a
   `ProjectSignals` key of the right type (number vs boolean);
4. every `Place` resolves — `studio` tab/view in the known unions, `path`
   starts with `/`;
5. **parity test (slice 1 only):** the compiled steps deep-equal the legacy
   `S` array, with `auto` compared by evaluating both on a grid of signals —
   proves the migration lost nothing;
6. light text rules (non-empty `do`/`tip`/`why`, at least one `how` line) so
   content authors get guard rails the type system gave code authors.

The loader throws on invalid content at module load, so a bad file can never
render a half-guide.

## 3. Integration surface (what changes, what doesn't)

| File | Change |
|---|---|
| `lib/guides/steps.ts` | slice 1: `S` becomes `content/steps/*.json` → `compile`; exports `STEPS`, `StepDef`, `StepText`, `Dept`, `STRUCTURES`, `departmentOf` unchanged |
| `lib/guides/workflows.ts` | `WORKFLOWS` built from `content/workflows/*.json`; `pickWorkflow`, `applyOverride` unchanged |
| `lib/guides/engine.ts`, `index.ts`, `profile.ts`, all UI | **none** |
| `lib/guides/engine.test.ts` | unchanged; must stay green (it is the behaviour contract) |
| docs | `studio-and-preproduction.md` / bible guides page: "how to add a step"; `sync-intel` after |

## 4. Slices

1. **S (≈ half a session):** `config.ts` (schema, predicate, `compile`), move
   the 3 `auto` steps' logic into `autoWhen`, convert the whole library to JSON
   mechanically with a one-off script (not committed), parity test (§2.5-5),
   delete the TS array. No behaviour change; engine tests are the proof.
2. **S:** workflows to JSON + `include` groups; "how to add a step" doc.
3. **M, only if wanted (§7):** a per-project or per-organisation layer —
   see §5.

## 5. Not recommended now: database-stored steps

Storing steps in Postgres (an admin screen, like `/admin/crafts`) would let the
owner add a step without a deploy, but it costs a table with RLS, a persona
test, a migration applied by hand, admin UI, caching, versioning (a step that
changes under someone mid-project), and — decisively — it needs the
`autoWhen` DSL anyway. JSON-in-repo gets 90% of the benefit (no TypeScript, a
non-engineer can edit a file via PR; CI validates) at ~10% of the cost. The
JSON schema above is deliberately the same shape a future `guide_steps`
table would store as `jsonb`, so slice 3 is additive, not a rewrite. Revisit
if the owner wants to add steps live or let studios author their own.

## 6. Risks

- **Prose in JSON is worse to read/diff than TS template strings** — curly
  quotes (`’`) are fine in JSON, but long `why` strings lose line wrapping.
  Mitigation: one JSON file per phase, `prettier` on, and the parity test makes
  the conversion safe.
- **Bundle:** the step text is already TypeScript string literals wherever
  `steps.ts` is imported; JSON is about the same bytes. (Not measured — check
  with a build before slice 1.)
- **Expressiveness creep** in `autoWhen`: policy — new operators only by PR
  with a test; anything needing more is a milestone.
- **Translations (BACKLOG 4.3)** become easier (`text` is already isolated),
  not harder.

## 7. Decisions for the owner

1. Is repo-JSON enough, or is live editing without a deploy required (§5)?
2. May the three `auto` rules become the predicate DSL (recommended), rather
   than three new milestones?
3. Who authors steps — engineers only (then keep TS and do nothing) or
   non-engineers via PR (then do slices 1–2)?

**Done when:** adding a step is one JSON entry plus one id in a workflow file;
`config.test.ts` fails on any malformed or dangling entry; engine tests and the
parity test pass unchanged.
