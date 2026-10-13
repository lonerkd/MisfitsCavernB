import { describe, expect, it } from 'vitest';
import { ownerRows, type OwnerData } from './owner';

const TODAY = '2026-10-12';
const projects = [{ id: 'a', title: 'Alpha', phase: 'development' }, { id: 'b', title: 'Bravo', phase: 'production' }];
const none: OwnerData = { pendingCrew: [], openTasks: [], sheets: [] };

describe('ownerRows', () => {
  it('a quiet project needs nothing', () => {
    const [row] = ownerRows([projects[0]], none, TODAY);
    expect(row).toMatchObject({ pendingCrew: 0, overdueTasks: 0, openTasks: 0, next: null, needsYou: false });
  });

  it('counts unanswered invites and tasks past their date', () => {
    const rows = ownerRows(projects, {
      pendingCrew: [{ project_id: 'a' }, { project_id: 'a' }],
      openTasks: [{ project_id: 'a', due_date: '2026-10-01' }, { project_id: 'a', due_date: '2026-10-20' }, { project_id: 'a', due_date: null }],
      sheets: [],
    }, TODAY);
    const a = rows.find((r) => r.id === 'a')!;
    expect(a).toMatchObject({ pendingCrew: 2, overdueTasks: 1, openTasks: 3, needsYou: true });
  });

  it('finds the next shoot day and flags a call sheet not issued for a day within the week', () => {
    const soon = ownerRows([projects[1]], { ...none, sheets: [
      { project_id: 'b', shoot_date: '2026-10-09', shoot_day: 1, issued_at: null }, // past: ignored
      { project_id: 'b', shoot_date: '2026-10-15', shoot_day: 2, issued_at: null },
      { project_id: 'b', shoot_date: '2026-10-14', shoot_day: 3, issued_at: null },
    ] }, TODAY)[0];
    expect(soon.next).toEqual({ date: '2026-10-14', day: 3, issued: false });
    expect(soon.needsYou).toBe(true);

    const issued = ownerRows([projects[1]], { ...none, sheets: [{ project_id: 'b', shoot_date: '2026-10-14', shoot_day: 3, issued_at: '2026-10-10T10:00:00Z' }] }, TODAY)[0];
    expect(issued.needsYou).toBe(false);

    const far = ownerRows([projects[1]], { ...none, sheets: [{ project_id: 'b', shoot_date: '2026-11-30', shoot_day: 1, issued_at: null }] }, TODAY)[0];
    expect(far.next?.date).toBe('2026-11-30');
    expect(far.needsYou).toBe(false);
  });

  it('puts what needs the owner first, then by title', () => {
    const rows = ownerRows(projects, { ...none, pendingCrew: [{ project_id: 'b' }] }, TODAY);
    expect(rows.map((r) => r.id)).toEqual(['b', 'a']);
  });
});
