// A shoot day's date, read from the day itself (the film graph) and only then
// from its call sheet. The day is where a date is set on the stripboard and
// the schedule, and a trigger copies it to the day's call sheet if there is
// one. A day that has a date but no call sheet yet is still a dated day.
// Pure.

export interface DayWithDate { day_number: number; shoot_date: string | null }

export function dateOfDayMap(days: Iterable<DayWithDate>, sheets: Iterable<{ shoot_day: number; shoot_date: string | null }>): Map<number, string> {
  const out = new Map<number, string>();
  for (const s of sheets) if (s.shoot_date) out.set(s.shoot_day, s.shoot_date);
  for (const d of days) if (d.shoot_date) out.set(d.day_number, d.shoot_date); // the day wins
  return out;
}
