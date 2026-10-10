# Film graph, step 1: days and places → daylight — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A shoot day and a location become real linked rows, and the schedule, the locations view and the call sheet show each day's sunrise, sunset and magic hour for where it shoots, with warnings when the plan fights the light.

**Architecture:** One migration adds `shoot_days`, `scenes.location_id`, `scenes.shoot_day_id`, `call_sheets.shoot_day_id` and coordinates on `project_locations`; triggers keep the new links and the old text/number columns in step, so today's code keeps working. A new pure module, `lib/film/`, computes sun times and assembles each day (scenes, places, light, warnings, company moves). Three Studio views read it.

**Tech Stack:** Postgres (Supabase migrations, RLS), TypeScript, React 19 / Next 16, Vitest (unit + integration personas), Playwright.

**Spec:** `.cavern-intelligence/film-graph-spec.md` (§2a spine, §4, §5 route, §6 step 1)

## Global Constraints

- No outside service: sun times are computed locally; coordinates come from the device ("I'm here") or pasted text. No geocoding, no weather API.
- `supabase/migrations/` is the only schema source; after the migration run `npm run db:drift -- --update` (snapshot) and `npm run db:types`; CI fails on either being stale.
- Data access only through `lib/` (`supabase.from` is a lint error in `app/` and `components/`).
- No native `alert`/`confirm`/`prompt`; toasts via `useToast`, confirms via `useConfirm`.
- Every screen passes axe (WCAG 2.2 A/AA); colours and sizes from the design tokens (`design-tokens.md`), no raw px font sizes below the type floor.
- RLS: new tables carry `project_id`, enabled RLS, one policy `internal.can_access_project(project_id)` for read and write (what `scenes`, `call_sheets` and `project_locations` use today).
- The old columns stay correct: `scenes.location`, `scenes.shoot_day`, `call_sheets.shoot_day`, `call_sheets.shoot_date` are still read by existing code.
- Coverage floors (50/50/52/50 on `lib/`) must hold; PR title is a conventional commit; never push to `main`.

## Review Focus

1. **A location with no coordinates** (every location today): no light line, a plain "Add where this is" prompt — never `NaN`, `Invalid Date` or an empty box. → Task 4 test, Task 6.
2. **A day with no date:** no light; the day says "Set a date to see the light". → Task 4 test.
3. **High latitudes** (sun never sets / never rises on that date): says so in words; no crash, no nonsense times. → Task 1 test.
4. **The location is in another timezone than the viewer:** times are the location's local time, labelled with its zone. → Task 1 test (`formatInZone`), Task 4 test.
5. **A rewrite changes a scene's heading location, or the location record is removed:** `location_id` follows the heading; removing a record nulls the link without breaking the Locations view. → Task 3 integration tests.

---

### Task 1: Sun times

**Files:**
- Create: `lib/film/daylight.ts`
- Test: `lib/film/daylight.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface SunTimes {
    /** UTC instants. Null when the sun doesn't cross that elevation on this date. */
    dawn: Date | null;        // civil dawn, sun at -6°
    sunrise: Date | null;     // -0.833°
    goldenEnds: Date | null;  // morning, sun reaches +6°
    solarNoon: Date;
    goldenStarts: Date | null;// evening, sun falls to +6°
    sunset: Date | null;
    dusk: Date | null;        // civil dusk, -6°
    /** 'day' = sun never sets, 'night' = never rises, null = a normal day. */
    polar: 'day' | 'night' | null;
    /** Minutes between sunrise and sunset (0 for polar night, 1440 for polar day). */
    daylightMinutes: number;
  }
  export function sunTimes(date: string /* YYYY-MM-DD, the local calendar day at the place */, latitude: number, longitude: number): SunTimes;
  export function formatInZone(at: Date | null, timeZone: string): string; // "07:52", "" for null
  export function isCoordinate(latitude: unknown, longitude: unknown): boolean; // finite, |lat|<=90, |lng|<=180
  ```

