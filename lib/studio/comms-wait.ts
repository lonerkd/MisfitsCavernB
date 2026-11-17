// How long a communication has been waiting for an answer. Dates are calendar days as YYYY-MM-DD; "today" is passed in so
// the rule can be tested without the clock.

/** A pending entry is flagged once it is more than this many days old. */
export const WAITING_AFTER_DAYS = 2;

/** Today as YYYY-MM-DD in local time. */
export function localIsoDate(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function dayNumber(iso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isFinite(ms) ? ms / 86_400_000 : null;
}

/**
 * The number of days a pending entry has been waiting, or null when it need not be flagged: it is not pending, it is
 * not more than WAITING_AFTER_DAYS days old, or either date is not a valid YYYY-MM-DD.
 */
export function daysWaiting(entry: { date: string; status: string }, today: string): number | null {
  if (entry.status !== 'pending') return null;
  const from = dayNumber(entry.date);
  const to = dayNumber(today);
  if (from === null || to === null) return null;
  const days = to - from;
  return days > WAITING_AFTER_DAYS ? days : null;
}
