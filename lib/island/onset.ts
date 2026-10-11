// On set: the island takes over by itself on a shoot day, and steps back the
// moment it is dismissed. These are the pure parts; the hook is beside them.

export interface DatedDay { id: string; day_number: number; shoot_date: string | null }

/** `YYYY-MM-DD` in the viewer's own calendar. */
export function localDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** The shoot day dated `today`, if there is one. */
export function shootDayToday<T extends DatedDay>(days: readonly T[], today: string): T | null {
  return days.find((d) => d.shoot_date === today) ?? null;
}

/** Where the on-set tools live. */
export const ON_SET_HREF = '/studio?tab=production&view=onset';
