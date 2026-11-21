import { describe, expect, it } from 'vitest';
import { parseScript, type ParseContext } from './parser';
import { alignPreviousDraft, lineSimilarity, previousDraftFromReading, previousDraftUse, type PreviousDraft } from './previous-draft';
import { doubtfulReads } from './review';
import { generateScript, REAL_WORLD } from './corpus/generate';
import { renderText } from './corpus/render';
import { earlierDraft } from './corpus/previous';

const draft = (rows: Array<[string, PreviousDraft['lines'][number]['type']]>): PreviousDraft => ({ lines: rows.map(([text, type]) => ({ text, type })) });

describe('aligning the later draft with the earlier one', () => {
  const earlier = draft([['INT. ROOM - DAY', 'slug'], ['MAYA', 'character'], ['We should go.', 'dialogue'], ['She waits by the door.', 'action'], ['LEO', 'character'], ['Yes.', 'dialogue'], ['MAYA', 'character'], ['Yes.', 'dialogue']]);

  it('an identical line gets the type it had, wherever it moved to', () => {
    const now = ['A new first line nobody had.', '', 'INT. ROOM - DAY', 'MAYA', 'We should go.', 'She waits by the door.'];
    const at = alignPreviousDraft(now, earlier);
    expect(at).toEqual([undefined, undefined, 'slug', 'character', 'dialogue', 'action']);
  });

  it('is not fooled by blank lines or by spacing', () => {
    expect(alignPreviousDraft(['', '  She   waits by the door.  ', ''], earlier)).toEqual([undefined, 'action', undefined]);
  });

  it('a line that repeats pairs with its own counterpart, in order', () => {
    const e = draft([['MAYA', 'character'], ['Yes.', 'dialogue'], ['LEO', 'character'], ['Yes.', 'action']]);
    expect(alignPreviousDraft(['MAYA', 'Yes.', 'LEO', 'Yes.'], e)).toEqual(['character', 'dialogue', 'character', 'action']);
  });

  it('a lightly edited line still carries its type; a rewritten one does not', () => {
    const at = alignPreviousDraft(['She waits by the door, then leaves.', 'Nothing alike at all, entirely new wording here.'], draft([['She waits by the door.', 'action'], ['The sea is calm tonight.', 'action']]));
    expect(at[0]).toBe('action');
    expect(at[1]).toBeUndefined();
  });

  it('no earlier draft, or an empty one, says nothing', () => {
    expect(alignPreviousDraft(['A', 'B'], undefined)).toEqual([undefined, undefined]);
    expect(alignPreviousDraft(['A', 'B'], { lines: [] })).toEqual([undefined, undefined]);
  });

  it('measures how alike two lines are by their words', () => {
    expect(lineSimilarity('She waits by the door.', 'She waits by the door, then leaves.')).toBeGreaterThan(0.7);
    expect(lineSimilarity('She waits by the door.', 'The sea is calm tonight.')).toBeLessThan(0.3);
  });

  it('a seeded later draft finds the great majority of its lines in the earlier one, with the right type', () => {
    const later = generateScript(1000, REAL_WORLD);
    const earlierEls = earlierDraft(later, 1000);
    const { truth } = renderText(later);
    const rows = earlierEls.map((e) => [e.text, e.type] as [string, PreviousDraft['lines'][number]['type']]);
    const at = alignPreviousDraft(truth.map((t) => t.text), draft(rows));
    const known = truth.map((t, i) => ({ t, p: at[i] })).filter((x) => x.t.type !== 'empty' && x.p);
    expect(known.length / truth.filter((t) => t.type !== 'empty').length).toBeGreaterThan(0.8);
    expect(known.filter((x) => x.p === x.t.type).length / known.length).toBeGreaterThan(0.97);
  });
});

describe('what of the earlier reading carries over', () => {
  it('only the types the decoder chooses between, and only lines the reading was sure of', () => {
    const d = previousDraftFromReading([
      { text: 'INT. A - DAY', type: 'slug', confidence: 100 },
      { text: 'Title: x', type: 'title', confidence: 100 },
      { text: 'a guess', type: 'dialogue', confidence: 70 },
      { text: 'sure', type: 'action', confidence: 95 },
      { text: 'settled by a person', type: 'action' },
      { text: '', type: 'empty', confidence: 100 },
    ]);
    expect(d.lines.map((l) => l.text)).toEqual(['INT. A - DAY', 'sure', 'settled by a person']);
  });
});

