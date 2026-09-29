// Today, on the go: what matters now, from what the suite already knows —
// the next days on set (and your call), your tasks by urgency, what's unread.
// Pure, so the page and the tests agree. Dates are local calendar days
// ("YYYY-MM-DD"), the way call sheets and due dates are kept.

export const localDay = (d: Date = new Date()): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const dayNumber = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
};

/** Whole days from `today` to `iso` (negative when past). */
export const daysUntil = (iso: string, today: string): number => dayNumber(iso) - dayNumber(today);

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Today", "Tomorrow", "Thu" (this week), "Thu 9 Oct" — how people say a day. */
export function dayLabel(iso: string, today: string): string {
  const n = daysUntil(iso, today);
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n === -1) return 'Yesterday';
  const [y, m, d] = iso.split('-').map(Number);
  const wd = WEEKDAY[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return n > 1 && n < 7 ? wd : `${wd} ${d} ${MONTH[m - 1]}`;
}

/** "07:30:00" → "7:30"; null stays null. */
export const clock = (t: string | null | undefined): string | null => {
  if (!t) return null;
  const m = t.match(/^(\d{1,2}):(\d{2})/);
  return m ? `${Number(m[1])}:${m[2]}` : t;
};

export function greeting(hour: number): string {
  if (hour < 5) return 'Up late';
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
}

export interface ShootDay { id: string; project_id: string; shoot_date: string | null; shoot_day: number }

/** The coming days on set (today included), soonest first. */
export function nextShootDays<T extends ShootDay>(sheets: T[], today: string, limit = 3): T[] {
  return sheets
    .filter((s) => s.shoot_date && daysUntil(s.shoot_date, today) >= 0)
    .sort((a, b) => (a.shoot_date! < b.shoot_date! ? -1 : a.shoot_date! > b.shoot_date! ? 1 : a.shoot_day - b.shoot_day))
    .slice(0, limit);
}

export interface TaskLike { id: string; title: string; completed: boolean | null; due_date: string | null }
export type Urgency = 'overdue' | 'today' | 'soon' | 'later' | 'undated';

export function urgency(due: string | null, today: string): Urgency {
  if (!due) return 'undated';
  const n = daysUntil(due, today);
  return n < 0 ? 'overdue' : n === 0 ? 'today' : n <= 7 ? 'soon' : 'later';
}

export function dueLabel(due: string | null, today: string): string | null {
  if (!due) return null;
  const n = daysUntil(due, today);
  if (n < 0) return n === -1 ? 'Overdue · yesterday' : `Overdue · ${-n} days`;
  if (n === 0) return 'Due today';
  return `Due ${dayLabel(due, today).toLowerCase() === 'tomorrow' ? 'tomorrow' : dayLabel(due, today)}`;
}

const RANK: Record<Urgency, number> = { overdue: 0, today: 1, soon: 2, later: 3, undated: 4 };

/** Open tasks, most urgent first (then by due date). */
export function openTasks<T extends TaskLike>(tasks: T[], today: string): T[] {
  return tasks
    .filter((t) => !t.completed)
    .sort((a, b) => RANK[urgency(a.due_date, today)] - RANK[urgency(b.due_date, today)] || (a.due_date ?? '').localeCompare(b.due_date ?? ''));
}

/** A maps link for a call-sheet address (opens the phone's maps app). */
export const mapsHref = (address: string) => `https://maps.google.com/?q=${encodeURIComponent(address)}`;
