# The role model: Sam, Jordan and Riley, expanded to the roles on a production (owner, 2026-11-13)

**Owner's ask (the message was cut off after "in a integrated intuitive way that"):** the three-person model must grow into the specific roles we expect on any project, designed in depth so each action a role may want is catered for, integrated and intuitive. This plan is the design; nothing is built. Companion to [the role completeness map](2026-11-13-role-completeness-map.md) (what each role must be able to finish) and [the Reveal Gate](2026-11-13-reveal-gate.md).

## What exists (checked 2026-11-13)

- **Access** is the project's creator (Sam) plus `project_crew.role` in `lead | contributor | viewer`, with `status` `pending | confirmed | declined` (`20260927020000_crafts.sql`). `internal.can_access_project` reads, `internal.can_shape_project` writes (creator, or a confirmed `lead` / `contributor` on a non-private project); both are used by 39 migrations' policies.
- **Craft** (what a person does) lives on the profile (`lib/crafts`), not on the crew row. So a coordinator, a sound mixer and a producer have the same rights today, and nobody is *scoped* by department: any writer sees every budget line, every private note, every casting submission.
- Persona tests: Sam (owner), Jordan (crew), Riley (outsider).

## The design: three layers, kept apart

1. **Access tier** (what the database enforces): owner, lead, contributor, viewer, guest. Unchanged meaning; RLS stays the boundary.
2. **Project role** (what the person is on *this* project): a row-level label from a fixed catalogue of ~28 roles in 7 departments, chosen on the crew row (`project_crew.project_role`, text, checked against the catalogue). A person can hold several (a writer-director). A role is a *template*, never a hand-edited permission list.
3. **Capabilities** (what an action needs): a small named set (`script.write`, `script.comment`, `budget.read`, `budget.write`, `schedule.write`, `callsheet.issue`, `casting.read`, `casting.decide`, `media.approve`, `review.request`, `crew.invite`, `crew.pay`, `settings.write`, ...). A role template grants a default set; the owner can add or remove a capability per person; the UI asks for the capability, never for a role name. RLS checks a capability through one new helper, `internal.has_capability(pid, 'budget.read')`, so each policy says what it protects, and the existing helpers become thin wrappers.

This keeps Sam / Jordan / Riley as the *tests* (owner, someone scoped, an outsider) and adds one persona test per role family.

## Roles (the catalogue)

| Dept | Roles | Default tier |
|---|---|---|
| Story | Showrunner, Writer, Co-writer, Script editor, Story producer | lead / contributor |
| Production | Producer, Line producer, Production manager, Coordinator, Accountant | lead / contributor |
| Direction | Director, First AD, Second AD, Script supervisor | lead / contributor |
| Camera & light | DP, Camera operator, Gaffer, DIT | contributor |
| Art | Production designer, Art director, Costume, Makeup, Props, Location manager | contributor |
| Sound & music | Sound mixer, Sound designer, Music supervisor, Composer | contributor |
| Post | Editor, Colourist, VFX, Post supervisor | contributor |
| Cast | Casting director, Cast member (actor) | contributor / viewer |
| Outside | Client / approver, Investor, Festival or distributor guest, Press | guest |

Creator-lane variants (YouTube, podcast, copy, prose) reuse the catalogue: *Host*, *Editor*, *Sponsor*, *Account lead* map to Director, Editor, Client, Producer, with their own labels in the UI. No new access logic.

## What each family can do (the matrix to implement and test)

Legend: **W** write, **R** read, **C** comment, **A** approve, **-** nothing, **own** only their department's or their own records.

| Capability | Writer | Producer | Coordinator | 1st AD | Director | Dept head (camera, art, sound...) | Editor | Cast | Client | Guest |
|---|---|---|---|---|---|---|---|---|---|---|
| Script | W | R | R | R | W / C | R (own scenes) | R | own sides | version under review | review link only |
| Breakdown / elements | R | W | R | W | R | W own category | R | - | - | - |
| Schedule | R | W | W | W | C / A | R | R | own days | - | - |
| Call sheet | - | issue | issue | issue | R | R | - | own call | - | - |
| Budget | - | W | R (own lines) | - | - | R own department | - | - | summary if shared | - |
| Casting submissions | - | R | R | - | A | - | - | own only | - | - |
| Locations | - | A | W | R | A | W (manager) | - | - | - | - |
| Media / references | W | W | W | R | W / A | W own board | W | R | A on shared | R shared |
| Review of cuts | C | A | R | - | A | C | W | - | A | A via link |
| Crew list and contacts | R | W | W | R | R | R own dept | R | R own call | - | - |
| Paperwork / releases | - | W | W | - | - | W own | - | own | - | - |
| Project settings, delete, invite | - | invite | invite | - | - | - | - | - | - | - |

The rule behind every cell: **a role sees the whole story but only its own money and people-data**, and writes only its own department's records.

## Actions, by moment (the "each possible action" list to design for)

For each role family the design lists the moments they live in, and every action must exist where they are working, not in a global menu: **joining** (accept an invite, see my role, my first task), **prep** (my department's checklist, questions to the director against a scene, requests to production), **the day before** (my call, what changed since I last looked, an acknowledgement), **on set** (phone: my scenes, my notes, a log entry, offline), **after** (wrap my department: returns, releases, credit confirmation, handoff to post), **review** (comment at a time or on a scene, approve a version), **leaving** (keep my credit and contacts, lose access to the rest). The surface for each is the existing island action layer and the tool headers (`ToolHeader`'s Next step reads the person's role).

## Intuitive, integrated

- **One invite does it**: choose a person, choose a role (template), see in plain words what they will and will not see ("Sound mixer: sees the script and schedule, their department's budget, the call sheet; cannot see other departments' budgets or casting"); the person sees the same sentence on arrival.
- **My view**: each role lands on a role-shaped *Today* (the Community "Your day" generalised): my scenes, my tasks, what changed, what I owe. The full tool set stays reachable (the shared graph); what is hidden is irrelevant noise, not access that the tier grants.
- **Why-denied is explained**: a refused action says which capability it needs and who can grant it (a request button for the owner), never a silent empty list.
- **Change impact by role**: a schedule or script change notifies exactly the roles whose capabilities it touches (the call-sheet X3 handoff).
- **View as** (`lib/os/viewAs.ts`, 3.23) gains "view as this role" so the owner sees what each role sees before inviting.

## Build order (each step shippable, persona-tested)

1. **Catalogue and labels** (S): the role list as data, `project_crew.project_role` (migration, persona test), the invite and crew screens show and set it. No permission change yet.
2. **Capabilities and `has_capability`** (M): the helper, role templates as data, the existing helpers delegate; a persona test per role family (reads and writes allowed ✅, others ❌, Riley ❌). Migrations go to production and staging as usual.
3. **Scope the sensitive data** (M): budget, casting submissions, paperwork and private notes move to their capabilities (today any member reads them); this is the first change that *removes* access, so it needs the owner's go on the default templates.
4. **Role-shaped Today and the invite sentence** (M).
5. **Why-denied and request access** (S).
6. **View as role, and per-role e2e** (M): the two-browser spec per family (writer, coordinator, camera head, editor, cast, client).
7. **Cross-project persistence** (S): a credit per role survives wrap (the portfolio already reads credits).

## Decisions for the owner

- Is the catalogue right (28 roles), and are creator-lane roles just relabels? (default: yes)
- Step 3 hides budget and casting from roles that can see them today: confirm the matrix above as the default, with the owner able to override per person.
- Should a role be able to hold more than one tier at once (a producer who is also the cast)? (default: the highest tier wins, roles add up)
