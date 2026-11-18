import { describe, expect, it } from 'vitest';
import { cueProblems, cueSeconds, cueSheetRows, fmtDuration, isUsable, parseTc, summarize, type Cue } from './cues';

const cue = (o: Partial<Cue> = {}): Cue => ({
  id: 'c1', scene: '', cue: '1M1', title: 'Harbour theme', kind: 'score', use: 'background instrumental', composer: 'Ana Ruiz', publisher: 'Ruiz Music', pro: 'ASCAP',
  masterOwner: '', tcIn: '00:01:00', tcOut: '00:02:30', status: 'original', fee: null, territory: '', term: '', contact: '', notes: '', ...o,
});

describe('timecodes', () => {
  it('reads m:ss, mm:ss and h:mm:ss, and nothing else', () => {
    expect(parseTc('1:23')).toBe(83);
    expect(parseTc('00:01:23')).toBe(83);
    expect(parseTc('1:02:03')).toBe(3723);
    expect(parseTc('1:75')).toBeNull();
    expect(parseTc('abc')).toBeNull();
    expect(parseTc('')).toBeNull();
  });
  it('gives a duration only for an out after the in', () => {
    expect(cueSeconds({ tcIn: '1:00', tcOut: '2:30' })).toBe(90);
    expect(cueSeconds({ tcIn: '2:30', tcOut: '1:00' })).toBeNull();
    expect(cueSeconds({ tcIn: '', tcOut: '1:00' })).toBeNull();
  });
  it('prints a duration with the hour only when there is one', () => {
    expect(fmtDuration(90)).toBe('1:30');
    expect(fmtDuration(3723)).toBe('1:02:03');
    expect(fmtDuration(-4)).toBe('0:00');
  });
});

describe('the licensing summary', () => {
  it('counts what is open, denied, priced and timed', () => {
    const s = summarize([
      cue({ id: 'a' }), // original, timed, no fee, not "unpriced" because it is commissioned
      cue({ id: 'b', kind: 'needle drop', status: 'cleared', fee: 2500, tcIn: '0:10', tcOut: '0:50' }),
      cue({ id: 'c', status: 'negotiating', fee: null, tcIn: '', tcOut: '' }),
      cue({ id: 'd', status: 'denied', fee: 800 }),
    ]);
    expect(s).toMatchObject({ count: 4, open: 1, denied: 1, fees: 3300, unpriced: 1, untimed: 1 });
    expect(s.seconds).toBe(90 + 40 + 90);
  });
  it('counts a cleared or original cue as usable and nothing else', () => {
    expect(isUsable({ status: 'cleared' })).toBe(true);
    expect(isUsable({ status: 'original' })).toBe(true);
    for (const status of ['needed', 'requested', 'negotiating', 'denied'] as const) expect(isUsable({ status })).toBe(false);
  });
});

describe('what stops a cue locking', () => {
  it('is quiet for a commissioned cue in good order', () => {
    expect(cueProblems(cue())).toEqual([]);
  });
  it('names each problem a music supervisor would check', () => {
    expect(cueProblems(cue({ status: 'needed' }))).toContain('No licence yet');
    expect(cueProblems(cue({ status: 'denied' }))).toContain('Licence denied: replace or cut it');
    expect(cueProblems(cue({ composer: '' }))).toContain('No composer');
    expect(cueProblems(cue({ kind: 'source', publisher: '' }))).toContain('No publisher');
    expect(cueProblems(cue({ kind: 'needle drop', masterOwner: '' }))).toContain('No master (recording) owner');
    expect(cueProblems(cue({ tcIn: '', tcOut: '' }))).toContain('No timecode');
    expect(cueProblems(cue({ tcIn: '2:00', tcOut: '1:00' }))).toContain('In and out are not a valid time range');
    expect(cueProblems(cue({ status: 'cleared' }))).toEqual(expect.arrayContaining(['Cleared without a territory', 'Cleared without a term']));
  });
  it('flags a cue number used twice, whatever its case', () => {
    const a = cue({ id: 'a', cue: '1m1' });
    const b = cue({ id: 'b', cue: '1M1' });
    expect(cueProblems(a, [a, b])).toContain('Duplicate cue number');
    expect(cueProblems(a, [a])).not.toContain('Duplicate cue number');
  });
});

describe('the cue sheet', () => {
  it('runs in cue-number order (1M2 before 1M10) with durations', () => {
    const rows = cueSheetRows([cue({ id: 'a', cue: '1M10' }), cue({ id: 'b', cue: '1M2', tcIn: '', tcOut: '' }), cue({ id: 'c', cue: '' })]);
    expect(rows.map((r) => r.cue)).toEqual(['1M2', '1M10', '']);
    expect(rows[1].duration).toBe('1:30');
    expect(rows[0].duration).toBeNull();
  });
});
