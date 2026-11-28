import { describe, expect, it } from 'vitest';
import { parseScript, type ParseContext } from './parser';
import { contextFromProject, contextKey } from './context';
import { doubtfulReads, suiteNote } from './review';
import { hasSuiteUse, priorKey, suitePriorsFromRows, suiteUse, withSuitePriors, type SuiteRows } from './suite-priors';
import { readPreviousDraft } from './reading-context';

// The suite's context as priors (the rung after B7). What a person put into the suite (the character bible, the breakdown,
// casting) is evidence the reader weighs; what the reader wrote itself is not; a person's own word about a name or a line
// always stands above it; and none of it moves where a scene begins.

const read = (text: string, context?: ParseContext) => parseScript(text, 'screenplay', undefined, context ? { context } : undefined);
const ctx = (rows: SuiteRows, castings: Array<{ character_name: string }> = [], corrections: Array<{ kind: string; name: string }> = []) =>
  withSuitePriors(contextFromProject(castings, corrections), suitePriorsFromRows(rows));
const prop = (name: string, label = 'Props', key = 'props') => ({ name, category_key: key, category_label: label });

// An insert on an object, the line under it in the same block, then a speech: the shape the priors are for.
const OBJECT_BEAT = ['INT. MOTEL ROOM - NIGHT', '', 'Maya enters, dripping.', '', 'THE BRIEFCASE', 'It sits open on the bed, empty.', '', 'MAYA', 'Where is it?', ''].join('\n');

describe('which rows are evidence', () => {
  it('a bible entry counts only when a person wrote something in it or gave it a look-board', () => {
    const p = suitePriorsFromRows({
      bible: [
        { id: 'a', name: 'MAYA', description: 'A night nurse.' },
        { id: 'b', name: 'LEO' }, // the editor saves an empty entry for every name it reads: not evidence
        { id: 'c', name: 'IVY', description: '   ' },
        { id: 'd', name: 'NORA' }, // empty, but a look-board: a person put images on it
      ],
      lookBoards: [{ character_id: 'd' }],
    });
    expect(p.people.map((x) => x.name)).toEqual(['MAYA', 'NORA']);
    expect(p.people.every((x) => x.source === 'bible')).toBe(true);
  });

  it('a full name in the bible is an alias the reader believes, tied to its cue name', () => {
    const p = suitePriorsFromRows({ bible: [{ name: 'MAYA', full_name: 'Maya Ortiz' }, { name: 'LEO', full_name: 'Leo' }, { name: 'IVY', full_name: 'Ivy, called "the kid" by everyone in the harbour town' }] });
    expect(p.people).toContainEqual({ name: 'MAYA ORTIZ', source: 'bible', aliasOf: 'MAYA' });
    expect(p.people.filter((x) => x.aliasOf)).toHaveLength(1); // a full name equal to the name, or not name-shaped, is no alias
  });

  it('breakdown Cast is a character, object categories are things, extras, stunts and custom categories say nothing', () => {
    const p = suitePriorsFromRows({ elements: [prop('Maya', 'Cast', 'cast'), prop('Revolver'), prop('Trench coat', 'Wardrobe', 'wardrobe'), prop('Cop #2', 'Extras', 'extras'), prop('Fall man', 'Stunts', 'stunts'), prop('Odd thing', 'Mine', 'my-category'), prop('Taxi', 'Vehicles & animals', 'vehicles')] });
    expect(p.people).toEqual([{ name: 'MAYA', source: 'breakdown' }]);
    expect(p.things).toEqual([{ name: 'REVOLVER', category: 'Props' }, { name: 'TAXI', category: 'Vehicles & animals' }, { name: 'TRENCH COAT', category: 'Wardrobe' }]);
  });

  it('a role with casting candidates is a character', () => {
    expect(suitePriorsFromRows({ candidates: [{ character_name: 'Abuela' }, { character_name: 'ABUELA' }] }).people).toEqual([{ name: 'ABUELA', source: 'casting' }]);
  });

  it('is deterministic: the same rows in any order give the same priors and the same key', () => {
    const rows: SuiteRows = { elements: [prop('Revolver'), prop('Maya', 'Cast', 'cast'), prop('Letter')], candidates: [{ character_name: 'Leo' }] };
    const a = suitePriorsFromRows(rows);
    const b = suitePriorsFromRows({ elements: [...rows.elements!].reverse(), candidates: rows.candidates });
    expect(a).toEqual(b);
    expect(contextKey(withSuitePriors({}, a))).toBe(contextKey(withSuitePriors({}, b)));
    expect(contextKey(withSuitePriors({}, a))).not.toBe(contextKey({}));
  });

  it('names compare without case, spacing or an extension', () => {
    expect(priorKey('  maya  (V.O.) ')).toBe('MAYA');
    expect(priorKey('Mary  Ann')).toBe('MARY ANN');
  });
});

