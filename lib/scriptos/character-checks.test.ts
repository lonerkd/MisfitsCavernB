import { describe, it, expect } from 'vitest';
import { parseScript } from './parser';
import { checkCharacters, warningsFor, editDistance, nameKey, cueName } from './character-checks';
import { relationships, talksToMost, topCharacters } from './relationships';

const run = (text: string, rejectedNames: string[] = []) => {
  const r = parseScript(text, 'screenplay', undefined, { context: { rejectedNames } });
  return { r, warnings: checkCharacters(r.lines, r.scenes, { rejectedNames }) };
};
const rules = (w: { rule: string }[]) => w.map((x) => x.rule);

const PIER = `INT. FERRY - NIGHT

MAYA (30s) stands at the rail. LUIS (40s) lights a cigarette.

MAYA
Do you remember the harbour?

LUIS
Every winter.

MAYA
Then you remember the key.

LUIS
I lost it years ago.

EXT. DOCK - DAWN

MAYA and LUIS walk off.

MAYA
It is cold.

LUIS
It always is.

MAYA
Come on.

LUIS
I am coming.

DOCK WORKER
Hey!

INT. OFFICE - DAY

MAYAH
Where is everyone?

LUIS
Gone.

MAYAH
Fine.
`;

describe('consistency warnings', () => {
  it('flags a rare name one letter from a common one that never shares its scene', () => {
    const { warnings } = run(PIER);
    const w = warnings.find((x) => x.rule === 'spelling');
    expect(w).toBeTruthy();
    expect(w!.id).toBe('spelling:MAYA|MAYAH');
    expect(w!.characters).toEqual(['MAYA', 'MAYAH']);
    expect(w!.message).toMatch(/one character spelled two ways/);
    expect(w!.reason).toMatch(/never shares a scene/);
    expect(w!.line).toBeGreaterThan(20);
  });

  it('does not call V.O. and CONT’D extensions misspellings', () => {
    const { warnings } = run(`INT. ROOM - DAY

MAYA
Hello.

MAYA (V.O.)
I remember.

MAYA (CONT'D)
Still here.

LUIS
Yes.

LUIS (O.S.)
Coming.

MAYA
Good.
`);
    expect(warnings.filter((w) => w.rule === 'spelling')).toEqual([]);
  });

  it('flags the same letters spelled with different case, spacing or punctuation', () => {
    const lines = [
      { id: '1', index: 0, text: 'DR. SMITH', type: 'character', confidence: 1 },
      { id: '2', index: 1, text: 'Hi.', type: 'dialogue', confidence: 1 },
      { id: '3', index: 2, text: 'DR SMITH', type: 'character', confidence: 1 },
      { id: '4', index: 3, text: 'Hi again.', type: 'dialogue', confidence: 1 },
    ] as never;
    const w = checkCharacters(lines, []);
    expect(w.find((x) => x.rule === 'spelling')?.reason).toMatch(/same letters/);
  });

  it('never flags a name the project has said is not a character', () => {
    const lines = [
      { id: '1', index: 0, text: 'MAYA', type: 'character', confidence: 1 }, { id: '2', index: 1, text: 'a', type: 'dialogue', confidence: 1 },
      { id: '3', index: 2, text: 'MAYA', type: 'character', confidence: 1 }, { id: '4', index: 3, text: 'b', type: 'dialogue', confidence: 1 },
      { id: '5', index: 4, text: 'MAYAH', type: 'character', confidence: 1 }, { id: '6', index: 5, text: 'c', type: 'dialogue', confidence: 1 },
    ] as never;
    expect(rules(checkCharacters(lines, []))).toContain('spelling');
    expect(checkCharacters(lines, [], { rejectedNames: ['mayah'] })).toEqual([]);
  });

  it('two real characters one letter apart who share a scene are left alone', () => {
    const { warnings } = run(`INT. ROOM - DAY

MARK
Hi.

MARY
Hi.

MARK
Bye.

MARY
Bye.
`);
    expect(warnings.filter((w) => w.rule === 'spelling')).toEqual([]);
  });

  it('flags a character with exactly one line, once, and not one with two', () => {
    const { warnings } = run(PIER);
    const one = warnings.filter((w) => w.rule === 'single-line').map((w) => w.characters[0]);
    expect(one).toContain('DOCK WORKER');
    expect(one).not.toContain('LUIS');
    expect(warningsFor(warnings, 'dock worker')).toHaveLength(1);
  });

  it('flags a speaker named in capitals in the action only after they spoke', () => {
    const { warnings } = run(`INT. KITCHEN - DAY

TOM
Where is the coffee?

LUIS
Gone.

TOM
Typical.

LUIS
Always.

Later, TOM (50s) sits down heavily.
`);
    const w = warnings.find((x) => x.rule === 'speaks-before-intro');
    expect(w?.characters).toEqual(['TOM']);
    expect(w?.reason).toMatch(/first line is at line 3/);
  });

  it('does not flag a speaker introduced before they speak', () => {
    const { warnings } = run(`INT. KITCHEN - DAY

TOM (50s) sits down.

TOM
Coffee?

LUIS
Yes.
`);
    expect(rules(warnings)).not.toContain('speaks-before-intro');
  });

  it('flags a character who speaks after a clear death beat, with the line as the reason', () => {
    const { warnings } = run(`INT. HALL - NIGHT

MAYA (30s) faces LUIS.

LUIS
Stop.

MAYA
No.

A shot rings out. LUIS dies on the floor.

INT. HALL - LATER

MAYA kneels.

LUIS
I am fine.

MAYA
Liar.
`);
    const w = warnings.find((x) => x.rule === 'speaks-after-death');
    expect(w?.characters).toEqual(['LUIS']);
    expect(w?.severity).toBe('warn');
    expect(w?.reason).toMatch(/LUIS dies on the floor/);
  });

  it('is conservative about death: doubt words, voice-over and flashbacks do not trigger it', () => {
    const doubt = run(`INT. HALL - NIGHT

LUIS
Stop.

MAYA
No.

LUIS almost dies on the stairs.

LUIS
Close one.

MAYA
Yes.
`);
    expect(rules(doubt.warnings)).not.toContain('speaks-after-death');
    const vo = run(`INT. HALL - NIGHT

LUIS
Stop.

MAYA
No.

LUIS dies on the floor.

INT. HALL - LATER

LUIS (V.O.)
Remember me.

MAYA
Always.
`);
    expect(rules(vo.warnings)).not.toContain('speaks-after-death');
    const flash = run(`INT. HALL - NIGHT

LUIS
Stop.

MAYA
No.

LUIS dies on the floor.

INT. HALL - FLASHBACK

LUIS
Hello.

MAYA
Hi.
`);
    expect(rules(flash.warnings)).not.toContain('speaks-after-death');
    const bystander = run(`INT. HALL - NIGHT

LUIS
Stop.

MAYA
No.

MAYA hears that LUIS is dead.

MAYA
Oh.

LUIS
Hello.
`);
    expect(bystander.warnings.find((x) => x.rule === 'speaks-after-death')?.characters).toEqual(['LUIS']);
  });

  it('flags a person introduced with an age who never speaks, but not one who does', () => {
    const { warnings } = run(`INT. SHOP - DAY

MAYA (30s) buys bread. A BAKER (60s) nods. OLD TOM (80s) sleeps in the corner.

MAYA
Thanks.

TOM
Hm.
`);
    const w = warnings.filter((x) => x.rule === 'never-speaks').map((x) => x.characters[0]);
    expect(w).not.toContain('MAYA');
    expect(w).not.toContain('OLD TOM');
  });

  it('names a silent character with an age', () => {
    const { warnings } = run(`INT. SHOP - DAY

MAYA (30s) buys bread. ODILE (60s) watches from the door.

MAYA
Thanks.

LUIS
Welcome.

MAYA
Bye.
`);
    const w = warnings.find((x) => x.rule === 'never-speaks');
    expect(w?.characters).toEqual(['ODILE']);
    expect(w?.id).toBe('never-speaks:ODILE');
  });

  it('gives every warning a stable id, a sentence, a reason and a place', () => {
    const { warnings } = run(PIER);
    expect(warnings.length).toBeGreaterThan(0);
    for (const w of warnings) {
      expect(w.id).toMatch(/^[a-z-]+:/);
      expect(w.message.length).toBeGreaterThan(10);
      expect(w.reason.length).toBeGreaterThan(10);
      expect(Number.isInteger(w.line)).toBe(true);
    }
    expect(new Set(warnings.map((w) => w.id)).size).toBe(warnings.length);
    expect(run(PIER).warnings.map((w) => w.id)).toEqual(warnings.map((w) => w.id));
  });

  it('has small helpers that behave', () => {
    expect(editDistance('MAYA', 'MAYAH')).toBe(1);
    expect(editDistance('abc', 'abc')).toBe(0);
    expect(nameKey("DR. O'NEIL")).toBe('DRONEIL');
    expect(cueName({ id: 'x', index: 0, text: "MAYA (CONT'D)", type: 'character', confidence: 1 })).toBe('MAYA');
  });
});

