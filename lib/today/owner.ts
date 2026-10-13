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
