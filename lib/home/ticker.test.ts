import { describe, it, expect } from 'vitest';
import { tickerItems } from './ticker';

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