// A script pasted with no blank lines: after a speech, a plain sentence is as likely more speech as it is action.
const TIGHT = [
  'INT. KITCHEN - DAY', 'MAYA', 'We should go.', 'She waits by the door.', 'LEO', 'Not yet.', 'He pours more coffee.', 'MAYA', 'Now.', 'She checks the window.',
  'LEO', 'Fine.', 'The kettle clicks off.', 'MAYA', 'Come on.', 'He follows her out.', 'INT. HALL - NIGHT', 'LEO', 'Quiet.', 'Their steps echo.',
].join('\n');
const EARLIER = draft([['She waits by the door.', 'action'], ['He pours more coffee.', 'action'], ['She checks the window.', 'action'], ['The kettle clicks off.', 'action'], ['He follows her out.', 'action'], ['Their steps echo.', 'action']]);
const read = (src: string, context?: ParseContext) => parseScript(src, 'screenplay', undefined, { context });
const typeOf = (r: ReturnType<typeof read>, text: string) => r.lines.find((l) => l.text === text)!.type;

describe('the previous draft in the reading', () => {
  it('turns an ambiguous line into what the earlier draft read it as', () => {
    const without = read(TIGHT);
    expect(typeOf(without, 'She waits by the door.')).toBe('dialogue'); // the honest limit this rung addresses
    const withDraft = read(TIGHT, { previousDraft: EARLIER });
    for (const text of EARLIER.lines.map((l) => l.text)) expect(typeOf(withDraft, text)).toBe('action');
  });

  it('says why: the reading carries "Same as in the previous draft", and a doubt shows it', () => {
    const r = read(TIGHT, { previousDraft: EARLIER });
    const line = r.lines.find((l) => l.text === 'She waits by the door.')!;
    expect(line.reasoning).toMatch(/Same as in the previous draft \(action\)/);
    expect((line.meta as { fromPreviousDraft?: string }).fromPreviousDraft).toBe('action');
    expect(line.confidence).toBeGreaterThanOrEqual(80);
    expect(previousDraftUse(r.lines)).toEqual({ same: 6, differs: 0 });
  });

  it('a doubtful line says what the previous draft made of it, in the explanation a person reads', () => {
    // A cue that speaks once is doubtful by itself; the previous draft agreeing is part of why.
    const src = 'INT. ROOM - DAY\nMAYA\nHi.\nLEO\nHello.\nMAYA\nBye.\nLEO\nOk.\nDARKNESS\nMaya waits.\nMAYA\nGo.\nLEO\nNo.';
    const alone = doubtfulReads(read(src).lines);
    expect(alone.find((d) => d.name === 'DARKNESS')?.why).not.toMatch(/previous draft/);
    const e = draft([['DARKNESS', 'character'], ['Maya waits.', 'dialogue']]);
    const d = doubtfulReads(read(src, { previousDraft: e }).lines).find((x) => x.name === 'DARKNESS');
    expect(d?.why).toMatch(/same as in the previous draft/);
    // And when it read the line as something else, the doubt says that instead.
    const other = draft([['DARKNESS', 'action']]);
    const o = doubtfulReads(read(src, { previousDraft: other }).lines).find((x) => x.name === 'DARKNESS');
    expect(o?.why).toMatch(/the previous draft read it as action/);
  });

  it('never overrides a person: a forced line type wins over the previous draft', () => {
    const forced = read(TIGHT, { previousDraft: EARLIER, lineOverrides: [{ line_index: 3, forced_type: 'dialogue', line_text: 'She waits by the door.' }] });
    expect(typeOf(forced, 'She waits by the door.')).toBe('dialogue');
    expect(forced.lines[3].confidence).toBe(100);
    expect(forced.lines[3].reasoning).not.toMatch(/Same as in the previous draft/);
  });

  it('never overrides what a line plainly is: a clear cue, a transition, a heading', () => {
    const src = 'INT. ROOM - DAY\nMAYA\nStop.\nLEO\nNo.\nMAYA (V.O.)\nIt began here.\nCUT TO:\nINT. HALL - NIGHT\nLEO\nQuiet.';
    const wrong = draft([['MAYA', 'dialogue'], ['LEO', 'action'], ['MAYA (V.O.)', 'action'], ['CUT TO:', 'dialogue'], ['INT. HALL - NIGHT', 'action'], ['INT. ROOM - DAY', 'action']]);
    const a = read(src);
    const b = read(src, { previousDraft: wrong });
    expect(b.lines.map((l) => l.type)).toEqual(a.lines.map((l) => l.type));
    expect(b.scenes.map((s) => s.heading)).toEqual(a.scenes.map((s) => s.heading));
  });

  it('never changes where scenes begin, whatever the earlier draft made of the headings', () => {
    const src = 'INT. ROOM - DAY\n\nMAYA\nHi.\n\nEXT. PIER - DAY\n\nText.\n';
    for (const type of ['action', 'dialogue', 'character', 'transition'] as const) {
      const r = read(src, { previousDraft: draft([['INT. ROOM - DAY', type], ['EXT. PIER - DAY', type]]) });
      expect(r.scenes.map((s) => s.heading)).toEqual(read(src).scenes.map((s) => s.heading));
    }
  });

  it('a name a person rejected stays rejected, however the earlier draft read it', () => {
    const src = 'INT. ROOM - DAY\nMAYA\nHi.\nDARKNESS\nMaya waits.\nMAYA\nBye.';
    const r = read(src, { rejectedNames: ['DARKNESS'], previousDraft: draft([['DARKNESS', 'character']]) });
    expect(typeOf(r, 'DARKNESS')).not.toBe('character');
  });

  it('with no earlier draft the reading is exactly what it was', () => {
    expect(read(TIGHT, { previousDraft: undefined }).lines.map((l) => [l.type, l.confidence, l.reasoning])).toEqual(read(TIGHT).lines.map((l) => [l.type, l.confidence, l.reasoning]));
    expect(read(TIGHT, { previousDraft: { lines: [] } }).lines.map((l) => l.type)).toEqual(read(TIGHT).lines.map((l) => l.type));
  });
});

