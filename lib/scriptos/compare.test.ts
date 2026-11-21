import { describe, expect, it } from 'vitest';
import { changeRefs, collapseRows, compareScripts, cueName, groupScenes, headingKey, sceneVisible, typeLines } from './compare';

const S1 = `INT. KITCHEN - DAY

Maya pours coffee and stares at the window.

MAYA
Good morning.

LEO
(yawning)
Is it?

EXT. STREET - NIGHT

Rain. A bus passes.

MAYA
We should go.

INT. HALL - DAY

Leo waits by the door.

LEO
Maya, hurry.
`;


describe('typeLines', () => {
  it('reads headings, cues, parentheticals, dialogue and action by structure', () => {
    const lines = ['INT. KITCHEN - DAY', '', 'Maya pours coffee.', '', 'MAYA (V.O.)', '(quietly)', 'Hello.', '', 'CUT TO:'];
    expect(typeLines(lines)).toEqual(['slug', 'empty', 'action', 'empty', 'character', 'parenthetical', 'dialogue', 'empty', 'transition']);
  });
  it('cueName drops extensions and forced marks', () => {
    expect(cueName('@Maya Lopez (CONT\'D)')).toBe('MAYA LOPEZ');
  });
  it('headingKey ignores scene numbers', () => {
    expect(headingKey('12. INT. KITCHEN - DAY')).toBe(headingKey('INT. KITCHEN - DAY #12#'));
  });
});

