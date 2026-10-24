import { describe, it, expect } from 'vitest';
import { mergeScript } from './merge';

const base = ['INT. KITCHEN - DAY', '', 'ANA', 'Hello.', '', 'BEN', 'Hi.', '', 'EXT. YARD - NIGHT', '', 'Rain falls.'].join('\n');
const lines = (s: string) => s.split('\n');
const edit = (s: string, fn: (l: string[]) => void) => { const l = lines(s); fn(l); return l.join('\n'); };

describe('mergeScript', () => {
  it('keeps edits in different places from both sides', () => {
    const local = edit(base, l => { l[3] = 'Hello, Ben.'; });
    const remote = edit(base, l => { l[10] = 'Rain falls hard.'; });
    const r = mergeScript(base, local, remote);
    expect(r.clean).toBe(true);
    expect(lines(r.text)[3]).toBe('Hello, Ben.');
    expect(lines(r.text)[10]).toBe('Rain falls hard.');
    expect(lines(r.text)).toHaveLength(11);
  });

  it('keeps insertions on both sides', () => {
    const local = edit(base, l => { l.splice(2, 0, 'A beat.', ''); });
    const remote = edit(base, l => { l.push('', 'FADE OUT.'); });
    const r = mergeScript(base, local, remote);
    expect(r.clean).toBe(true);
    expect(r.text).toContain('A beat.');
    expect(r.text.endsWith('FADE OUT.')).toBe(true);
  });

  it('keeps a deletion on one side and an edit elsewhere on the other', () => {
    const local = edit(base, l => { l.splice(5, 3); });
    const remote = edit(base, l => { l[10] = 'Snow falls.'; });
    const r = mergeScript(base, local, remote);
    expect(r.clean).toBe(true);
    expect(r.text).not.toContain('BEN');
    expect(r.text).toContain('Snow falls.');
  });

  it('is clean when both sides made the same edit', () => {
    const both = edit(base, l => { l[3] = 'Hey.'; });
    expect(mergeScript(base, both, both)).toEqual({ text: both, clean: true, conflicts: 0 });
  });

  it('takes the changed side when only one changed', () => {
    const remote = edit(base, l => { l[3] = 'Yo.'; });
    expect(mergeScript(base, base, remote).text).toBe(remote);
    expect(mergeScript(base, remote, base).text).toBe(remote);
  });

  it('reports a conflict when both sides change the same line differently, keeping local', () => {
    const local = edit(base, l => { l[3] = 'Hello, Ben.'; });
    const remote = edit(base, l => { l[3] = 'Hello, Ana.'; });
    const r = mergeScript(base, local, remote);
    expect(r.clean).toBe(false);
    expect(r.conflicts).toBe(1);
    expect(lines(r.text)[3]).toBe('Hello, Ben.');
  });

  it('still merges the non-conflicting edits around a conflict', () => {
    const local = edit(base, l => { l[0] = 'INT. KITCHEN - NIGHT'; l[3] = 'Hello, Ben.'; });
    const remote = edit(base, l => { l[3] = 'Hello, Ana.'; l[10] = 'Snow.'; });
    const r = mergeScript(base, local, remote);
    expect(r.conflicts).toBe(1);
    expect(lines(r.text)[0]).toBe('INT. KITCHEN - NIGHT');
    expect(lines(r.text)[10]).toBe('Snow.');
  });

  it('merges non-overlapping edits exactly (randomised)', () => {
    let seed = 7;
    const rnd = (n: number) => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) % n;
    for (let round = 0; round < 200; round++) {
      const b = Array.from({ length: 30 }, (_, k) => `line ${k}`);
      // Local edits only the first half, remote only the second, so they cannot overlap.
      const l = [...b], r = [...b];
      for (let k = 0; k < 3; k++) l[rnd(12)] = `L${round}-${k}`;
      for (let k = 0; k < 3; k++) r[18 + rnd(12)] = `R${round}-${k}`;
      const out = mergeScript(b.join('\n'), l.join('\n'), r.join('\n'));
      expect(out.clean).toBe(true);
      const expected = b.map((_, k) => (k < 15 ? l[k] : r[k]));
      expect(out.text).toBe(expected.join('\n'));
    }
  });

  it('handles empty text and a missing trailing newline', () => {
    expect(mergeScript('a\n', 'a\nb\n', 'z\na\n').text).toBe('z\na\nb\n');
    expect(mergeScript('', 'x', 'x').clean).toBe(true);
  });
});