- [ ] **Step 1: Write the failing tests** (`lib/film/daylight.test.ts`)

  ```ts
  const mins = (d: Date | null, tz: string) => { const [h, m] = formatInZone(d, tz).split(':').map(Number); return h * 60 + m; };
  const near = (actual: number, hhmm: string, tol = 4) => { const [h, m] = hhmm.split(':').map(Number); expect(Math.abs(actual - (h * 60 + m))).toBeLessThanOrEqual(tol); };

  it('Calgary, midsummer', () => {
    const t = sunTimes('2026-06-21', 51.0447, -114.0719);
    near(mins(t.sunrise, 'America/Edmonton'), '05:21'); near(mins(t.sunset, 'America/Edmonton'), '21:54');
    expect(t.polar).toBeNull(); expect(t.daylightMinutes).toBeGreaterThan(985); expect(t.daylightMinutes).toBeLessThan(1000);
  });
  it('Calgary, midwinter', () => {
    const t = sunTimes('2026-12-21', 51.0447, -114.0719);
    near(mins(t.sunrise, 'America/Edmonton'), '08:37'); near(mins(t.sunset, 'America/Edmonton'), '16:32');
  });
  it('the equator at the equinox is about twelve hours', () => {
    const t = sunTimes('2026-03-20', -0.1807, -78.4678);
    expect(Math.abs(t.daylightMinutes - 727)).toBeLessThanOrEqual(4);
  });
  it('orders the day: dawn < sunrise < golden ends < noon < golden starts < sunset < dusk', () => { /* Calgary 2026-09-15, strictly increasing */ });
  it('Tromsø: midnight sun and polar night', () => {
    expect(sunTimes('2026-06-21', 69.6492, 18.9553)).toMatchObject({ polar: 'day', sunrise: null, sunset: null, daylightMinutes: 1440 });
    expect(sunTimes('2026-12-21', 69.6492, 18.9553)).toMatchObject({ polar: 'night', sunrise: null, sunset: null, daylightMinutes: 0 });
  });
  it('the southern hemisphere has long days in December', () => {
    expect(sunTimes('2026-12-21', -33.8688, 151.2093).daylightMinutes).toBeGreaterThan(850);
  });
  it('formats in the place’s zone, and nothing for null', () => {
    expect(formatInZone(new Date('2026-06-21T11:21:00Z'), 'America/Edmonton')).toBe('05:21');
    expect(formatInZone(null, 'America/Edmonton')).toBe('');
    expect(formatInZone(new Date('2026-06-21T11:21:00Z'), 'Not/AZone')).toBe('11:21'); // falls back to UTC
  });
  it('isCoordinate refuses nonsense', () => { /* (91,0), (0,181), (NaN,0), ('51','-114'), (null,null) false; (51.04,-114.07) true; (0,0) true */ });
  ```

- [ ] **Step 2: Run** `npx vitest run lib/film/daylight.test.ts` — Expected: FAIL, module not found.

- [ ] **Step 3: Implement.** NOAA solar position (no dependency). For the date, take 12:00 UTC of that calendar day shifted by `-longitude/15` hours as the first guess of solar noon; compute the equation of time and declination from the fractional year; for an elevation `h`, hour angle `H = acos((sin h − sin φ sin δ) / (cos φ cos δ))`; rise = noon − H, set = noon + H (4 minutes per degree). `|cos H| > 1` means no crossing: `polar` is `'day'` when the noon elevation is above −0.833°, else `'night'`. Recompute declination at each event once (one refinement) to stay within the tolerance. `formatInZone` uses `Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone })`, catching `RangeError` to fall back to UTC.

- [ ] **Step 4: Run** the test file — Expected: PASS (8 tests).

- [ ] **Step 5: Commit** `feat: sun times for a place and a date (film graph 1)`

### Task 2: Coordinates from what people paste

**Files:**
- Create: `lib/film/coordinates.ts`
- Test: `lib/film/coordinates.test.ts`

**Interfaces:**
- Consumes: `isCoordinate` (Task 1)
- Produces:
  ```ts
  export interface Coordinates { latitude: number; longitude: number }
  /** "51.0447, -114.0719", "51.0447 -114.0719", "51°02'41\"N 114°04'19\"W", or a maps link containing @lat,lng / q=lat,lng / ll=lat,lng / !3dLAT!4dLNG. Null when there's none. */
  export function parseCoordinates(text: string): Coordinates | null;
  /** Straight-line distance in kilometres. */
  export function distanceKm(a: Coordinates, b: Coordinates): number;
  ```