describe('the relationship map', () => {
  it('weights who answers whom and who shares scenes, strongest first', () => {
    const { r } = run(PIER);
    const pairs = relationships(r.lines, r.scenes);
    expect(pairs[0]).toMatchObject({ a: 'LUIS', b: 'MAYA' });
    expect(pairs[0].turns).toBe(6);
    expect(pairs[0].scenes).toBe(2);
    expect(pairs[0].strength).toBe(pairs[0].turns * 2 + pairs[0].scenes);
    for (let i = 1; i < pairs.length; i++) expect(pairs[i - 1].strength).toBeGreaterThanOrEqual(pairs[i].strength);
  });

  it('does not connect people across a scene change, and obeys rejected names', () => {
    const { r } = run(`INT. A - DAY

MAYA
Hi.

INT. B - DAY

LUIS
Hi.
`);
    expect(relationships(r.lines, r.scenes)).toEqual([]);
    const both = run(PIER).r;
    expect(relationships(both.lines, both.scenes, { rejectedNames: ['luis'] }).every((p) => p.a !== 'LUIS' && p.b !== 'LUIS')).toBe(true);
  });

  it('lists who a character talks to most and the top characters of the web', () => {
    const { r } = run(PIER);
    const pairs = relationships(r.lines, r.scenes);
    expect(talksToMost(pairs, 'maya', 2)[0].name).toBe('LUIS');
    expect(topCharacters(pairs, 2)).toEqual(expect.arrayContaining(['MAYA', 'LUIS']));
    expect(topCharacters([], 5)).toEqual([]);
  });
});
