import { describe, it, expect } from 'vitest';
import { cutMap, findLine, lineSimilarity, placeLineNotes, sceneSeconds } from './cutlines';

describe('findLine', () => {
  const scene = ['INT. CAVE - NIGHT', '', 'Sam lights a match.', '', 'SAM', 'Who’s there?', '', 'SAM', 'Who’s there?'];

  it('the same text in the same place', () => {
    expect(findLine(scene, { offset: 5, text: 'Who’s there?' })).toEqual({ offset: 5, exact: true });
  });

  it('lines added above: the nearest line with that text', () => {
    const edited = [scene[0], '', 'The cave drips.', '', ...scene.slice(2)];
    expect(findLine(edited, { offset: 5, text: 'who’s   there?' })).toEqual({ offset: 7, exact: true });
  });

  it('reworded a little still finds it; rewritten or cut does not', () => {
    const edited = scene.map((l) => (l === 'Sam lights a match.' ? 'Sam slowly lights a match.' : l));
    expect(findLine(edited, { offset: 2, text: 'Sam lights a match.' })).toEqual({ offset: 2, exact: false });
    expect(findLine(scene, { offset: 2, text: 'A bear wakes up.' })).toBeNull();
    expect(lineSimilarity('', 'x')).toBe(0);
  });
});

describe('sceneSeconds', () => {
  it('a table read wins; else eighths at a minute a page', () => {
    expect(sceneSeconds({ read_seconds: 42, est_duration: '8/8 pg' })).toBe(42);
    expect(sceneSeconds({ est_duration: '3/8 pg' })).toBe(22.5);
    expect(sceneSeconds({ est_duration: null })).toBe(60);
  });
});

describe('cutMap', () => {
  it('with nothing known, the cut runs at the script’s pace', () => {
    const m = cutMap([60, 120, 60]);
    expect(m.starts).toEqual([0, 60, 180]);
    expect(m.sceneAt(100)).toBe(1);
    expect(m.sceneAt(500)).toBe(2);
  });

  it('the cut’s length stretches it; a note pins a scene to a moment', () => {
    expect(cutMap([60, 120, 60], [], 480).starts).toEqual([0, 120, 360]);
    // A note at 45s is in scene 1 (whose middle is 120s of script) — the opening played fast.
    const m = cutMap([60, 120, 60], [{ at: 45, scene: 1 }]);
    expect(m.starts[1]).toBeCloseTo(22.5, 5);
    expect(m.sceneAt(40)).toBe(1);
  });

  it('ignores a note that contradicts an earlier one (a reordered cut)', () => {
    const m = cutMap([60, 60, 60], [{ at: 100, scene: 2 }, { at: 120, scene: 0 }]);
    expect(m.starts).toEqual(cutMap([60, 60, 60], [{ at: 100, scene: 2 }]).starts);
    expect(cutMap([], []).sceneAt(5)).toBe(-1);
  });
});

describe('placeLineNotes', () => {
  const text = ['FADE IN:', 'INT. CAVE - NIGHT', 'Sam lights a match.', 'SAM', 'Who’s there?', 'EXT. RIDGE - DAWN', 'SAM', 'Who’s there?'];
  const scenes = [{ id: 'a', start: 1 }, { id: 'b', start: 5 }];
  const note = (id: string, scene_id: string | null, line_offset: number | null, line_text: string | null) => ({ id, scene_id, line_offset, line_text });

  it('puts each note on its line in its own scene; a gone line falls back to the heading', () => {
    const m = placeLineNotes([
      note('1', 'a', 3, 'Who’s there?'),
      note('2', 'b', 2, 'Who’s there?'),
      note('3', 'a', 1, 'A bear wakes up.'),
      note('4', 'zzz', 0, 'Elsewhere'),
      note('5', 'a', null, null),
    ], scenes, text);
    expect(m.get(4)?.map((p) => p.note.id)).toEqual(['1']);
    expect(m.get(7)?.map((p) => p.note.id)).toEqual(['2']);
    expect(m.get(1)).toEqual([{ note: note('3', 'a', 1, 'A bear wakes up.'), exact: false, lost: true }]);
    expect([...m.values()].flat()).toHaveLength(3);
  });
});