- [ ] **Step 1: Failing tests** — one `it.each` per accepted form above asserting `{ latitude: 51.0447, longitude: -114.0719 }` to 4 decimals (the DMS case to 3); rejected: `''`, `'the old harbour'`, `'91, 10'`, `'51.0'`, a link with no coordinates; `distanceKm` Calgary (51.0447, −114.0719) → Banff (51.1784, −115.5708) is `105 ± 2`, and a point to itself is `0`.
- [ ] **Step 2: Run** — FAIL, module not found.
- [ ] **Step 3: Implement** (regexes for each form, tried in the order listed; haversine with R = 6371).
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat: read coordinates from pasted text and map links`

### Task 3: The schema — shoot days, and scenes linked to places

**Files:**
- Create: `supabase/migrations/20261010010000_film_graph_days_and_places.sql`
- Modify: `supabase/schema.fingerprint` (regenerated), `lib/supabase/database.types.ts` (regenerated)
- Test: `tests/integration/film-graph-days.test.ts`

**Interfaces:**
- Produces (schema):
  - `project_locations.latitude numeric(9,6)`, `.longitude numeric(9,6)`, `.timezone text`; CHECK: both coordinates null or both set and in range; `char_length(timezone) <= 64`.
  - `shoot_days (id uuid pk, project_id uuid not null → projects on delete cascade, day_number int not null check >= 1, shoot_date date, created_at, updated_at, unique (project_id, day_number), unique (id, project_id))`; RLS on; policy `"shoot_days access"` FOR ALL USING/WITH CHECK `internal.can_access_project(project_id)`; added to the `supabase_realtime` publication; `update_updated_at` trigger.
  - `scenes.location_id uuid`, FK `(location_id, project_id) → project_locations (id, project_id)` ON DELETE SET NULL (location_id); index on `location_id`.
  - `scenes.shoot_day_id uuid`, FK `(shoot_day_id, project_id) → shoot_days (id, project_id)`; index.
  - `call_sheets.shoot_day_id uuid`, same FK shape; unique.
- Produces (behaviour, all triggers `SECURITY INVOKER` — the caller already may write these tables):
  - `scenes` BEFORE INSERT OR UPDATE OF `location`, `shoot_day`: `location_id` = the `project_locations` row named `upper(btrim(location))` in the project, created (status `scouting`) if missing, null when the location is blank; `shoot_day_id` = the `shoot_days` row for `shoot_day` in the project, created if missing, null when `shoot_day` is null or < 1.
  - `call_sheets` BEFORE INSERT OR UPDATE OF `shoot_day`, `shoot_date`: `shoot_day_id` found or created; then `shoot_days.shoot_date` takes the call sheet's date when the sheet's is not null and differs.
  - `shoot_days` AFTER UPDATE OF `shoot_date`: the day's call sheet (if any) takes the date when it differs. (Both directions compare with `IS DISTINCT FROM` first, so they settle in one pass.)
  - Backfill in the same migration: an `UPDATE scenes SET location = location` and `UPDATE call_sheets SET shoot_day = shoot_day` to fire the triggers for existing rows (soft-removed scenes included).

- [ ] **Step 1: Write the failing integration tests** (`tests/integration/film-graph-days.test.ts`, personas as in `tests/integration/locations.test.ts`: `createCast`, `createCrewedProject`)

  ```ts
  it('a scene’s location becomes a record, found by name whatever the case', async () => {
    // Sam inserts scenes with location ' Harbor ' and 'HARBOR', and one with location null
    // → both carry the same location_id; project_locations has one row { name: 'HARBOR', status: 'scouting' }; the third has location_id null
  });
  it('the link follows a rewrite, and survives the record being removed', async () => {
    // update scene.location to 'LIGHTHOUSE' → location_id is the LIGHTHOUSE record (created)
    // delete the LIGHTHOUSE record → scene.location_id is null, scene.location still 'LIGHTHOUSE'
  });
  it('a scene’s day is one row per project and number', async () => {
    // two scenes on shoot_day 2 → same shoot_day_id; shoot_days has exactly one row with day_number 2
    // shoot_day set to null → shoot_day_id null
  });
  it('a call sheet and its day share one date, set from either side', async () => {
    // upsert call sheet day 2 with shoot_date '2026-11-03' → shoot_days(day 2).shoot_date = '2026-11-03', call_sheets.shoot_day_id = that row
    // update shoot_days(day 2).shoot_date = '2026-11-05' → call sheet's shoot_date = '2026-11-05'
    // a day with no call sheet takes a date on its own
  });
  it('coordinates come in pairs and in range', async () => {
    // latitude without longitude → rejected; latitude 95 → rejected; (51.0447, -114.0719, 'America/Edmonton') → saved
  });
  it('crew can set a date; an outsider sees and changes nothing', async () => {
    // Jordan updates shoot_days.shoot_date → ok; Riley selects shoot_days → []; Riley's update → 0 rows; anon → []
  });
  it('a scene can’t point at another project’s location or day', async () => {
    // Sam sets scene.location_id to a location id from a second project → error (FK)
  });
  ```

- [ ] **Step 2: Run** `npm run test:integration -- film-graph-days` — Expected: FAIL (`shoot_days` does not exist).
- [ ] **Step 3: Write the migration** as specified above, with a header comment naming the spec and step. Apply locally: `npx supabase migration up --local`.
- [ ] **Step 4: Run** the integration file — Expected: PASS (7 tests). Then the whole suite `npm run test:integration` — Expected: all pass (the triggers must not break existing scene, call-sheet or locations tests).
- [ ] **Step 5: Regenerate** `npm run db:drift -- --update` (or the repo's snapshot command — see `scripts/db-drift.mjs --help`) and `npm run db:types`; `npm run db:drift` — Expected: "no drift"; `npx tsc --noEmit` — clean.
- [ ] **Step 6: Commit** `feat: shoot days and scene→location links (film graph 1 schema)`

### Task 4: The day, assembled

**Files:**
- Create: `lib/film/days.ts`
- Test: `lib/film/days.test.ts`

**Interfaces:**
- Consumes: `sunTimes`, `formatInZone`, `isCoordinate` (Task 1); `distanceKm` (Task 2); `eighthsOf` from `@/lib/studio/shoot-days`.
- Produces:
  ```ts
  export interface DayScene { id: string; scene_number: number; heading: string | null; time_of_day: string | null; est_duration: string | null; location_id: string | null; shoot_day_id: string | null }
  export interface DayPlace { id: string; name: string; latitude: number | null; longitude: number | null; timezone: string | null }
  export interface DayRecord { id: string; day_number: number; shoot_date: string | null }
  export interface DayCalls { shooting_call: string | null; estimated_wrap: string | null } // "HH:MM[:SS]"
  export type LightNote =
    | { kind: 'no-date' } | { kind: 'no-place' }            // why there's no light to show
    | { kind: 'polar'; which: 'day' | 'night' }
    | { kind: 'wrap-after-light'; scenes: number; lightEnds: string; wrap: string }   // EXT DAY scenes, wrap is after sunset
    | { kind: 'call-before-light'; scenes: number; lightStarts: string; call: string } // only EXT DAY scenes that day and shooting call is before sunrise
    | { kind: 'night-needs-dark'; scenes: number; dark: string; wrap: string };        // EXT NIGHT scenes, wrap is before dusk
  export interface FilmDay {
    id: string; number: number; date: string | null;
    scenes: DayScene[]; eighths: number;
    places: DayPlace[];                 // in shooting order, each once
    /** The place the light is computed for: the first place that day with coordinates. */
    lightAt: DayPlace | null;
    light: { dawn: string; sunrise: string; goldenEnds: string; goldenStarts: string; sunset: string; dusk: string; zone: string; daylightMinutes: number } | null;
    notes: LightNote[];
    /** Company moves between consecutive places that both have coordinates. */
    moves: { from: string; to: string; km: number }[];
  }
  export function buildDays(days: DayRecord[], scenes: DayScene[], places: DayPlace[], callsByDay: Record<string, DayCalls | undefined>, viewerZone: string): FilmDay[];
  /** One plain sentence per note, for the UI and the printed call sheet. */
  export function lightNoteText(n: LightNote): string;
  ```
  Exterior and night are read from `heading` / `time_of_day` the way `lib/studio/locations.ts` does (`/^(EXT|I\/E|INT\/EXT|EXT\/INT)\b/`, `/\bNIGHT\b/`; `DUSK`/`EVENING`/`DAWN` count as neither day nor night for warnings). `zone` is the place's `timezone`, else `viewerZone`.

- [ ] **Step 1: Failing tests** (fixtures: HARBOR at Calgary coordinates, zone `America/Edmonton`; WAREHOUSE with none; BANFF at 51.1784, −115.5708)

  ```ts
  it('orders days by number and scenes by number, and counts pages', …)            // eighths sums eighthsOf
  it('gives the light for the first place with coordinates', …)                      // 2026-06-21 → light.sunrise '05:2x', zone 'America/Edmonton', lightAt.name 'HARBOR'
  it('says why there is no light: no date', …)                                       // notes [{kind:'no-date'}], light null
  it('says why there is no light: no place has coordinates', …)                      // notes [{kind:'no-place'}], light null — never NaN
  it('warns when exterior day scenes are planned past sunset', …)                    // 2026-12-21, wrap '18:00' → wrap-after-light { scenes: 2, lightEnds: '16:3x', wrap: '18:00' }
  it('does not warn for interiors, or when wrap is before sunset', …)
  it('warns when night exteriors wrap before dark', …)                               // 2026-06-21, EXT NIGHT, wrap '19:00' → night-needs-dark
  it('warns when the call is before sunrise and the whole day is exterior day', …)
  it('uses the viewer’s zone when the place has none, and the place’s when it has', …)
  it('reports midnight sun in words, with no times', …)                              // Tromsø → notes include {kind:'polar',which:'day'}, light.sunrise ''
  it('measures company moves between places that have coordinates', …)               // HARBOR → BANFF: one move, km 105 ± 2; a move to WAREHOUSE is not listed
  it('ignores scenes with no day, and days with no scenes still appear', …)
  it('lightNoteText reads as a sentence', …)  // e.g. '2 exterior day scenes, but the light ends at 16:32 and wrap is 18:00.'
  ```
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS (13 tests).
- [ ] **Step 5: Commit** `feat: a shoot day assembled — scenes, places, light, warnings, moves`

### Task 5: The data layer

**Files:**
- Modify: `lib/studio/api.ts` (near `listLocations` / `saveLocation`, ~lines 470–495), `lib/studio/index.ts` (export the hook), `lib/studio/locations.ts` (`LocationRecord` gains `latitude`, `longitude`, `timezone`)
- Create: `lib/studio/useShootDays.ts` (follows the existing `useCallSheets` live hook)
- Test: `tests/integration/film-graph-days.test.ts` (add), `lib/studio/locations.test.ts` (add)

**Interfaces:**
- Produces on the Studio API:
  ```ts
  export type ShootDay = Tables<'shoot_days'>;
  listShootDays(projectId: string): Promise<ShootDay[]>;                       // ordered by day_number
  setShootDayDate(projectId: string, dayNumber: number, date: string | null): Promise<ShootDay>; // upsert on (project_id, day_number)
  // LocationPatch additionally accepts latitude, longitude, timezone (all three together, or all null to clear)
  ```
  and `useShootDays(projectId: string | null): LiveRows<ShootDay>`.

- [ ] **Step 1: Failing tests** — integration: `setShootDayDate` creates day 4 with a date when it didn't exist, changes it, clears it with null; Riley's call rejects; `saveLocation(projectId, 'HARBOR', { latitude: 51.0447, longitude: -114.0719, timezone: 'America/Edmonton' })` round-trips and a later `{ status: 'confirmed' }` leaves the coordinates alone. Unit: `locationRows` carries the coordinates through on `record`.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat: shoot days and location coordinates in the Studio data layer`

