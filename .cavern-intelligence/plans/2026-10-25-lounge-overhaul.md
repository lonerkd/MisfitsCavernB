# The Lounge overhaul — plan (2026-10-25)

Owner direction (2026-10-25): the Lounge is the core for converted users. A
full redesign, plus a **platform-wide hub** where Misfits Cavern educates,
communicates and updates the people who use the suite, and handles
**incidents**, **case studies** and **support cases**.

Before L0: one page, `app/(suite)/lounge/page.tsx` (927 lines), plus
`components/lounge/*` (~900 lines). Channels with audiences, threads,
reactions, pins, unread, search, guide channels, voice (mesh, ≤8), Discord
bridge. Engineering: `lounge-and-audio.md`; screens: `bible/06-lounge-and-sound.md`.

## Shape after the overhaul

The Lounge gets three areas behind one left rail:

1. **Hub** (new, platform-wide; **the landing page**): the Misfits Cavern
   newsletter — *What's new*, *Learn*, *Status*, *Case studies*, *Help* — with
   one page per audience: **developers**, **filmmakers**, **buyers** (of
   projects) and **investors** (in the platform).
2. **Productions**: the active project's channels and voice, as today.
3. **People**: DMs and community channels.

## The hub — data (one new migration per slice, RLS from birth)

- `hub_posts` — `kind` (`update` | `guide` | `incident` | `case_study`),
  `audience` (`everyone` | `developers` | `filmmakers` | `buyers` |
  `investors`), `important` (sends a push), title, body (markdown), cover
  media, `published_at`, `pinned`, for incidents `severity` + `resolved_at`. **Read:** everyone signed in, published
  only. **Write:** admins (`profiles.is_admin`). One SELECT policy.
- `hub_reads` — who has seen which post (drives the "new" badge and a push for
  `update`/`incident` through the existing notifications → Web Push path).
- `support_cases` + `support_case_messages` — a person opens a case (subject,
  body, optional screenshot, the page they were on); only they and admins read
  it; admins answer, set status (`open` → `waiting` → `resolved`). Each answer
  notifies the person (in-app + push).

Personas: Sam/Jordan/Riley all **read** published posts (they are platform,
not project, content); **only admins write**; a support case is readable by
its opener and admins only — Riley opening a case sees only Riley's. Persona
tests in `tests/integration/` for each table.

## Slices, in order

| | Slice | Size | Done when |
|---|---|---|---|
| **L0** ✅ (2026-10-25) | Take the page apart: split `lounge/page.tsx` into a layout, rail, channel view, composer, thread and voice components with no behaviour change | M | page under 300 lines; existing e2e and unit tests pass unchanged |
| **L1** ✅ (2026-10-25) | Hub as newsletter: *What's new* + *Learn* (`hub_posts` kinds `update`, `guide`), the four audience pages, admin editor at `/admin/hub`, "new" badge, push only for posts marked important; the hub becomes the landing page | M | an admin publishes an update, a member sees the badge and a push; persona test |
| **L2** ✅ (2026-10-26, behind flag `hub_status`) | *Status*: incidents (severity, updates, resolved), a banner across the suite while one is open | S | an open incident shows a banner everywhere; resolving clears it |
| **L3** ✅ (2026-10-26) | *Help*: support cases, admin queue at `/admin/support` | M | a member opens a case, an admin answers, the member is notified; Riley can't read others' |
| **L4** | *Case studies*: long-form posts with media, linked to a public production where the owner agreed | S | a case study renders with media and links |
| **L5** | Redesign: the three-area rail, phone layout, empty states, onboarding into the hub | M | design review on desktop and phone; screens regenerated (`npm run bible:shots`) |
| **L6** | Move today's read-only guide channels into *Learn* | S | no `type = 'guide'` channels left; links redirect |

## Decisions (owner, 2026-10-25)

1. **Who writes:** admins only, for now. A full model of roles — who reaches
   which page, in which state, when, and for what — comes later, once the rest
   of the suite is complete (it needs every surface to exist).
2. **Push:** only for posts marked important.
3. **Order:** the newsletter (What's new, Learn, the audience pages) first,
   then Help. Help answers stay in-app until the email sender exists (3.15).
4. **Case studies:** not yet decided — proposed: only productions whose owner opts in.
5. **Landing:** the hub is the landing page. **Today** stays what it is: the
   offline-first, phone-first view of a project's shoot day — not a landing page.
