// World building, derived: where each location appears in the script (scene, INT/EXT, time, story day, shoot day, pages) and what the
// production's own data says is worth a look across places. Nothing is stored; every sentence is read from scenes, location records and
// shoot days the app already has, and says why it fired so a producer can judge in a second. Pure.
//
// Rules (each with a stable id so a dismissal survives edits):
//   spelling            the same place written two ways in scene headings (INT/EXT, time of day and era are NOT a difference)
//   shoots-soon         a scene there is on a dated shoot day in the next 14 days and the place is not confirmed, or its permit is open
//   many-days           shot on three or more separate stretches of days: each return is a company move
//   no-cost             a record that scenes use and nobody has put a cost on (0 counts: it is free)
//
// Not built, on purpose: "the same place described as something incompatible". The only structured descriptions a location has are its
// status and permit; scenes carry INT/EXT, a time and an era, and a house is INT and EXT, day and night, in every era. No rule over that
// data could be justified in a sentence, so none is guessed.
import { areNumberedRoles, editDistance } from '@/lib/scriptos/character-checks';
import { readHeading } from '@/lib/scriptos/heading';
import { locationKey, locationReadiness, locationRows, type LocationRecord, type LocationRow, type SceneAtLocation } from './locations';
import { pages } from './stripboard';

export interface WorldScene extends SceneAtLocation {
  ordinal?: number | null;
  script_id?: string | null;
  story_day?: number | null;
  est_duration?: string | null;
}
export interface WorldDay { day_number: number; shoot_date: string | null }

export type IntExt = 'INT' | 'EXT' | 'INT/EXT';

export interface Appearance {
  sceneId: string;
  scriptId: string | null;
  number: number;
  heading: string;
  intExt: IntExt | null;
  /** "day", "night": what the scene says, nothing when it does not. */
  time: string | null;
  storyDay: number | null;
  shootDay: number | null;
  /** The shoot day's date (YYYY-MM-DD), when it has one. */
  shootDate: string | null;
  /** "3/8", "1 2/8": only when the scene has an estimate. */
  pages: string | null;
}

export interface WorldLocation {
  /** The key (upper-case name) the row is filed under. */
  name: string;
  record: LocationRecord | null;
  appearances: Appearance[];
  /** Shoot days, ascending. */
  days: number[];
  /** Total pages over the scenes that have an estimate; null when none do. */
  pages: string | null;
}

const INT_EXT = /^\s*(?:\d+[A-Z]?\.?\s+)?(INT\.?\s*\/\s*EXT|EXT\.?\s*\/\s*INT|I\s*\/\s*E|E\s*\/\s*I|INTERIOR|EXTERIOR|INT|EXT)\b/i;

export function intExtOf(heading: string | null | undefined): IntExt | null {
  const m = INT_EXT.exec(heading ?? '');
  if (!m) return null;
  const w = m[1].toUpperCase().replace(/\s+/g, '').replace(/\./g, '');
  if (w === 'INT' || w === 'INTERIOR') return 'INT';
  if (w === 'EXT' || w === 'EXTERIOR') return 'EXT';
  return 'INT/EXT';
}

const hasEstimate = (e: string | null | undefined) => /\d+\s*\/\s*8/.test(e ?? '');
const eighths = (e: string | null | undefined) => { const m = /(\d+)\s*\/\s*8/.exec(e ?? ''); return m ? Math.max(1, Number(m[1])) : 0; };
const scriptOrder = (a: WorldScene, b: WorldScene) => (a.ordinal ?? a.scene_number) - (b.ordinal ?? b.scene_number) || a.scene_number - b.scene_number;

