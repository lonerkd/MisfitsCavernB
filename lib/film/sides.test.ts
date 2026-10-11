import { describe, expect, it } from 'vitest';
import { parseScript } from '@/lib/scriptos/parser';
import { buildSides, cueName, type DayScriptScene } from './sides';
import { sidesHtml } from './sides-print';

const SCRIPT = `INT. KITCHEN - DAY

MAYA pours coffee.

MAYA
(quietly)
You're late.

JOE
Traffic.

EXT. HARBOR - DAY

JOE walks the pier alone.

JOE (V.O.)
She never waits.

INT. KITCHEN - NIGHT

MAYA
Still here.
`;

const parsed = parseScript(SCRIPT);
const scene = (heading: string): DayScriptScene => {
  const s = parsed.scenes.find((x) => x.heading === heading)!;
  return { heading: s.heading, sceneNumber: s.sceneNumber, lines: parsed.lines.slice(s.startIndex, s.endIndex + 1).map((l) => ({ type: l.type, text: l.text })) };
};
const who = (character: string) => [{ character, actor: null, call: null }];

describe('cueName', () => {
  it('strips extensions, carets and case', () => {
    expect(cueName('maya (V.O.)')).toBe('MAYA');
    expect(cueName("JOE (CONT'D)")).toBe('JOE');
    expect(cueName('@Dr. Lee ^')).toBe('DR. LEE');
  });
});

describe('buildSides', () => {
  it('gives each called character the scenes of the day they speak in, in day order', () => {
    const out = buildSides([scene('INT. KITCHEN - NIGHT'), scene('INT. KITCHEN - DAY')], [{ character: 'MAYA', actor: 'Ana', call: '06:30' }]);
    expect(out).toHaveLength(1);
    expect(out[0].scenes.map((s) => s.heading)).toEqual(['INT. KITCHEN - NIGHT', 'INT. KITCHEN - DAY']);
    expect(out[0]).toMatchObject({ actor: 'Ana', call: '06:30', lineCount: 2 });
  });

  it('marks the character’s own cue, parenthetical and dialogue, and nothing else', () => {
    const [maya] = buildSides([scene('INT. KITCHEN - DAY')], who('MAYA'));
    expect(maya.scenes[0].lines.filter((l) => l.mine).map((l) => l.text)).toEqual(['MAYA', '(quietly)', "You're late."]);
    expect(maya.lineCount).toBe(1);
    expect(maya.scenes[0].lines.find((l) => l.text === 'Traffic.')?.mine).toBe(false);
  });

  it('counts a V.O. cue as the character’s', () => {
    const [joe] = buildSides([scene('EXT. HARBOR - DAY')], who('JOE'));
    expect(joe.scenes[0].lines.filter((l) => l.mine).map((l) => l.text)).toContain('She never waits.');
  });

  it('leaves out characters with no speech that day', () => {
    expect(buildSides([scene('EXT. HARBOR - DAY')], who('MAYA'))).toEqual([]);
  });

  it('leaves out blank lines and notes', () => {
    const p = parseScript('INT. ROOM - DAY\n\nANA\nHi.\n\n[[note to self]]\n');
    const s = p.scenes[0];
    const [ana] = buildSides([{ heading: s.heading, sceneNumber: 1, lines: p.lines.slice(s.startIndex, s.endIndex + 1).map((l) => ({ type: l.type, text: l.text })) }], who('ANA'));
    expect(ana.scenes[0].lines.every((l) => l.text.trim() !== '' && !l.text.includes('note to self'))).toBe(true);
    expect(ana.scenes[0].sceneNumber).toBe('1');
  });
});

describe('sidesHtml', () => {
  it('prints one page per actor, with their speeches marked and everything escaped', () => {
    const sides = buildSides([scene('INT. KITCHEN - DAY')], [{ character: 'MAYA', actor: 'A <b>na</b>', call: '06:30' }, { character: 'JOE', actor: null, call: null }]);
    const html = sidesHtml(sides, { title: 'Harbor & Co', day: 2, autoprint: false });
    expect(html.match(/<section>/g)).toHaveLength(2);
    expect(html).toContain('class="act"');
    expect(html).toContain('class="dlg mine"');
    expect(html).toContain('A &lt;b&gt;na&lt;/b&gt;');
    expect(html).toContain('Harbor &amp; Co');
    expect(html).toContain('call 06:30');
    expect(html).not.toContain('window.print');
  });
  it('says so when no one is called with lines', () => {
    expect(sidesHtml([], { title: 'X', day: 1 })).toContain('No called cast speaks');
  });
});
