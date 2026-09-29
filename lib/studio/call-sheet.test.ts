import { describe, it, expect } from 'vitest';
import { callFor, changesBetween, issueState, sameSnapshot, snapshotOf, toSnapshot } from './call-sheet';

const sheet = {
  shoot_date: '2026-11-03', general_call: '06:00:00', shooting_call: null, estimated_wrap: null,
  location_address: '12 Harbor Rd', weather: null, notes: null,
};
const calls = [
  { crew_user_id: 'u1', character_name: null, call_time: '05:45:00', remarks: 'Bring the slate' },
  { crew_user_id: null, character_name: 'MAYA', call_time: '06:30:00', remarks: null },
];

describe('call sheet snapshots', () => {
  it('match what the database stores, whatever the key order', () => {
    const snap = snapshotOf(sheet, calls);
    // As jsonb comes back: keys in any order.
    const fromDb = toSnapshot({
      cast_calls: { MAYA: { remarks: null, call_time: '06:30:00' } },
      calls: { u1: { remarks: 'Bring the slate', call_time: '05:45:00' } },
      notes: null, weather: null, shoot_date: '2026-11-03', general_call: '06:00:00', shooting_call: null,
      estimated_wrap: null, location_address: '12 Harbor Rd',
    });
    expect(sameSnapshot(snap, fromDb)).toBe(true);
    expect(toSnapshot(null)).toBeNull();
    expect(toSnapshot([])).toBeNull();
  });

  it('a draft, issued, or changed since — and what changed', () => {
    expect(issueState(undefined, [])).toEqual({ status: 'draft' });
    expect(issueState({ ...sheet, version: 0, issued: null }, calls)).toEqual({ status: 'draft' });
    const issued = { ...sheet, version: 2, issued: snapshotOf(sheet, calls) as never };
    expect(issueState(issued, calls)).toEqual({ status: 'issued', version: 2 });
    const moved = [{ ...calls[0] }, { ...calls[1], call_time: '07:00:00' }];
    expect(issueState({ ...issued, location_address: '40 Pier St' }, moved))
      .toEqual({ status: 'changed', version: 2, changes: ['location', '1 call'] });
    expect(changesBetween(snapshotOf(sheet, calls), snapshotOf({ ...sheet, shoot_date: '2026-11-04' }, [])))
      .toEqual(['date', '2 calls']);
  });

  it('finds a person’s call: their own, else a role they play', () => {
    const snap = snapshotOf(sheet, calls);
    expect(callFor(snap, 'u1', ['MAYA'])).toEqual({ call_time: '05:45:00', remarks: 'Bring the slate' });
    expect(callFor(snap, 'u2', ['ZED', 'MAYA'])).toEqual({ call_time: '06:30:00', remarks: null, as: 'MAYA' });
    expect(callFor(snap, 'u3', [])).toBeNull();
  });
});
