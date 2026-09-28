import { describe, it, expect } from 'vitest';
import { daysLeft, docState, paperworkGaps } from './documents';

const doc = (patch: Partial<Parameters<typeof docState>[0]>) =>
  ({ kind: 'permit', title: 'x', status: 'needed', person_id: null, location_id: null, expires_on: null, ...patch });

describe('where a document stands', () => {
  it('speaks each kind’s language', () => {
    expect(docState(doc({ kind: 'permit', status: 'done' }), '2026-11-01')).toEqual({ label: 'Granted', tone: 'done' });
    expect(docState(doc({ kind: 'release', status: 'pending' }), '2026-11-01')).toEqual({ label: 'Sent', tone: 'open' });
    expect(docState(doc({ kind: 'insurance', status: 'done' }), '2026-11-01').label).toBe('Active');
    expect(docState(doc({ kind: 'contract' }), '2026-11-01')).toEqual({ label: 'Needed', tone: 'warn' });
  });

  it('warns before it expires, and says when it has', () => {
    expect(daysLeft('2026-11-10', '2026-11-01')).toBe(9);
    expect(docState(doc({ kind: 'insurance', status: 'done', expires_on: '2026-11-10' }), '2026-11-01'))
      .toEqual({ label: 'Active · expires in 9d', tone: 'warn' });
    expect(docState(doc({ kind: 'insurance', status: 'done', expires_on: '2026-10-29' }), '2026-11-01'))
      .toEqual({ label: 'Expired 3d ago', tone: 'bad' });
    expect(docState(doc({ status: 'done', expires_on: '2027-01-01' }), '2026-11-01').tone).toBe('done');
  });
});

describe('what the production still needs on paper', () => {
  const crew = [
    { user_id: 'u1', username: 'ana', craft: 'Actor' },
    { user_id: 'u2', username: 'bo', craft: 'Gaffer' },
  ];
  const input = {
    docs: [],
    locations: [{ id: 'l1', name: 'HARBOR', permit: 'needed' }, { id: 'l2', name: 'KITCHEN', permit: 'not_needed' }],
    castings: [{ character_name: 'MAYA', crew_user_id: 'u1' }],
    crew,
  };

  it('insurance, a permit where one’s needed, a release for the cast, a deal memo for the crew', () => {
    expect(paperworkGaps(input).map((g) => [g.kind, g.title, g.why])).toEqual([
      ['insurance', 'Production insurance', 'Locations and crew usually require it (general liability, equipment).'],
      ['permit', 'Filming permit — HARBOR', 'HARBOR needs a permit.'],
      ['release', 'Appearance release — ana', 'Cast as MAYA.'],
      ['contract', 'Crew deal memo — bo', 'On the crew as Gaffer.'],
    ]);
  });

  it('stops asking once the paperwork exists', () => {
    const docs = [
      doc({ kind: 'insurance' }),
      doc({ kind: 'permit', location_id: 'l1', status: 'pending' }),
      doc({ kind: 'release', person_id: 'u1' }),
      doc({ kind: 'contract', person_id: 'u2' }),
    ];
    expect(paperworkGaps({ ...input, docs })).toEqual([]);
    expect(paperworkGaps({ docs: [], locations: [], castings: [], crew: [] })).toEqual([]);
  });
});
