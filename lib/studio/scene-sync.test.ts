import { describe, it, expect } from 'vitest';
import { alignSceneIds, planSceneSync, normalizeHeading, toPlanRow, type IndexedScene, type ParsedSceneInput } from './scene-sync';
import { parseScript } from '@/lib/scriptos/parser';

// Builds the index a previous sync would have stored for these headings.
function indexed(headings: string[], prefix = 's'): IndexedScene[] {
  return headings.map((heading, i) => ({ id: `${prefix}${i + 1}`, heading, ordinal: i, removed_at: null }));
}
const parsed = (headings: string[]): ParsedSceneInput[] => headings.map((heading) => ({ heading }));
function ids() {
  let n = 0;
  return () => `new${++n}`;
}

describe('alignSceneIds — a scene keeps its id while the script changes', () => {
  it('identical script: every id is kept', () => {
    const h = ['INT. CAVE - NIGHT', 'EXT. ROAD - DAY', 'INT. CAVE - NIGHT'];
    expect(alignSceneIds(indexed(h), parsed(h), ids())).toEqual(['s1', 's2', 's3']);
  });

  it('a scene inserted before others: the others keep their ids', () => {
    const before = ['INT. CAVE - NIGHT', 'EXT. ROAD - DAY'];
    const after = ['EXT. CLIFF - DAWN', 'INT. CAVE - NIGHT', 'EXT. ROAD - DAY'];
    expect(alignSceneIds(indexed(before), parsed(after), ids())).toEqual(['new1', 's1', 's2']);
  });

  it('a scene deleted: the rest keep their ids', () => {
    const before = ['A. ONE', 'B. TWO', 'C. THREE'];
    expect(alignSceneIds(indexed(before), parsed(['A. ONE', 'C. THREE']), ids())).toEqual(['s1', 's3']);
  });

  it('an edited heading keeps its id', () => {
    const before = ['INT. KITCHEN - DAY', 'EXT. GARDEN - DAY'];
    const after = ['INT. KITCHEN - NIGHT', 'EXT. GARDEN - DAY'];
    expect(alignSceneIds(indexed(before), parsed(after), ids())).toEqual(['s1', 's2']);
  });

  it('an edited heading next to a new scene pairs by similarity, not position', () => {
    const before = ['INT. HOUSE - DAY', 'INT. KITCHEN - DAY', 'INT. HOUSE - NIGHT'];
    const after = ['INT. HOUSE - DAY', 'EXT. STREET - DAY', 'INT. KITCHEN - LATER', 'INT. HOUSE - NIGHT'];
    expect(alignSceneIds(indexed(before), parsed(after), ids())).toEqual(['s1', 'new1', 's2', 's3']);
  });

  it('repeated headings are matched in order, not collapsed', () => {
    const before = ['INT. CAR - DAY', 'EXT. ROAD - DAY', 'INT. CAR - DAY'];
    const after = ['INT. CAR - DAY', 'EXT. ROAD - DAY', 'EXT. ROAD - DAY', 'INT. CAR - DAY'];
    const result = alignSceneIds(indexed(before), parsed(after), ids());
    expect(result[0]).toBe('s1');
    expect(result[3]).toBe('s3');
    expect(new Set(result).size).toBe(4);
  });

  it('reordered scenes keep their ids where the order still agrees', () => {
    const before = ['A. ONE', 'B. TWO', 'C. THREE', 'D. FOUR'];
    const after = ['A. ONE', 'C. THREE', 'D. FOUR', 'B. TWO'];
    const result = alignSceneIds(indexed(before), parsed(after), ids());
    expect(result.slice(0, 3)).toEqual(['s1', 's3', 's4']);
    // B moved past C and D: the longest agreeing order excludes it, so it is
    // re-created — unless it can be revived, which the server-side removal
    // makes possible on the next sync (covered below).
    expect(result[3]).toBe('new1');
  });

  it('a removed scene whose heading comes back is revived with its old id', () => {
    const existing: IndexedScene[] = [
      { id: 's1', heading: 'A. ONE', ordinal: 0, removed_at: null },
      { id: 'gone', heading: 'B. TWO', ordinal: 1, removed_at: '2026-09-26T10:00:00Z' },
    ];
    expect(alignSceneIds(existing, parsed(['A. ONE', 'B. TWO']), ids())).toEqual(['s1', 'gone']);
  });

  it('revival prefers the most recently removed scene and never reuses one twice', () => {
    const existing: IndexedScene[] = [
      { id: 'old', heading: 'X. SAME', ordinal: 0, removed_at: '2026-09-01T00:00:00Z' },
      { id: 'recent', heading: 'X. SAME', ordinal: 1, removed_at: '2026-09-20T00:00:00Z' },
    ];
    expect(alignSceneIds(existing, parsed(['X. SAME', 'X. SAME', 'X. SAME']), ids())).toEqual(['recent', 'old', 'new1']);
  });

  it('first sync of a script: every scene is new', () => {
    expect(alignSceneIds([], parsed(['A. ONE', 'B. TWO']), ids())).toEqual(['new1', 'new2']);
  });

  it('script emptied: nothing to keep', () => {
    expect(alignSceneIds(indexed(['A. ONE']), [], ids())).toEqual([]);
  });

  it('headings compare case- and whitespace-insensitively and ignore scene numbers', () => {
    expect(normalizeHeading('  int.  cave -  night #12A#')).toBe('INT. CAVE - NIGHT');
    expect(alignSceneIds(indexed(['INT. CAVE - NIGHT']), parsed(['int. cave - night #4#']), ids())).toEqual(['s1']);
  });
});

