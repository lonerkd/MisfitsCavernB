// Deciding whether a push waits for the morning. Server side only (the push sender): kept out of prefs.ts so the pages that read a
// person's prefs (the bell, Settings) do not carry it in their bundle.
import type { NotificationPrefs, QuietHours } from './prefs';

/** The kinds worth waking someone for: a call sheet issued or changed for a shoot that is coming. Everything else waits in the bell. */
export const URGENT_TYPES: readonly string[] = ['call_sheet'];
export const isUrgent = (type: string) => URGENT_TYPES.includes(type);

const HHMM = /^([01][0-9]|2[0-3]):([0-5][0-9])$/;
const minutes = (hhmm: string) => { const m = HHMM.exec(hhmm); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
const validZone = (tz: string) => { try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch { return false; } };

/** Minutes since midnight for `now` in `tz`. */
function minutesIn(tz: string, now: Date): number {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const h = Number(parts.find((x) => x.type === 'hour')?.value ?? 0);
  const m = Number(parts.find((x) => x.type === 'minute')?.value ?? 0);
  return h * 60 + m;
}

/** Is `now` inside the person's quiet hours? Off, a window that is not valid, or start = end, means never. */
export function inQuietHours(q: QuietHours, now: Date = new Date()): boolean {
  if (!q.on) return false;
  const a = minutes(q.start);
  const b = minutes(q.end);
  if (a == null || b == null || a === b || !validZone(q.tz)) return false;
  const at = minutesIn(q.tz, now);
  return a < b ? at >= a && at < b : at >= a || at < b;
}

/** Should this notification wait in the bell instead of reaching the phone now? Only a non-urgent one, during quiet hours. */
export function holdPush(type: string, prefs: NotificationPrefs, now: Date = new Date()): boolean {
  return !isUrgent(type) && inQuietHours(prefs.quiet, now);
}