### Task 6: Locations — where it is, and its light

**Files:**
- Modify: `components/studio/production/LocationsView.tsx` (+ its styles in `components/studio/studio.module.css` or a new `locations.module.css` beside it)
- Create: `components/studio/production/PlacePicker.tsx`
- Test: `e2e/daylight.spec.ts` (first test)

**Interfaces:**
- Consumes: `parseCoordinates` (Task 2), `sunTimes`/`formatInZone` (Task 1), `saveLocation` (Task 5), `useShootDays`.
- Produces: `<PlacePicker value={{ latitude, longitude, timezone }} onChange={(next | null) => void} />`.

Behaviour (exact copy):
- With no coordinates the card shows **"Add where this is"** — opening two ways in: a button **"I'm here now"** (uses `navigator.geolocation`; on refusal or failure a toast: "Couldn't get your position — paste the coordinates or a map link instead.") and a field labelled **"Coordinates or a map link"** (parsed on blur/Enter; unparseable input shows "That doesn't look like coordinates." under the field and saves nothing).
- The timezone defaults to the device's (`Intl.DateTimeFormat().resolvedOptions().timeZone`) and is a labelled select of `Intl.supportedValuesOf('timeZone')`.
- With coordinates: "51.0447, −114.0719 · America/Edmonton", an **Open map** link, **Change** and **Remove**; and for each of the location's scheduled days that has a date: `Day 3 · Tue 3 Nov — sunrise 07:38 · magic hour from 16:21 · sunset 17:09`.

