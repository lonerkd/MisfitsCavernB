import { describe, expect, it } from 'vitest';
import { ownerRows, withScheduledDays, type OwnerData } from './owner';

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

describe('withScheduledDays', () => {
  const sheet = (day: number, date: string, issued: string | null = null) => ({ project_id: 'p1', shoot_date: date, shoot_day: day, issued_at: issued });

  it('adds a dated day that has no call sheet, as not issued', () => {
    expect(withScheduledDays([], [{ project_id: 'p1', day_number: 2, shoot_date: '2026-12-01' }])).toEqual([sheet(2, '2026-12-01')]);
  });
  it('keeps the call sheet when the day has one (it knows whether it was issued)', () => {
    const issued = sheet(1, '2026-12-01', '2026-11-20T10:00:00Z');
    expect(withScheduledDays([issued], [{ project_id: 'p1', day_number: 1, shoot_date: '2026-12-01' }])).toEqual([issued]);
  });
  it('ignores undated days and other projects\' days are kept apart', () => {
    const out = withScheduledDays([], [
      { project_id: 'p1', day_number: 1, shoot_date: null },
      { project_id: 'p2', day_number: 1, shoot_date: '2026-12-03' },
    ]);
    expect(out).toEqual([{ project_id: 'p2', shoot_date: '2026-12-03', shoot_day: 1, issued_at: null }]);
  });
  it('an issued sheet that fell outside the date window still counts as issued', () => {
    const out = withScheduledDays([], [{ project_id: 'p1', day_number: 1, shoot_date: '2026-12-01' }], [{ project_id: 'p1', shoot_day: 1, issued_at: '2026-11-20T10:00:00Z' }]);
    expect(out).toEqual([sheet(1, '2026-12-01', '2026-11-20T10:00:00Z')]);
  });
  it('the schedule\'s date wins over the sheet\'s copy of it', () => {
    const out = withScheduledDays([sheet(2, '2026-12-05', 'x')], [{ project_id: 'p1', day_number: 2, shoot_date: '2026-12-01' }]);
    expect(out).toEqual([sheet(2, '2026-12-01', 'x')]);
  });
  it('makes the owner row show the next day and flag it when the week is near and nothing has gone out', () => {
    const data: OwnerData = { pendingCrew: [], openTasks: [], sheets: withScheduledDays([], [{ project_id: 'p1', day_number: 1, shoot_date: '2026-11-04' }]) };
    const [row] = ownerRows([{ id: 'p1', title: 'Harbor', phase: 'production' }], data, '2026-11-02');
    expect(row.next).toEqual({ date: '2026-11-04', day: 1, issued: false });
    expect(row.needsYou).toBe(true);
  });
});
