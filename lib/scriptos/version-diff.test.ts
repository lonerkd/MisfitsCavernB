import { describe, expect, it } from 'vitest';
import { changedScenes, summarizeVersions } from './version-diff';

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