/** Every place with its record, the scenes there in script order, its shoot days and pages. Places the script uses come first, then records it does not. */
export function worldLocations(scenes: WorldScene[], records: LocationRecord[], days: WorldDay[]): WorldLocation[] {
  const byId = new Map(scenes.map((s) => [s.id, s]));
  const dateOf = new Map(days.map((d) => [d.day_number, d.shoot_date]));
  return locationRows(scenes, records).map((row: LocationRow) => {
    const list = row.scenes.map((s) => byId.get(s.id) ?? s as WorldScene).sort(scriptOrder);
    const appearances: Appearance[] = list.map((s) => {
      const t = (s.time_of_day ?? '').trim();
      return {
        sceneId: s.id, scriptId: s.script_id ?? null, number: s.scene_number, heading: (s.heading ?? s.location ?? '').trim(),
        intExt: intExtOf(s.heading), time: t && t.toUpperCase() !== 'UNKNOWN' ? t.toLowerCase() : null,
        storyDay: s.story_day ?? null, shootDay: s.shoot_day != null && s.shoot_day > 0 ? s.shoot_day : null,
        shootDate: s.shoot_day != null ? dateOf.get(s.shoot_day) ?? null : null,
        pages: hasEstimate(s.est_duration) ? pages(eighths(s.est_duration)) : null,
      };
    });
    const total = list.reduce((n, s) => n + eighths(s.est_duration), 0);
    return { name: row.name, record: row.record, appearances, days: row.days, pages: total ? pages(total) : null };
  });
}

// ── Spelling ────────────────────────────────────────────────────────────────

/**
 * A place's comparable form. The reader's heading parts first (so a stray "- NIGHT" or "(1964)" is not part of the place), then capitals,
 * letters and digits only, a leading article gone ("THE DOCK OFFICE" is "DOCK OFFICE"), ST. and SAINT one word, "&" and "AND" one.
 */