describe('the places the project knows', () => {
  const src = 'INT. KITCHEN - DAY\n\nMAYA\nHi.\n\nHARBOR - NIGHT\n\nGulls cry.\n\nINT. LAMP ROOM - NIGHT\n\nLEO\nHello.\n';

  it('a heading in a known place is at least as sure, and says so', () => {
    const r = read(src, { places: ['Kitchen'] });
    const h = r.lines[0];
    expect(h.type).toBe('slug');
    expect(h.confidence).toBeGreaterThanOrEqual(97);
    expect(h.reasoning).toMatch(/Known place: KITCHEN/);
    expect(r.lines[r.lines.findIndex((l) => l.text.startsWith('INT. LAMP'))].reasoning).not.toMatch(/Known place/);
  });

  it('a place written without INT./EXT. is offered as a scene heading, not turned into one', () => {
    const r = read(src, { places: ['Harbor'] });
    const l = r.lines.find((x) => x.text === 'HARBOR - NIGHT')!;
    expect(l.type).not.toBe('slug');
    expect(l.confidence).toBeLessThanOrEqual(60);
    expect((l.meta as { alternative?: string }).alternative).toBe('slug');
    const d = doubtfulReads(r.lines).find((x) => x.text === 'HARBOR - NIGHT');
    expect(d?.alternative).toBe('slug');
    expect(d?.why).toMatch(/a place the project knows/);
    expect(r.scenes.map((s) => s.heading)).toEqual(read(src).scenes.map((s) => s.heading)); // never changes where scenes begin
  });

  it('is quiet about places it does not know and lines that merely mention one', () => {
    expect(doubtfulReads(read(src).lines).find((x) => x.text === 'HARBOR - NIGHT')?.why ?? '').not.toMatch(/a place the project knows/);
    const mention = read('INT. ROOM - DAY\n\nMAYA\nHi.\n\nThe harbor is quiet tonight.\n', { places: ['Harbor'] });
    expect(mention.lines.every((l) => !/Reads like a place/.test(l.reasoning ?? ''))).toBe(true);
  });
});

describe('what it costs', () => {
  it('aligning and re-reading a long script with a previous draft stays well inside the re-read budget', () => {
    const els = generateScript(5, { ...REAL_WORLD, scenes: 400 });
    const text = renderText(els).text;
    const earlier = previousDraftFromReading(parseScript(renderText(earlierDraft(els, 5)).text).lines);
    const lines = text.split('\n');
    expect(lines.length).toBeGreaterThan(5500); // about a hundred pages
    const t0 = performance.now();
    alignPreviousDraft(lines, earlier);
    const align = performance.now() - t0;
    const t1 = performance.now();
    parseScript(text);
    const plain = performance.now() - t1;
    const t2 = performance.now();
    parseScript(text, 'screenplay', undefined, { context: { previousDraft: earlier } });
    const withDraft = performance.now() - t2;
    expect(align).toBeLessThan(1500);
    expect(withDraft).toBeLessThan(plain * 2.5 + 400);
  });
});
