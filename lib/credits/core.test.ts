import { describe, it, expect } from 'vitest';
import { creditLabel, groupByProject, pressKitSections, type PersonCredit } from './core';

const row = (p: string, kind: string, credit: string, character_name: string | null = null): PersonCredit => ({
  project_id: p, title: `Film ${p}`, project_type: 'Short Film', year: 2026, accent_color: null,
  kind, credit, character_name, department: null, portfolio_project_id: p === 'b' ? 'pf1' : null,
});

describe('credits', () => {
  it('labels cast by the part they play', () => {
    expect(creditLabel({ kind: 'cast', credit: 'Cast', character_name: 'MAYA' })).toBe('Plays MAYA');
    expect(creditLabel({ kind: 'crew', credit: 'Gaffer', character_name: null })).toBe('Gaffer');
  });

  it('groups a person’s credits per project, in order, without repeats', () => {
    const g = groupByProject([row('a', 'creator', 'Director'), row('a', 'cast', 'Cast', 'MAYA'), row('a', 'crew', 'Director'), row('b', 'crew', 'Gaffer')]);
    expect(g.map((x) => [x.project_id, x.labels, x.primary, x.portfolio_project_id])).toEqual([
      ['a', ['Director', 'Plays MAYA'], 'Director', null],
      ['b', ['Gaffer'], 'Gaffer', 'pf1'],
    ]);
  });

  it('a press kit: filmmaker, crew by department, then cast', () => {
    const s = pressKitSections([
      { user_id: 'u1', username: 'sam', kind: 'creator', credit: 'Director', character_name: null, department: 'Directing' },
      { user_id: 'u2', username: 'jo', kind: 'crew', credit: 'Gaffer', character_name: null, department: 'Lighting' },
      { user_id: 'u3', username: 'ri', kind: 'cast', credit: 'Cast', character_name: 'MAYA', department: null },
      { user_id: 'u4', username: 'al', kind: 'crew', credit: 'Contributor', character_name: null, department: null },
    ]);
    expect(s).toEqual([
      { heading: 'Filmmaker', people: [{ user_id: 'u1', username: 'sam', role: 'Director' }] },
      { heading: 'Lighting', people: [{ user_id: 'u2', username: 'jo', role: 'Gaffer' }] },
      { heading: 'Crew', people: [{ user_id: 'u4', username: 'al', role: 'Contributor' }] },
      { heading: 'Cast', people: [{ user_id: 'u3', username: 'ri', role: 'MAYA' }] },
    ]);
  });
});
