import { describe, expect, it } from 'vitest';
import { findRecords, queryWords, recordText } from './record-find';

const rows = [
  { id: 'a1', hazard: 'Stunt fall', location: 'Harbour', owner: 'Dev', scene_ids: ['s-9'], severity: 'high' },
  { id: 'b2', hazard: 'Pyrotechnics', location: 'Quarry', owner: 'Maya', severity: 'medium', count: 12 },
  { id: 'c3', hazard: 'Night exterior', location: 'Harbour', owner: '', severity: 'low' },
];

describe('record find', () => {
  it('reads every human value and none of the plumbing', () => {
    const t = recordText(rows[0]);
    expect(t).toContain('stunt fall');
    expect(t).toContain('harbour');
    expect(t).not.toContain('a1');
    expect(t).not.toContain('s-9');
    expect(recordText(rows[1])).toContain('12');
  });
  it('splits a query into lower-case words', () => {
    expect(queryWords('  Harbour  HIGH ')).toEqual(['harbour', 'high']);
    expect(queryWords('   ')).toEqual([]);
  });
  it('an empty query keeps everything, in order', () => {
    expect(findRecords(rows, '  ').map((r) => r.id)).toEqual(['a1', 'b2', 'c3']);
  });
  it('every word must match, anywhere in the record', () => {
    expect(findRecords(rows, 'harbour').map((r) => r.id)).toEqual(['a1', 'c3']);
    expect(findRecords(rows, 'harbour high').map((r) => r.id)).toEqual(['a1']);
    expect(findRecords(rows, 'MAYA quarry').map((r) => r.id)).toEqual(['b2']);
    expect(findRecords(rows, 'nothing here')).toEqual([]);
  });
  it('does not match an id', () => {
    expect(findRecords(rows, 'a1')).toEqual([]);
  });
});
