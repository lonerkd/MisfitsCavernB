// The suite's-context surface of the ratchet (the rung after B7: the suite as priors). A script is read with and without
// what the rest of the suite knows about its project (suite-priors.ts), and scored against its truth.
//
// The trap the priors are for: a writer sets an object on a line of its own in capitals, the way an insert or a beat on a
// prop is often written ("THE LETTER" over a line of action). With a blank line under it nothing mistakes it; pasted with
// no blank lines (the surface where the reader has least to go on) it has a cue's shape exactly: a short line in capitals
// with a sentence under it. Here a seeded share of action beats is such a line, the production's breakdown names the
// object, and the reader is measured on what it makes of them, on everything else (which must not get worse), on the cast
// and on the scenes (which must not move).
//
//   none     no suite context (the reading already measured elsewhere)
//   people   the suite knows the cast (a character bible or the breakdown's Cast): believed like a casting
//   things   the suite knows the objects (breakdown props, wardrobe, vehicles ...)
//   both     both
//   wrong    the breakdown also lists one of the speaking characters as a prop (a person's mistake in the suite): the
//            script's own evidence must still win where it is strong, and a person's "is a character" must win outright

import { parseScript } from '../parser';
import { contextFromProject } from '../context';
import { suitePriorsFromRows, withSuitePriors, type SuiteRows } from '../suite-priors';
import { generateScript, rng, type Element, type Style } from './generate';
import { renderText, type TruthLine } from './render';
import { pool, scoreLines, structureScore, type Score } from './score';
import { SEEDS } from './run';

export type SuiteKind = 'none' | 'people' | 'things' | 'both' | 'wrong' | 'wrong-confirmed';

const OBJECTS = ['BRIEFCASE', 'LETTER', 'REVOLVER', 'PHOTOGRAPH', 'MUSIC BOX', 'KEY', 'LANTERN', 'TAPE RECORDER'];
const UNDER = ['It sits open on the table, empty.', 'Someone has folded it twice.', 'Dust on everything but this.', 'It catches the light and holds it.'];

/** The seeded script with object beats: an object in capitals on a line of its own, a line of action under it. */
export function withObjectBeats(elements: Element[], seed: number): { elements: Element[]; objects: string[] } {
  const r = rng(seed * 13 + 5);
  const out: Element[] = [];
  const used = new Set<string>();
  for (const el of elements) {
    out.push(el);
    if (el.group === null && el.type === 'action' && r.chance(0.5)) {
      const obj = r.pick(OBJECTS);
      used.add(obj);
      out.push({ type: 'action', text: r.chance(0.5) ? `THE ${obj}` : obj, group: null });
      out.push({ type: 'action', text: r.pick(UNDER), group: null });
    }
  }
  return { elements: out, objects: [...used].sort() };
}

const bare = (cue: string) => cue.replace(/\s*\([^)]*\)\s*/g, '').trim().toUpperCase();

/** What the suite knows, as the database would hold it, for each kind. */
export function suiteRowsFor(kind: SuiteKind, cast: string[], objects: string[]): SuiteRows {
  const props = (names: string[]) => names.map((name) => ({ name: name.charAt(0) + name.slice(1).toLowerCase(), category_key: 'props', category_label: 'Props' }));
  if (kind === 'none') return {};
  if (kind === 'people') return { bible: cast.map((name) => ({ name, description: 'Written by a person.' })) };
  if (kind === 'things') return { elements: props(objects) };
  if (kind === 'both') return { bible: cast.map((name) => ({ name, description: 'Written by a person.' })), elements: props(objects) };
  // The breakdown wrongly lists the first speaking character as a prop.
  return { elements: [...props(objects), ...props(cast.slice(0, 1))] };
}

export interface SuiteResult {
  score: Score;
  sceneExact: number;
  castRecall: number;
  castInvented: number;
  /** Object beats read as a cue (each one also turns the line under it into dialogue). */
  objectCues: number;
  objectBeats: number;
  /** Lines read differently from the reading with no suite context, outside the object beats and the lines under them. */
  changedElsewhere: number;
  /** Lines the review would ask about (below 75). */
  doubts: number;
}

/** Read every seeded script, pasted without blank lines (`tight`) or as written, with the suite context of `kind`. */
export function measureSuite(style: Style, kind: SuiteKind, tight: boolean, seeds = SEEDS): SuiteResult {
  const scores: Score[] = [];
  const structure: ReturnType<typeof structureScore>[] = [];
  let objectCues = 0;
  let objectBeats = 0;
  let changedElsewhere = 0;
  let doubts = 0;
  for (const seed of seeds) {
    const { elements, objects } = withObjectBeats(generateScript(seed, style), seed);
    const { text, truth } = renderText(elements);
    const all = text.replace(/\n$/, '').split('\n');
    const keep = all.map((l) => !tight || l.trim() !== '');
    const read = all.filter((_, i) => keep[i]).join('\n');
    const t: TruthLine[] = truth.filter((_, i) => keep[i]);
    const cast = [...new Set(elements.filter((e) => e.type === 'character').map((e) => bare(e.text)))].sort();
    const rows = suiteRowsFor(kind === 'wrong-confirmed' ? 'wrong' : kind, cast, objects);
    // A person said the mis-listed name is a character: their word stands over the breakdown.
    const corrections = kind === 'wrong-confirmed' ? cast.slice(0, 1).map((name) => ({ kind: 'character', name })) : [];
    const context = withSuitePriors(contextFromProject([], corrections), suitePriorsFromRows(rows));
    const result = parseScript(read, 'screenplay', undefined, { context });
    const alone = parseScript(read, 'screenplay');
    scores.push(scoreLines(t, result.lines));
    structure.push(structureScore(truth, { scenes: result.scenes.length, cast: result.characters.map((c) => c.name) }));
    const objectLine = new Set(objects.flatMap((o) => [o, `THE ${o}`]));
    const near = new Set<number>();
    t.forEach((line, i) => {
      if (line.type === 'action' && objectLine.has(line.text)) {
        objectBeats++;
        if (result.lines[i]?.type === 'character') objectCues++;
        near.add(i); near.add(i + 1);
      }
    });
    result.lines.forEach((l, i) => { if (!near.has(i) && l.type !== alone.lines[i]?.type) changedElsewhere++; });
    doubts += result.lines.filter((l) => /Decoded as/.test(l.reasoning ?? '') && l.confidence < 75).length;
  }
  const n = structure.length;
  return {
    score: pool(scores),
    sceneExact: structure.filter((s) => s.sceneExact).length / n,
    castRecall: structure.reduce((s, x) => s + x.castRecall, 0) / n,
    castInvented: structure.reduce((s, x) => s + x.castInvented, 0) / n,
    objectCues, objectBeats, changedElsewhere, doubts,
  };
}
