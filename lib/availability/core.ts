// Crew availability, pure: date ranges someone is away, who's away on a shoot
// day, and how to say a range ("Oct 3–5"). Dates are ISO days (YYYY-MM-DD),
// compared as strings; nothing here depends on the viewer's time zone.

export interface Away { user_id: string; starts_on: string; ends_on: string }

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Whether a range touches [from, to] (inclusive). */
export const overlaps = (a: Pick<Away, 'starts_on' | 'ends_on'>, from: string, to: string) => a.starts_on <= to && a.ends_on >= from;

/** Who's away on a given day. */
export function awayOn(away: Away[], date: string): Away[] {
  return away.filter((a) => overlaps(a, date, date));
}

/** For each dated shoot day, the people away on it (days with nobody away are left out). */
export function dayConflicts(sheets: Array<{ shoot_day: number; shoot_date: string | null }>, away: Away[]): Map<number, Away[]> {
  const out = new Map<number, Away[]>();
  for (const sheet of sheets) {
    if (!sheet.shoot_date) continue;
    const who = awayOn(away, sheet.shoot_date);
    // One entry per person, even if two of their ranges cover the day.
    const unique = who.filter((a, i) => who.findIndex((b) => b.user_id === a.user_id) === i);
    if (unique.length) out.set(sheet.shoot_day, unique);
  }
  return out;
}

/** A person's ranges that haven't ended yet, soonest first. */
export function upcoming(away: Away[], userId: string, today: string): Away[] {
  return away.filter((a) => a.user_id === userId && a.ends_on >= today).sort((a, b) => a.starts_on.localeCompare(b.starts_on));
}

const day = (iso: string) => new Date(`${iso}T00:00:00Z`);
const fmt = (iso: string, withYear: boolean) =>
  day(iso).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', ...(withYear ? { year: 'numeric' } : {}) });

/** "Oct 3", "Oct 3–5", "Oct 30 – Nov 2"; the year only when it isn't `thisYear`. */
export function describeRange(starts: string, ends: string, thisYear = new Date().getUTCFullYear()): string {
  const y1 = Number(starts.slice(0, 4));
  const y2 = Number(ends.slice(0, 4));
  const withYear = y1 !== thisYear || y2 !== thisYear;
  if (starts === ends) return fmt(starts, withYear);
  if (y1 === y2 && starts.slice(5, 7) === ends.slice(5, 7)) {
    return `${fmt(starts, false)}–${Number(ends.slice(8, 10))}${withYear ? `, ${y1}` : ''}`;
  }
  return `${fmt(starts, withYear && y1 !== y2)} – ${fmt(ends, withYear)}`;
}

/** Why a range can't be saved, or null when it can. */
export function rangeProblem(starts: string, ends: string): string | null {
  if (!ISO.test(starts) || Number.isNaN(day(starts).getTime())) return 'Pick the first day you’re away';
  if (!ISO.test(ends) || Number.isNaN(day(ends).getTime())) return 'Pick the last day you’re away';
  if (ends < starts) return 'The last day comes before the first';
  if ((day(ends).getTime() - day(starts).getTime()) / 86_400_000 > 366) return 'Keep it to a year at most';
  return null;
}