- [ ] **Step 1: Failing e2e** (`E2E_LOCAL_STACK=1`, pattern from `e2e/locations.spec.ts`): seed a project with a script scene at `EXT. HARBOR - DAY` on day 1 and a call sheet dated `2026-06-21`; open Studio › Production › Locations; paste `51.0447, -114.0719` into "Coordinates or a map link", choose `America/Edmonton`; expect the card to show `sunrise 05:2` and `sunset 21:5`; reload — still there; axe passes on the view.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS; `npx eslint components/studio` clean.
- [ ] **Step 5: Commit** `feat: locations know where they are and show their light`

### Task 7: The stripboard — a date and the light on every day

**Files:**
- Modify: `components/studio/production/StripboardView.tsx`, `components/studio/production/stripboard.module.css`
- Test: `e2e/daylight.spec.ts` (second test)

**Interfaces:**
- Consumes: `buildDays`, `lightNoteText` (Task 4); `useShootDays`, `setShootDayDate` (Task 5); existing `scenes`, `useCallSheets`, locations from the Studio provider.

Behaviour: each day's header gains a date input (labelled "Day N date", writes `setShootDayDate`; today the date only exists if a call sheet does) and, under it, one line: `☀ 07:38 – 17:09 · magic hour 16:21 · HARBOR` — or the reason there's none ("Set a date to see the light" / "Add where HARBOR is to see the light", the latter linking to the Locations view). Warnings from `notes` render as the stripboard's existing warning chips (the company-move chip style), with `lightNoteText`. Moves with distances replace the bare "company move" count where both places have coordinates: "Company move · 105 km".

