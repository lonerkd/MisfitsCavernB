import { describe, expect, it } from 'vitest';
import { parseScript } from '@/lib/scriptos/parser';
import { headingKey, linesByScene, mySides, type DaySceneRow, type ParsedSceneLite } from './my-sides';

const SCRIPT = `INT. KITCHEN - DAY

MAYA
You're late.

BEN
Traffic.

EXT. HARBOR - NIGHT

JOE (V.O.)
She never waits.

MAYA
Then go.
`;

function parsedScenes(text: string): ParsedSceneLite[] {
  const p = parseScript(text);
  return p.scenes.map((s) => ({ heading: s.heading, lines: p.lines.slice(s.startIndex, s.endIndex + 1).map((l) => ({ type: l.type, text: l.text })) }));
}
const row = (id: string, heading: string, scene_number: number, ordinal: number | null): DaySceneRow => ({ id, heading, title: null, scene_number, ordinal });

describe('headingKey', () => {
  it('ignores scene-number marks, spacing and case', () => {
    expect(headingKey('  int.  kitchen - day #12A# ')).toBe('INT. KITCHEN - DAY');
    expect(headingKey(null)).toBe('');
  });
});

describe('linesByScene', () => {
  const parsed = parsedScenes(SCRIPT);

  it('finds a day scene by its ordinal when the heading agrees', () => {
    const m = linesByScene([row('a', 'INT. KITCHEN - DAY', 1, 0), row('b', 'EXT. HARBOR - NIGHT', 2, 1)], parsed);
    expect(m.get('a')?.some((l) => l.text === 'MAYA')).toBe(true);
    expect(m.get('b')?.some((l) => l.text === 'JOE (V.O.)')).toBe(true);
  });

  it('does not trust an ordinal that points at another scene: it finds the scene by its heading', () => {
    const m = linesByScene([row('b', 'EXT. HARBOR - NIGHT', 2, 0)], parsed);
    expect(m.get('b')?.some((l) => l.text === 'She never waits.')).toBe(true);
    expect(m.get('b')?.some((l) => l.text === "You're late.")).toBe(false);
  });

  it('finds a scene with no ordinal by heading, and uses each parsed scene once', () => {
    const twice = parsedScenes('INT. ROOM - DAY\n\nANA\nOne.\n\nINT. ROOM - DAY\n\nANA\nTwo.\n');
    const m = linesByScene([row('x', 'INT. ROOM - DAY', 1, null), row('y', 'INT. ROOM - DAY', 2, null)], twice);
    expect(m.get('x')?.some((l) => l.text === 'One.')).toBe(true);
    expect(m.get('y')?.some((l) => l.text === 'Two.')).toBe(true);
  });

  it('leaves a scene that is not in the script without lines', () => {
    expect(linesByScene([row('z', 'INT. NOWHERE - DAY', 9, 4)], parsed).has('z')).toBe(false);
  });
});

describe('mySides', () => {
  const rows = [row('a', 'INT. KITCHEN - DAY', 1, 0), row('b', 'EXT. HARBOR - NIGHT', 2, 1)];

  it('gives a performer their scenes in shooting order with their own speeches marked', () => {
    const [maya] = mySides({ castAs: ['MAYA'], rows, parsed: parsedScenes(SCRIPT), actor: 'Ana', call: '06:30' });
    expect(maya).toMatchObject({ character: 'MAYA', actor: 'Ana', call: '06:30', lineCount: 2 });
    expect(maya.scenes.map((s) => s.sceneNumber)).toEqual(['1', '2']);
    expect(maya.scenes[0].lines.filter((l) => l.mine).map((l) => l.text)).toEqual(['MAYA', "You're late."]);
  });

  it('is empty for someone who is not cast, or whose character has no lines that day', () => {
    expect(mySides({ castAs: [], rows, parsed: parsedScenes(SCRIPT), actor: null, call: null })).toEqual([]);
    expect(mySides({ castAs: ['IVY'], rows, parsed: parsedScenes(SCRIPT), actor: null, call: null })).toEqual([]);
  });

  it('gives one entry for each character a person plays', () => {
    const out = mySides({ castAs: ['MAYA', 'JOE'], rows, parsed: parsedScenes(SCRIPT), actor: null, call: null });
    expect(out.map((s) => s.character)).toEqual(['MAYA', 'JOE']);
  });
});
