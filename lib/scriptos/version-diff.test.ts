import { describe, expect, it } from 'vitest';
import { changedRowIndexes, changedScenes, inlineRows, summarizeVersions } from './version-diff';

const V1 = `Title: Brick & Steel

INT. KITCHEN - DAY

MAYA
Hi there.

EXT. STREET - NIGHT

LEO
Hey.
`;

const V2 = `Title: Brick & Steel

INT. KITCHEN - DAY

MAYA
Hi there, again.
And again.

EXT. STREET - NIGHT

LEO
Hey.

INT. HALL - DAY

Maya waits.
`;

describe('comparing two versions of a script', () => {
  it('finds an identical script', () => {
    const s = summarizeVersions(V1, V1);
    expect(s).toMatchObject({ added: 0, removed: 0, identical: true });
    expect(changedScenes(s)).toEqual([]);
    expect(s.scenes.map((x) => x.status)).toEqual(['same', 'same']);
  });

  it('counts the lines added inside a scene and marks it changed', () => {
    const s = summarizeVersions(V1, V2);
    const kitchen = s.scenes.find((x) => x.heading === 'INT. KITCHEN - DAY')!;
    expect(kitchen.status).toBe('changed');
    expect(kitchen.added).toBeGreaterThan(0);
    expect(kitchen.removed).toBeGreaterThan(0);
    expect(kitchen.after).toContain('again');
    expect(kitchen.before).not.toContain('again');
    expect(s.scenes.find((x) => x.heading === 'EXT. STREET - NIGHT')!.status).toBe('same');
  });

  it('marks a new scene added, in the later version’s order', () => {
    const s = summarizeVersions(V1, V2);
    const hall = s.scenes.find((x) => x.heading === 'INT. HALL - DAY')!;
    expect(hall).toMatchObject({ status: 'added', removed: 0 });
    expect(hall.after).toContain('Maya waits.');
    expect(hall.before).toBe('');
    expect(s.scenes[s.scenes.length - 1].heading).toBe('INT. HALL - DAY');
    expect(changedScenes(s).map((x) => x.heading)).toEqual(['INT. KITCHEN - DAY', 'INT. HALL - DAY']);
  });

  it('marks a deleted scene removed, where it used to sit', () => {
    const s = summarizeVersions(V2, V1);
    expect(s.scenes.map((x) => x.status)).toEqual(['changed', 'same', 'removed']);
    expect(s.scenes[2].heading).toBe('INT. HALL - DAY');
    expect(s.scenes[2].after).toBe('');
    expect(s.removed).toBeGreaterThan(0);
  });

  it('reads a renamed heading as one scene out and one in', () => {
    const renamed = V1.replace('EXT. STREET - NIGHT', 'EXT. STREET - LATE NIGHT');
    const s = summarizeVersions(V1, renamed);
    expect(s.scenes.map((x) => x.status)).toEqual(['same', 'removed', 'added']);
    expect(s.scenes[2].heading).toBe('EXT. STREET - LATE NIGHT');
  });

  it('keeps scenes paired when one is inserted between them', () => {
    const inserted = V1.replace('EXT. STREET - NIGHT', 'INT. CAR - DAY\n\nDrive.\n\nEXT. STREET - NIGHT');
    const s = summarizeVersions(V1, inserted);
    expect(s.scenes.map((x) => x.status)).toEqual(['same', 'added', 'same']);
    expect(s.scenes[0].heading).toBe('INT. KITCHEN - DAY');
    expect(s.scenes[2].heading).toBe('EXT. STREET - NIGHT');
  });

  it('treats a script with no headings as one preamble', () => {
    const s = summarizeVersions('FADE IN:\n\nA room.', 'FADE IN:\n\nA dark room.');
    expect(s.scenes).toEqual([]);
    expect(s.identical).toBe(false);
    expect(s.added + s.removed).toBeGreaterThan(0);
  });

  it('handles an empty version', () => {
    expect(summarizeVersions('', V1).scenes.filter((x) => x.status === 'added')).toHaveLength(2);
    expect(summarizeVersions(V1, '').scenes.filter((x) => x.status === 'removed')).toHaveLength(2);
    expect(summarizeVersions('', '')).toMatchObject({ added: 0, removed: 0, identical: true });
  });
});

describe('side by side, line by line', () => {
  it('pairs a reworded line and marks only the words that changed', () => {
    const rows = inlineRows('MAYA\nHi there.', 'MAYA\nHi there, again.');
    expect(rows.map((r) => r.kind)).toEqual(['same', 'changed']);
    const changed = rows[1];
    expect(changed.left).toBe('Hi there.');
    expect(changed.right).toBe('Hi there, again.');
    expect(changed.leftParts!.filter((p) => p.changed).map((p) => p.text).join('')).not.toContain('again');
    expect(changed.rightParts!.filter((p) => p.changed).map((p) => p.text).join('')).toContain('again');
    expect(changed.leftParts!.map((p) => p.text).join('')).toBe('Hi there.');
  });

  it('gives a wholly different line one row, words marked, and extra lines their own side', () => {
    const rows = inlineRows('a\nb\nc', 'a\nZebra\nc\nd');
    // Whatever survives is its own row; the rest pair up in order as changed rows.
    expect(rows.map((r) => r.kind)).toEqual(['same', 'changed', 'changed', 'added']);
    const zebra = rows.find((r) => r.right === 'Zebra')!;
    expect(zebra.kind).toBe('changed');
    // "b" is on the left, "Zebra" on the right, and the right's words are the changed ones.
    expect(zebra.left).toBe('b');
    expect(zebra.rightParts!.filter((p) => p.changed).map((p) => p.text).join('')).toContain('Zebra');
    expect(zebra.leftParts!.filter((p) => p.changed).map((p) => p.text).join('')).not.toContain('Zebra');
    expect([rows[3].left, rows[3].right]).toEqual(['', 'd']);
  });

  it('is all same rows for an identical text, and empty for two empty ones', () => {
    expect(inlineRows('x\ny', 'x\ny').every((r) => r.kind === 'same')).toBe(true);
    expect(inlineRows('', '')).toEqual([]);
  });

  it('finds the rows that changed, for next / previous', () => {
    expect(changedRowIndexes(inlineRows('a\nb\nc', 'a\nB\nc'))).toEqual([1]);
    expect(changedRowIndexes(inlineRows('x', 'x'))).toEqual([]);
  });
});