export function placeSpelling(name: string): string {
  const place = readHeading(name).location || name;
  return place.toUpperCase().replace(/[’']/g, '').replace(/&/g, ' AND ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
    .replace(/^(THE|A|AN)\s+/, '').replace(/\bST\b/g, 'SAINT').replace(/\bMT\b/g, 'MOUNT').replace(/\s+AND\s+/g, ' ').replace(/\s+/g, ' ');
}

// ── Warnings ────────────────────────────────────────────────────────────────

export type WorldRule = 'spelling' | 'shoots-soon' | 'many-days' | 'no-cost';

export interface WorldWarning {
  /** Stable across edits (the rule and the places), so a dismissal survives the script changing. */
  id: string;
  rule: WorldRule;
  severity: 'warn' | 'info';
  /** The places it is about, as the script spells them. */
  locations: string[];
  message: string;
  reason: string;
  /** The scene to open: where to look first. */
  sceneId: string | null;
  sceneNumber: number | null;
}

export const WORLD_RULE_LABELS: Record<WorldRule, string> = {
  spelling: 'Spelled two ways',
  'shoots-soon': 'Shoots soon, not locked down',
  'many-days': 'Many separate days',
  'no-cost': 'No cost yet',
};

export const SOON_DAYS = 14;
/** Separate stretches of shoot days at which a return is worth saying aloud. */
export const MANY_STRETCHES = 3;

const dayDiff = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
const first = (l: WorldLocation) => l.appearances[0] ?? null;

/** Runs of consecutive day numbers: [1,2,3,7,9,10] is three stretches. */
export function stretches(days: number[]): number[][] {
  const out: number[][] = [];
  for (const d of [...new Set(days)].sort((a, b) => a - b)) {
    const last = out[out.length - 1];
    if (last && d === last[last.length - 1] + 1) last.push(d); else out.push([d]);
  }
  return out;
}

const sortKey = (w: WorldWarning, order: Map<string, number>) => (w.sceneId ? order.get(w.sceneId) ?? 1e9 : 1e9);

/**
 * What the production's own data says across its places. `today` is a local date (YYYY-MM-DD), given so the result is the same for the same
 * input. Only locations the script uses are checked, except that a record nobody uses is never warned about.
 */
export function checkWorld(world: WorldLocation[], today: string): WorldWarning[] {
  const out: WorldWarning[] = [];
  const used = world.filter((l) => l.appearances.length > 0);

  // 1. Spelled two ways: the same place once the heading's article, punctuation and saint are set aside, or one letter apart and rare.
  const forms = used.map((l) => ({ l, key: placeSpelling(l.name) }));
  const seen = new Set<string>();
  for (let i = 0; i < forms.length; i++) {
    for (let j = i + 1; j < forms.length; j++) {
      const a = forms[i], b = forms[j];
      if (!a.key || !b.key) continue;
      const same = a.key === b.key;
      let near = false;
      if (!same && Math.min(a.key.length, b.key.length) >= 7 && !/\d/.test(a.key + b.key) && !areNumberedRoles(a.l.name, b.l.name) && editDistance(a.key, b.key) === 1) {
        near = Math.min(a.l.appearances.length, b.l.appearances.length) <= 2;
      }
      if (!same && !near) continue;
      const id = `spelling:${[a.key, b.key].sort().join('|')}`;
      if (seen.has(id)) continue;
      seen.add(id);
      const [common, rare] = a.l.appearances.length >= b.l.appearances.length ? [a.l, b.l] : [b.l, a.l];
      const at = first(rare)!;
      out.push({
        id, rule: 'spelling', severity: same ? 'warn' : 'info', locations: [common.name, rare.name], sceneId: at.sceneId, sceneNumber: at.number,
        message: `${rare.name} and ${common.name} look like one place spelled two ways.`,
        reason: same
          ? 'The two names are the same once the leading “the”, punctuation and “St.” or “Saint” are set aside. INT or EXT, the time of day and the year are not part of the place.'
          : `${rare.name} is used in ${plural(rare.appearances.length, 'scene')}, is one letter from ${common.name}, and is a different record.`,
      });
    }
  }

  // 2. Shoots within two weeks and not locked down. A place nobody has scouted is not locked down either.
  const until = SOON_DAYS;
  for (const l of used) {
    const soon = l.appearances.filter((a) => a.shootDate && dayDiff(today, a.shootDate) >= 0 && dayDiff(today, a.shootDate) <= until)
      .sort((a, b) => (a.shootDate as string).localeCompare(b.shootDate as string));
    if (soon.length === 0) continue;
    const ready = locationReadiness(l.name, l.record);
    if (ready.ready) continue;
    const at = soon[0];
    const left = dayDiff(today, at.shootDate as string);
    const rec = l.record;
    const gaps = !rec ? ['it is not scouted'] : [
      rec.status !== 'confirmed' ? (rec.status === 'option' ? 'it is on hold, not confirmed' : 'it is not confirmed') : null,
      rec.permit === 'needed' ? 'its permit is still needed' : rec.permit === 'applied' ? 'its permit is applied for, not granted' : null,
    ].filter((x): x is string => !!x);
    out.push({
      id: `shoots-soon:${locationKey(l.name)}`, rule: 'shoots-soon', severity: 'warn', locations: [l.name], sceneId: at.sceneId, sceneNumber: at.number,
      message: `${l.name} shoots ${left === 0 ? 'today' : `in ${plural(left, 'day')}`} (day ${at.shootDay}), and ${gaps.join(' and ')}.`,
      reason: `Scene ${at.number} is on shoot day ${at.shootDay}, ${at.shootDate}. A place needs to be confirmed, with any permit granted, before the company arrives.`,
    });
  }

  // 3. Shot on many separate stretches of days: each return is a company move.
  for (const l of used) {
    const runs = stretches(l.days);
    if (l.days.length < MANY_STRETCHES || runs.length < MANY_STRETCHES) continue;
    const at = first(l)!;
    out.push({
      id: `many-days:${locationKey(l.name)}`, rule: 'many-days', severity: 'info', locations: [l.name], sceneId: at.sceneId, sceneNumber: at.number,
      message: `${l.name} is shot on ${plural(l.days.length, 'day')} in ${runs.length} separate stretches (days ${l.days.join(', ')}).`,
      reason: 'Every time the company leaves and comes back it pays a move and a new set-up. Grouping the scenes there into one stretch is the usual saving.',
    });
  }

  // 4. A record that scenes use and nobody has priced. A cost of 0 is an answer; blank is not.
  for (const l of used) {
    if (!l.record || l.record.cost != null) continue;
    const at = first(l)!;
    out.push({
      id: `no-cost:${locationKey(l.name)}`, rule: 'no-cost', severity: 'info', locations: [l.name], sceneId: at.sceneId, sceneNumber: at.number,
      message: `${l.name} has no cost, and ${plural(l.appearances.length, 'scene')} ${l.appearances.length === 1 ? 'is' : 'are'} set there.`,
      reason: 'The cost field is blank. Enter 0 if the place is free, so the budget is not guessing.',
    });
  }

  const order = new Map<string, number>();
  used.flatMap((l) => l.appearances).forEach((a) => order.set(a.sceneId, a.number));
  return out.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'warn' ? -1 : 1) || sortKey(a, order) - sortKey(b, order) || a.id.localeCompare(b.id));
}

export const warningsForLocation = (all: WorldWarning[], name: string) => all.filter((w) => w.locations.includes(name));

/** A local calendar date as YYYY-MM-DD. */
export function localDate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