describe('a person’s word stands above the suite', () => {
  it('a name someone said is not a character is never made a cue by the bible, the breakdown or casting, and is listed as overruled', () => {
    const c = ctx({ bible: [{ name: 'NARRATOR', notes: 'The voice.' }], elements: [prop('Narrator', 'Cast', 'cast')], candidates: [{ character_name: 'Narrator' }] }, [], [{ kind: 'not_character', name: 'NARRATOR' }]);
    expect(c.characters).not.toContain('NARRATOR');
    expect(c.suite!.people.map((p) => p.name)).not.toContain('NARRATOR');
    expect(c.suite!.overruled.map((o) => `${o.name}:${o.said}:${o.because}`)).toEqual(['NARRATOR:bible:not_character', 'NARRATOR:breakdown:not_character', 'NARRATOR:casting:not_character']);
    const r = read(['INT. ROOM - DAY', '', 'NARRATOR', 'Once, there was a harbour.', ''].join('\n'), c);
    expect(r.lines[2].type).not.toBe('character');
    expect(r.characters.map((x) => x.name)).not.toContain('NARRATOR');
  });

  it('a rejected cue name takes its bible full name with it', () => {
    const c = ctx({ bible: [{ name: 'GHOST', full_name: 'Ghost Of Christmas' }] }, [], [{ kind: 'not_character', name: 'GHOST' }]);
    expect(c.suite!.people).toEqual([]);
    expect(c.suite!.overruled.map((o) => o.name)).toEqual(['GHOST', 'GHOST OF CHRISTMAS']);
  });

  it('a name someone cast or confirmed is never held back as a thing, even when the breakdown lists it as a prop', () => {
    const cast = ctx({ elements: [prop('Briefcase')] }, [{ character_name: 'Briefcase' }]);
    expect(cast.suite!.things).toEqual([]);
    expect(cast.suite!.overruled).toEqual([{ name: 'BRIEFCASE', said: 'thing', because: 'character' }]);
    const confirmed = ctx({ elements: [prop('Briefcase')] }, [], [{ kind: 'character', name: 'THE BRIEFCASE' }]);
    expect(confirmed.suite!.things.map((t) => t.name)).toEqual(['BRIEFCASE']); // a different name: "THE BRIEFCASE" was confirmed
    const r = read(OBJECT_BEAT, confirmed);
    expect(r.lines[4].type).toBe('character'); // the confirmed name is believed; the thing prior does not touch it
  });

  it('the parser keeps the same order on its own, for a context built without withSuitePriors', () => {
    const raw: ParseContext = { rejectedNames: ['MAYA'], suite: { people: [{ name: 'MAYA', source: 'bible' }], things: [{ name: 'LEO', category: 'Props' }], overruled: [] }, characters: ['LEO'] };
    const r = read(['INT. ROOM - DAY', '', 'MAYA', 'Hello.', '', 'LEO', 'Hi.', ''].join('\n'), raw);
    expect(r.lines[2].type).not.toBe('character');
    expect(r.lines[5].type).toBe('character');
    expect(r.lines[5].reasoning).not.toMatch(/breakdown lists/);
  });

  it('a line override is fixed before any prior is weighed', () => {
    const c = { ...ctx({ elements: [prop('Briefcase')] }), lineOverrides: [{ line_index: 4, forced_type: 'character', line_text: 'THE BRIEFCASE' }] };
    const r = read(OBJECT_BEAT, c);
    expect(r.lines[4].type).toBe('character');
    expect(r.lines[4].confidence).toBe(100);
    expect(r.lines[4].meta?.suite).toBeUndefined(); // the person's line is theirs: no prior is even explained on it
  });
});

