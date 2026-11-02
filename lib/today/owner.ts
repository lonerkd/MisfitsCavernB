// The owner's view of their productions on Today: for each project they run,
// what needs them — crew who have not answered, tasks past their date, the
// next day on set and whether its call sheet has gone out. Pure: the page
// supplies the rows it read.

export interface OwnedProject { id: string; title: string; phase: string }
export interface OwnerData {
  pendingCrew: { project_id: string }[];
  openTasks: { project_id: string; due_date: string | null }[];
  sheets: { project_id: string; shoot_date: string | null; shoot_day: number; issued_at: string | null }[];
}
export interface OwnerRow {
  id: string;
  title: string;
  phase: string;
  pendingCrew: number;
  overdueTasks: number;
  openTasks: number;
  /** The next shoot day on or after today, if any. */
  next: { date: string; day: number; issued: boolean } | null;
  /** True when something here needs the owner (an unanswered invite, an overdue task, or a day coming up with no call sheet issued). */
  needsYou: boolean;
}

export interface ScheduledDay { project_id: string; day_number: number; shoot_date: string | null }
/** The call sheets of the scheduled days, whatever their own date says (so one the date filter dropped still counts). */
export interface DaySheet { project_id: string; shoot_day: number; issued_at: string | null }

/**
 * A shoot day is dated on the schedule before it has a call sheet. The owner's "next day on set" has to see those
 * days too (with no call sheet, so "not issued"), or a dated day without a sheet is invisible until someone makes one.
 * The day's own date is the schedule's: it wins over a call sheet's copy of it. A day that has a sheet keeps what the
 * sheet knows (whether it was issued), even when the sheet itself fell outside the date window the caller read.
 */
export function withScheduledDays(sheets: OwnerData['sheets'], days: ScheduledDay[], daySheets: DaySheet[] = []): OwnerData['sheets'] {
  const key = (project: string, day: number) => `${project}:${day}`;
  const dateOf = new Map(days.filter((d) => d.shoot_date).map((d) => [key(d.project_id, d.day_number), d.shoot_date as string]));
  const issuedOf = new Map(daySheets.map((s) => [key(s.project_id, s.shoot_day), s.issued_at]));
  const have = new Set(sheets.map((s) => key(s.project_id, s.shoot_day)));
  const known = sheets.map((s) => ({ ...s, shoot_date: dateOf.get(key(s.project_id, s.shoot_day)) ?? s.shoot_date }));
  const extra = days
    .filter((d) => d.shoot_date && !have.has(key(d.project_id, d.day_number)))
    .map((d) => ({ project_id: d.project_id, shoot_date: d.shoot_date, shoot_day: d.day_number, issued_at: issuedOf.get(key(d.project_id, d.day_number)) ?? null }));
  return [...known, ...extra];
}

/** Whole days from `today` to `date` (both YYYY-MM-DD, local). */
const daysBetween = (today: string, date: string) => Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);

export function ownerRows(projects: OwnedProject[], data: OwnerData, today: string): OwnerRow[] {
  return projects.map((p) => {
    const tasks = data.openTasks.filter((t) => t.project_id === p.id);
    const overdue = tasks.filter((t) => t.due_date && t.due_date < today).length;
    const upcoming = data.sheets
      .filter((s) => s.project_id === p.id && s.shoot_date && s.shoot_date >= today)
      .sort((a, b) => (a.shoot_date! < b.shoot_date! ? -1 : 1))[0];
    const next = upcoming ? { date: upcoming.shoot_date!, day: upcoming.shoot_day, issued: !!upcoming.issued_at } : null;
    const pendingCrew = data.pendingCrew.filter((c) => c.project_id === p.id).length;
    // A shoot day within the week whose call sheet has not gone out is the thing that bites.
    const unissuedSoon = !!next && !next.issued && daysBetween(today, next.date) <= 7;
    return { id: p.id, title: p.title, phase: p.phase, pendingCrew, overdueTasks: overdue, openTasks: tasks.length, next, needsYou: pendingCrew > 0 || overdue > 0 || unissuedSoon };
  }).sort((a, b) => Number(b.needsYou) - Number(a.needsYou) || a.title.localeCompare(b.title));
}
