import { describe, expect, it } from 'vitest';
import { groupPageCredits, type PageCreditRow } from './page-credits';

const row = (over: Partial<PageCreditRow>): PageCreditRow => ({
  title: 'Pier', year: 2026, project_type: 'short', accent_color: null, share_token: 't1', kind: 'crew', credit: 'Gaffer', character_name: null, ...over,
});

describe('a person’s page credits', () => {
  it('is one entry per film with its credits together, in the order sent', () => {
    const films = groupPageCredits([
      row({}), row({ kind: 'cast', credit: 'Cast', character_name: 'MAYA' }),
      row({ title: 'Harbour', share_token: 't2', kind: 'creator', credit: 'Director' }),
    ]);
    expect(films).toEqual([
      { token: 't1', title: 'Pier', year: 2026, type: 'short', labels: ['Gaffer', 'Plays MAYA'] },
      { token: 't2', title: 'Harbour', year: 2026, type: 'short', labels: ['Director'] },
    ]);
  });

  it('drops a repeated credit on the same film, and nothing in gives nothing out', () => {
    expect(groupPageCredits([row({}), row({})])[0].labels).toEqual(['Gaffer']);
    expect(groupPageCredits([])).toEqual([]);
  });
});