describe('what the priors do to a reading, and how it explains itself', () => {
  it('an object the breakdown names, on a line of its own, is not read as a speaker, and the line under it is not speech', () => {
    const alone = read(OBJECT_BEAT);
    expect(alone.lines[4].type).toBe('character'); // the trap, without the suite
    const r = read(OBJECT_BEAT, ctx({ elements: [prop('Briefcase')] }));
    expect(r.lines[4].type).toBe('action');
    expect(r.lines[5].type).toBe('action');
    expect(r.lines[4].reasoning).toMatch(/The breakdown lists BRIEFCASE as Props: not read as a speaker/);
    expect(r.lines[4].meta?.suite).toEqual({ name: 'BRIEFCASE', effect: 'against', said: ['Props'] });
    expect(r.characters.map((c) => c.name)).toEqual(['MAYA']);
    expect(r.scenes.length).toBe(alone.scenes.length);
  });

  it('a cue whose name the suite knows says where from, and is not a guess even when it speaks once', () => {
    const text = ['INT. ROOM - DAY', '', 'ABUELA', 'Ven aquí.', '', 'Maya waits.', ''].join('\n');
    expect(read(text).lines[2].reasoning).toMatch(/Seen speaking only once/);
    const r = read(text, ctx({ bible: [{ name: 'Abuela', backstory: 'Raised the girls.' }], candidates: [{ character_name: 'Abuela' }] }));
    expect(r.lines[2].type).toBe('character');
    expect(r.lines[2].reasoning).toMatch(/Known to the project: in the character bible, in casting \(a role with candidates\)/);
    expect(r.lines[2].reasoning).not.toMatch(/Seen speaking only once/);
    expect(r.lines[2].meta?.suite).toMatchObject({ name: 'ABUELA', effect: 'for' });
  });

  it('a bible full name is believed as a cue and the reasoning says whose it is', () => {
    const text = ['INT. ROOM - DAY', '', 'MAYA ORTIZ', 'Present.', ''].join('\n');
    const r = read(text, ctx({ bible: [{ name: 'MAYA', full_name: 'Maya Ortiz' }] }));
    expect(r.lines[2].type).toBe('character');
    expect(r.lines[2].reasoning).toMatch(/in the character bible \(the full name of MAYA\)/);
  });

  it('a thing the script keeps making speak is read as a speaker after all, capped and offered back, so a person settles it', () => {
    const lines = ['INT. LAB - NIGHT', ''];
    for (let i = 0; i < 3; i++) lines.push('ROBOT', `Beep number ${i + 1}.`, '', 'Maya nods.', '');
    const c = ctx({ elements: [prop('Robot')] });
    const r = read(lines.join('\n'), c);
    const cues = r.lines.filter((l) => l.text === 'ROBOT');
    expect(cues.every((l) => l.type === 'character')).toBe(true);
    expect(cues[0].reasoning).toMatch(/The breakdown lists ROBOT as Props, but the script has it speak 3 times/);
    expect(cues.every((l) => l.confidence <= 70)).toBe(true);
    expect(cues[0].meta?.suite).toMatchObject({ effect: 'disagrees' });
    const d = doubtfulReads(r.lines);
    expect(d.find((x) => x.name === 'ROBOT')?.why).toMatch(/the breakdown lists it as Props/);
    // One that speaks twice is held back instead (the prior wins below the threshold), and the review can still offer it.
    const twice = read(lines.slice(0, 2 + 5 * 2).join('\n'), c);
    expect(twice.lines.filter((l) => l.text === 'ROBOT').every((l) => l.type !== 'character')).toBe(true);
  });

  it('a held-back line names the thing in the review when the reader is unsure of it', () => {
    expect(suiteNote('Decoded as action; The breakdown lists BRIEFCASE as Props: not read as a speaker')).toBe('the breakdown lists it as Props');
    expect(suiteNote('Decoded as character; Known to the project: in the cast')).toBe('the project has it in the cast');
    expect(suiteNote('Decoded as action')).toBe('');
  });

  it('never changes a scene heading or where scenes begin, and a sentence that names a thing stays a sentence', () => {
    const text = ['INT. GARAGE - NIGHT', '', 'TAXI', 'It idles at the kerb.', '', 'EXT. TAXI RANK - DAY', '', 'The taxi waits.', '', 'MAYA', 'Taxi!', ''].join('\n');
    const alone = read(text);
    const r = read(text, ctx({ elements: [prop('Taxi', 'Vehicles & animals', 'vehicles'), prop('Taxi rank', 'Set dressing', 'set-dressing')] }));
    expect(r.scenes.map((s) => s.heading)).toEqual(alone.scenes.map((s) => s.heading));
    expect(r.lines.filter((l) => l.type === 'slug').map((l) => l.index)).toEqual(alone.lines.filter((l) => l.type === 'slug').map((l) => l.index));
    expect(r.lines[7].type).toBe(alone.lines[7].type);
    expect(r.lines[10].type).toBe('dialogue'); // shouted speech with a full stop is speech, whatever it names
    expect(r.lines[10].meta?.suite).toBeUndefined();
  });

  it('without a suite the reading is exactly what it was', () => {
    const plain = read(OBJECT_BEAT);
    const empty = read(OBJECT_BEAT, withSuitePriors({}, suitePriorsFromRows({})));
    expect(empty.lines.map((l) => [l.type, l.confidence, l.reasoning])).toEqual(plain.lines.map((l) => [l.type, l.confidence, l.reasoning]));
  });

  it('is deterministic', () => {
    const c = ctx({ elements: [prop('Briefcase'), prop('Maya', 'Cast', 'cast')] });
    const strip = (r: ReturnType<typeof read>) => r.lines.map((l) => [l.type, l.confidence, l.reasoning, l.meta]);
    expect(strip(read(OBJECT_BEAT, c))).toEqual(strip(read(OBJECT_BEAT, c)));
  });

  it('the previous draft is read with the suite too, and cached apart from a reading without it', () => {
    const c = ctx({ elements: [prop('Briefcase')] });
    const withSuite = readPreviousDraft(OBJECT_BEAT, 'screenplay', c);
    const without = readPreviousDraft(OBJECT_BEAT, 'screenplay', {});
    expect(withSuite).not.toBe(without); // two cache entries: the context (suite included) is part of the key
    expect(withSuite.lines.some((l) => l.text.includes('BRIEFCASE') && l.type === 'character')).toBe(false);
    expect(readPreviousDraft(OBJECT_BEAT, 'screenplay', c)).toBe(withSuite); // and a second read of the same is the cached one
  });
});