describe('compareScripts', () => {
  it('reports identical texts as identical', () => {
    const c = compareScripts(S1, S1);
    expect(c.identical).toBe(true);
    expect(c.scenes.every((s) => s.status === 'same')).toBe(true);
    expect(c.stats.scenes.same).toBe(3);
    expect(changeRefs(c, 'all')).toEqual([]);
  });

  it('one word changed: one changed scene, one dialogue line, one word each way', () => {
    const c = compareScripts(S1, S1.replace('Good morning.', 'Good evening.'));
    expect(c.identical).toBe(false);
    expect(c.stats.scenes).toMatchObject({ changed: 1, same: 2, added: 0, removed: 0, moved: 0 });
    expect(c.stats.lines).toEqual({ dialogue: 1, action: 0, heading: 0 });
    expect(c.stats.words).toEqual({ added: 1, removed: 1 });
    expect(c.stats.pages.changed).toBe(1);
    const row = c.scenes[0].rows.find((r) => r.kind === 'changed')!;
    expect(row.leftParts?.some((p) => p.changed && p.text.includes('morning'))).toBe(true);
    expect(row.rightParts?.some((p) => p.changed && p.text.includes('evening'))).toBe(true);
  });

  it('a scene inserted is one added scene; its lines are all added', () => {
    const v2 = S1.replace('INT. HALL - DAY', 'INT. ATTIC - NIGHT\n\nDust.\n\nINT. HALL - DAY');
    const c = compareScripts(S1, v2);
    expect(c.stats.scenes).toMatchObject({ added: 1, removed: 0, moved: 0, changed: 0, same: 3 });
    const added = c.scenes.find((s) => s.status === 'added')!;
    expect(added.heading).toBe('INT. ATTIC - NIGHT');
    expect(added.rows.every((r) => r.kind === 'added')).toBe(true);
    expect(c.scenes.indexOf(added)).toBe(2);
  });

  it('a scene cut stays in place as removed', () => {
    const v2 = S1.replace(/EXT\. STREET - NIGHT[\s\S]*?(?=INT\. HALL)/, '');
    const c = compareScripts(S1, v2);
    expect(c.stats.scenes).toMatchObject({ removed: 1, added: 0, moved: 0 });
    expect(c.scenes.map((s) => s.status)).toEqual(['same', 'removed', 'same']);
  });

  it('a scene reordered is moved, not cut and added', () => {
    const [a, b, c3] = S1.trim().split(/\n\n(?=(?:INT|EXT)\.)/);
    const v2 = [a, c3, b].join('\n\n') + '\n';
    const c = compareScripts(S1, v2);
    expect(c.stats.scenes.added).toBe(0);
    expect(c.stats.scenes.removed).toBe(0);
    expect(c.stats.scenes.moved).toBe(1);
    expect(c.stats.lines).toEqual({ dialogue: 0, action: 0, heading: 0 });
    const moved = c.scenes.filter((s) => s.status === 'moved');
    expect(moved).toHaveLength(1);
    expect(moved[0].from).not.toBe(moved[0].to);
    expect(changeRefs(c, 'all')).toHaveLength(1);
    expect(c.identical).toBe(false);
  });

  it('moving the last scene to the front moves one scene', () => {
    const [a, b, c3] = S1.trim().split(/\n\n(?=(?:INT|EXT)\.)/);
    const c = compareScripts(S1, [c3, a, b].join('\n\n') + '\n');
    expect(c.stats.scenes.moved).toBe(1);
    expect(c.scenes.find((s) => s.moved)!.heading).toBe('INT. HALL - DAY');
  });

  it('a character renamed everywhere is one rename, not many dialogue changes', () => {
    const v2 = S1.replace(/MAYA/g, 'MIA').replace(/Maya/g, 'Mia');
    const c = compareScripts(S1, v2);
    expect(c.renames).toEqual([{ from: 'MAYA', to: 'MIA', cues: 2, scenes: 2 }]);
    expect(c.stats.renames).toBe(1);
    expect(c.stats.lines).toEqual({ dialogue: 0, action: 0, heading: 0 });
    expect(c.stats.scenes.changed).toBe(0);
    expect(c.identical).toBe(false);
    expect(c.scenes.some((s) => s.rows.some((r) => r.renamed))).toBe(true);
  });

  it('a rename plus a real edit still reports the edit', () => {
    const v2 = S1.replace(/MAYA/g, 'MIA').replace(/Maya/g, 'Mia').replace('We should go.', 'We must go now.');
    const c = compareScripts(S1, v2);
    expect(c.renames).toHaveLength(1);
    expect(c.stats.lines.dialogue).toBe(1);
    expect(c.stats.scenes.changed).toBe(1);
  });

  it('one cue changed in one place while the name stays elsewhere is a change, not a rename', () => {
    const c = compareScripts(S1, S1.replace('MAYA\nWe should go.', 'ZOE\nWe should go.'));
    expect(c.renames).toEqual([]);
    expect(c.stats.lines.dialogue).toBe(1);
  });

  it('empty against full reads everything as added, and the other way as cut', () => {
    const c = compareScripts('', S1);
    expect(c.stats.scenes).toMatchObject({ added: 3, removed: 0 });
    expect(c.stats.words.removed).toBe(0);
    expect(c.stats.words.added).toBeGreaterThan(20);
    const d = compareScripts(S1, '');
    expect(d.stats.scenes).toMatchObject({ added: 0, removed: 3 });
    expect(compareScripts('', '').identical).toBe(true);
  });

  it('an edited heading with the same scene inside pairs as one changed scene', () => {
    const c = compareScripts(S1, S1.replace('INT. HALL - DAY', 'INT. HALLWAY - DAY'));
    expect(c.stats.scenes).toMatchObject({ added: 0, removed: 0, changed: 1 });
    expect(c.stats.lines.heading).toBe(1);
  });

  it('counts action and dialogue separately and the filter narrows the list', () => {
    const v2 = S1.replace('Rain. A bus passes.', 'Rain. A taxi passes.').replace('We should go.', 'We should leave.');
    const c = compareScripts(S1, v2);
    expect(c.stats.lines).toEqual({ dialogue: 1, action: 1, heading: 0 });
    expect(changeRefs(c, 'all')).toHaveLength(2);
    expect(changeRefs(c, 'dialogue')).toHaveLength(1);
    expect(changeRefs(c, 'action')).toHaveLength(1);
    expect(changeRefs(c, 'heading')).toHaveLength(0);
    expect(changeRefs(c, 'dialogue')[0].label).toContain('dialogue changed');
  });

  it('groups unchanged scenes and collapses unchanged lines', () => {
    const c = compareScripts(S1, S1.replace('Hey.', 'Hey.').replace('Leo waits by the door.', 'Leo waits by the big door.'));
    const items = groupScenes(c, 'all');
    expect(items.map((i) => i.type)).toEqual(['unchanged', 'scene']);
    expect(sceneVisible(c.scenes[0], 'all')).toBe(false);
    const long = Array.from({ length: 12 }, (_, i) => `Line ${i} of a long action block.`).join('\n');
    const rows = compareScripts(`INT. A - DAY\n\n${long}\n`, `INT. A - DAY\n\n${long.replace('Line 6', 'Line six')}\n`).scenes[0].rows;
    const collapsed = collapseRows(rows, 'all');
    expect(collapsed.some((i) => i.type === 'gap')).toBe(true);
    const gap = collapsed.find((i) => i.type === 'gap') as { count: number };
    expect(gap.count).toBeGreaterThanOrEqual(3);
    expect(collapsed.filter((i) => i.type === 'row').length).toBeLessThan(rows.length);
  });

  it('ignores blank-line and scene-number differences', () => {
    const c = compareScripts(S1, S1.replace(/\n\n/g, '\n\n\n').replace('INT. KITCHEN - DAY', 'INT. KITCHEN - DAY #1#'));
    expect(c.identical).toBe(true);
  });

  it('120 pages compare in well under 200 ms', () => {
    let big = '';
    for (let i = 0; i < 130; i++) {
      big += `INT. ROOM ${i} - DAY\n\nMaya walks across the room and looks at the thing for a while.\n\nMAYA\nI do not know about that, honestly.\n\nLEO\n(quietly)\nYou never do.\n\n`;
      for (let j = 0; j < 9; j++) big += `Another action line number ${j} that goes on a bit to wrap.\n\nJOE\nSome words here ${j}.\n\n`;
    }
    const edited = big.replace(/honestly/g, (m, off: number) => (off % 7 === 0 ? 'truly' : m)).replace(/MAYA/g, 'MIA');
    compareScripts(big, edited); // warm the module
    const t = performance.now();
    const c = compareScripts(big, edited);
    const ms = performance.now() - t;
    expect(c.scenes.length).toBe(130);
    expect(ms).toBeLessThan(200);
  });
});

