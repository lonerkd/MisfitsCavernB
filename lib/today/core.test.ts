import { describe, it, expect } from 'vitest';
import { clock, dayLabel, daysUntil, dueLabel, greeting, localDay, mapsHref, nextShootDays, openTasks, urgency } from './core';

const TODAY = '2026-09-29'; // a Tuesday

describe('days', () => {
  it('counts calendar days, across months and years', () => {
    expect(daysUntil('2026-10-01', TODAY)).toBe(2);
    expect(daysUntil('2026-09-28', TODAY)).toBe(-1);
    expect(daysUntil('2027-01-01', '2026-12-31')).toBe(1);
    expect(localDay(new Date(2026, 8, 29, 23, 59))).toBe('2026-09-29');
  });

  it('names a day the way people say it', () => {
    expect(dayLabel('2026-09-29', TODAY)).toBe('Today');
    expect(dayLabel('2026-09-30', TODAY)).toBe('Tomorrow');
    expect(dayLabel('2026-10-02', TODAY)).toBe('Fri');
    expect(dayLabel('2026-10-09', TODAY)).toBe('Fri 9 Oct');
    expect(dayLabel('2026-09-28', TODAY)).toBe('Yesterday');
  });

  it('reads call times and greets by the hour', () => {
    expect(clock('07:30:00')).toBe('7:30');
    expect(clock('18:05')).toBe('18:05');
    expect(clock(null)).toBeNull();
    expect([greeting(3), greeting(8), greeting(13), greeting(20)]).toEqual(['Up late', 'Morning', 'Afternoon', 'Evening']);
  });
});

describe('the days on set', () => {
  it('are the coming ones, soonest first, today included', () => {
    const sheets = [
      { id: 'a', project_id: 'p', shoot_date: '2026-10-03', shoot_day: 3 },
      { id: 'b', project_id: 'p', shoot_date: '2026-09-28', shoot_day: 1 },
      { id: 'c', project_id: 'p', shoot_date: TODAY, shoot_day: 2 },
      { id: 'd', project_id: 'q', shoot_date: null, shoot_day: 1 },
      { id: 'e', project_id: 'q', shoot_date: '2026-10-01', shoot_day: 1 },
    ];
    expect(nextShootDays(sheets, TODAY).map((s) => s.id)).toEqual(['c', 'e', 'a']);
    expect(nextShootDays(sheets, TODAY, 1).map((s) => s.id)).toEqual(['c']);
  });
});

describe('tasks', () => {
  it('say how urgent they are', () => {
    expect(urgency('2026-09-27', TODAY)).toBe('overdue');
    expect(urgency(TODAY, TODAY)).toBe('today');
    expect(urgency('2026-10-04', TODAY)).toBe('soon');
    expect(urgency('2026-11-01', TODAY)).toBe('later');
    expect(urgency(null, TODAY)).toBe('undated');
    expect(dueLabel('2026-09-27', TODAY)).toBe('Overdue · 2 days');
    expect(dueLabel('2026-09-28', TODAY)).toBe('Overdue · yesterday');
    expect(dueLabel(TODAY, TODAY)).toBe('Due today');
    expect(dueLabel('2026-09-30', TODAY)).toBe('Due tomorrow');
    expect(dueLabel('2026-10-09', TODAY)).toBe('Due Fri 9 Oct');
  });

  it('come most urgent first, done ones left out', () => {
    const t = (id: string, due: string | null, completed = false) => ({ id, title: id, due_date: due, completed });
    const list = [t('later', '2026-11-01'), t('none', null), t('done', '2026-09-20', true), t('late', '2026-09-20'), t('now', TODAY), t('soon2', '2026-10-05'), t('soon1', '2026-10-01')];
    expect(openTasks(list, TODAY).map((x) => x.id)).toEqual(['late', 'now', 'soon1', 'soon2', 'later', 'none']);
  });

  it('link an address to maps', () => {
    expect(mapsHref('12 Harbour Rd, Leith')).toBe('https://maps.google.com/?q=12%20Harbour%20Rd%2C%20Leith');
  });
});