describe('what the panel is told (suiteUse)', () => {
  it('counts the names vouched for, the lines held back, the disagreements and what was overruled', () => {
    const lines = ['INT. LAB - NIGHT', '', 'THE BRIEFCASE', 'It sits open.', '', 'MAYA', 'Hello.', '', 'MAYA', 'Again.', ''];
    for (let i = 0; i < 3; i++) lines.push('ROBOT', `Beep ${i}.`, '');
    const c = ctx({ elements: [prop('Briefcase'), prop('Robot'), prop('Narrator', 'Cast', 'cast')], bible: [{ name: 'MAYA', description: 'Lead.' }] }, [], [{ kind: 'not_character', name: 'NARRATOR' }]);
    const u = suiteUse(read(lines.join('\n'), c).lines, c.suite);
    expect(u.vouched).toEqual([{ name: 'MAYA', said: ['in the character bible'], cues: 2 }]);
    expect(u.heldBack).toEqual([{ name: 'BRIEFCASE', category: 'Props', lines: 1 }]);
    expect(u.disagreements).toEqual([{ name: 'ROBOT', category: 'Props', cues: 3 }]);
    expect(u.overruled).toEqual([{ name: 'NARRATOR', said: 'breakdown', because: 'not_character' }]);
    expect(u.told).toEqual({ people: 1, things: 2 });
    expect(hasSuiteUse(u)).toBe(true);
    expect(hasSuiteUse(suiteUse(read('INT. ROOM - DAY').lines, undefined))).toBe(false);
  });
});