- [ ] **Step 1: Failing e2e:** same seed plus a second day with `EXT. HARBOR - DAY` scenes; set Day 2's date to `2026-12-21` on the stripboard, and its call sheet's wrap to 18:00 → the Day 2 header shows `08:3` and the chip "exterior day scene" … "light ends at 16:3"; Day 1 shows no warning; a day with no date reads "Set a date to see the light"; axe passes.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat: the stripboard shows each day's date, light and light warnings`

### Task 8: The call sheet carries the light

**Files:**
- Modify: `components/studio/production/CallSheetsPanel.tsx`, `lib/studio/call-sheet.ts` (the printed sheet's builder) and its test `lib/studio/call-sheet.test.ts`
- Test: `e2e/daylight.spec.ts` (third test)

**Interfaces:**
- Consumes: `FilmDay` (Task 4).
- Produces: the print builder accepts an optional `light?: FilmDay['light']` and `notes?: string[]`, and renders a "Light" row: `Sunrise 07:38 · Magic hour 16:21 · Sunset 17:09 (America/Edmonton)` followed by the notes; nothing when `light` is absent.

Behaviour: the day's call sheet on screen shows the same row above the weather field; the weather field stays as typed (no service).

- [ ] **Step 1: Failing tests** — unit: the printed HTML contains `Sunrise 07:38` when light is passed and no "Light" row when it isn't; e2e: the Day 1 call sheet shows "Sunrise 05:2".
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat: sunrise, magic hour and sunset on the call sheet`

### Task 9: Whole-branch check, docs, PR

**Files:**
- Modify: `.cavern-intelligence/film-graph-spec.md` (status: step 1 done), `.cavern-intelligence/STATE.md` (latest session; "apply migration `20261010010000` to production"), `.cavern-intelligence/BACKLOG.md` §1 (owner: apply the migration), `.cavern-intelligence/database-and-security.md` (the new table, columns and triggers), `.cavern-intelligence/bible/05-studio.md` or the Studio chapter that covers Locations / Stripboard / Call sheets, `adr/0005-the-film-graph.md` (new: the decision, the two layers, the strangler route) and `adr/README.md`.

- [ ] **Step 1:** `npx tsc --noEmit && npx eslint . && npm run test:coverage && npm run test:integration && npm run db:drift && npm run db:types:check && npm run build && npm run budget` — Expected: all clean, floors hold.
- [ ] **Step 2:** `E2E_LOCAL_STACK=1 PLAYWRIGHT_BASE_URL=http://localhost:3100 npx playwright test e2e/daylight.spec.ts e2e/locations.spec.ts e2e/call-sheets.spec.ts e2e/studio-journey.spec.ts e2e/accessibility.spec.ts` against a fresh build — Expected: pass.
- [ ] **Step 3:** Look at it: screenshots of Locations, the stripboard and a call sheet with light, in the default theme and on a phone width; fix what reads badly.
- [ ] **Step 4:** Write the docs above. Commit `docs: film graph step 1 — days, places and daylight`.
- [ ] **Step 5:** Push `claude/film-graph-1-days-places`; open the PR titled `feat: days and places on the film graph — daylight on the schedule and call sheet`; the body names the migration and that it must be applied to production after merge.
