import { describe, it, expect } from 'vitest';
import { tickerItems, MIN_PEOPLE_TOTAL, showPeopleTotal } from './ticker';

describe('tickerItems', () => {
  it('says nothing when nothing is real', () => {
    expect(tickerItems(null, [], [])).toEqual([]);
    expect(tickerItems({ users: 0, scripts: 0, projects: 0, jobs: 0, media: 0 }, [], [])).toEqual([]);
  });

  it('interleaves news with totals', () => {
    const items = tickerItems(
      { users: 1203, scripts: 1, projects: 0, jobs: 2, media: 9 },
      [{ title: 'Night Shift', role: 'Gaffer', location: 'Leeds' }, { title: 'Editor', role: 'Editor' }],
      [{ title: 'Salt', year: 2026, category: 'Short Film', role: 'Director' }],
    );
    expect(items).toEqual([
      'Hiring · Gaffer — Night Shift · Leeds', '1,203 filmmakers',
      'Hiring · Editor', '1 screenplay in progress',
      'New work · Salt (2026) · Short Film', '2 open roles',
    ]);
  });
});

describe("people total floor", () => {
  it("leaves the filmmakers line out below MIN_PEOPLE_TOTAL", () => {
    const lines = (users: number) => tickerItems({ users, scripts: 3, projects: 0, jobs: 0, media: 0 }, [], []);
    expect(lines(2).some((l) => l.includes("filmmaker"))).toBe(false);
    expect(lines(MIN_PEOPLE_TOTAL - 1).some((l) => l.includes("filmmaker"))).toBe(false);
    expect(lines(MIN_PEOPLE_TOTAL).some((l) => l.includes("filmmakers"))).toBe(true);
    expect(showPeopleTotal(2)).toBe(false);
    expect(showPeopleTotal(MIN_PEOPLE_TOTAL)).toBe(true);
  });
});
