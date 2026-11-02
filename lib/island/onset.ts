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

import type { DayStatus } from '@/lib/studio/onset';

/** 75 → "1h 15m", 45 → "45m", 120 → "2h". */
export function duration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h === 0 ? `${r}m` : r === 0 ? `${h}h` : `${h}h ${String(r).padStart(2, '0')}m`;
}

const PHASE: Record<DayStatus['phase'], string> = { before: '', prep: 'Crew called', shooting: 'Rolling', lunch: 'Lunch', wrapped: 'Wrapped' };

/**
 * Where the day is, in a line for the island and the phone's pill: the phase and the time on set, and (the island's longer
 * form) what is left to the planned wrap or how far past it. Null before anyone has stamped the crew call: nothing to say yet.
 * `short` is the phone's, which has less room.
 */
export function onSetLine(status: DayStatus): { short: string; full: string } | null {
  const phase = PHASE[status.phase];
  if (!phase) return null;
  const short = `${phase} · ${duration(status.onSetMinutes)} on set`;
  const tail = status.overtimeMinutes > 0 ? `${duration(status.overtimeMinutes)} over` : status.toWrapMinutes != null && status.phase !== 'wrapped' ? `${duration(status.toWrapMinutes)} to wrap` : '';
  return { short, full: tail ? `${short} · ${tail}` : short };
}

/** Where the on-set tools live. */
export const ON_SET_HREF = '/studio?tab=production&view=onset';