describe('planSceneSync', () => {
  const stored = (rows: Array<ParsedSceneInput & { id: string }>): IndexedScene[] =>
    rows.map((r, i) => {
      const row = toPlanRow(r.id, r, i);
      return { ...row, ordinal: i, removed_at: null, elements: row.elements as never };
    });

  it('reports no change when the stored index already matches the script', () => {
    const scenes = [{ id: 'a', heading: 'INT. CAVE - NIGHT', characters: ['SAM'], eighths: 3 }];
    const plan = planSceneSync(stored(scenes), scenes, ids());
    expect(plan.changed).toBe(false);
    expect(plan.baseIds).toEqual(['a']);
  });

  it('detects a changed cast list, page length or order', () => {
    const scenes = [{ id: 'a', heading: 'A. ONE', characters: ['SAM'] }, { id: 'b', heading: 'B. TWO' }];
    expect(planSceneSync(stored(scenes), [{ heading: 'A. ONE', characters: ['SAM', 'RILEY'] }, { heading: 'B. TWO' }], ids()).changed).toBe(true);
    expect(planSceneSync(stored(scenes), [{ heading: 'A. ONE', characters: ['SAM'], eighths: 5 }, { heading: 'B. TWO' }], ids()).changed).toBe(true);
    expect(planSceneSync(stored(scenes), [{ heading: 'A. ONE', characters: ['SAM'] }], ids()).changed).toBe(true);
  });

  it('element key order does not count as a change (jsonb does not keep it)', () => {
    const current: IndexedScene[] = [{ ...toPlanRow('a', { heading: 'A. ONE' }, 0), ordinal: 0, removed_at: null, elements: { wardrobe: [], props: ['GUN'] } }];
    const plan = planSceneSync(current, [{ heading: 'A. ONE', elements: { props: ['GUN'], wardrobe: [] } }], ids());
    expect(plan.changed).toBe(false);
  });

  it('builds rows exactly as the server stores them', () => {
    expect(toPlanRow('x', { heading: '', timeOfDay: 'UNKNOWN', characters: [], eighths: 0 }, 4)).toEqual({
      id: 'x', heading: 'Scene 5', location: null, time_of_day: 'DAY', cast_list: null, est_duration: '1/8 pg', elements: {},
    });
  });

  it('works on real parser output', () => {
    const v1 = parseScript('INT. CAVE - NIGHT\n\nSam lights a match.\n\nSAM\nHello?\n\nEXT. ROAD - DAY\n\nA truck passes.\n');
    const gen = ids();
    const first = planSceneSync([], v1.scenes, gen);
    expect(first.scenes.map((s) => s.heading)).toEqual(['INT. CAVE - NIGHT', 'EXT. ROAD - DAY']);
    expect(first.scenes[0].cast_list).toBe('SAM');

    const index = first.scenes.map((s, i) => ({ ...s, ordinal: i, removed_at: null, elements: s.elements as never }));
    const v2 = parseScript('EXT. CLIFF - DAWN\n\nWind.\n\nINT. CAVE - NIGHT\n\nSam lights a match.\n\nSAM\nHello?\n\nEXT. ROAD - DAY\n\nA truck passes.\n');
    const second = planSceneSync(index, v2.scenes, gen);
    expect(second.scenes.map((s) => s.id)).toEqual(['new3', first.scenes[0].id, first.scenes[1].id]);
    expect(second.changed).toBe(true);
  });
});
