// The previous-draft surface of the ratchet (B7b). A later draft is the seeded script; its EARLIER draft is derived from
// it with a seeded set of edits (lines reworded, speeches and action cut, new action lines added), so the two share most
// lines and differ in some, as real drafts do. The reader is then asked to read the later draft with and without the
// earlier one as evidence. The earlier draft's reading comes in three kinds, because what a person has settled differs:
//
//   same       the earlier draft was pasted the same way (no blank lines) and read by the engine alone: no new information
//              except the neighbourhood the earlier draft's lines were read in (the honest "does the prior hurt" check)
//   blanks     the earlier draft was kept in the usual form, blank lines and all, so the engine read it at its best
//              (macro-F1 about 0.99), and the later draft arrives with its blank lines gone (a re-paste, a text export)
//   corrected  the earlier draft's reading is what a person settled: every line right (the ceiling of what a corrected
//              previous draft can give; line overrides are how a person gets there)

import { parseScript, type ParseOptions } from '../parser';
import { previousDraftFromReading, type PreviousDraft } from '../previous-draft';
import { generateScript, rng, type Element, type Style } from './generate';
import { renderText, type TruthLine } from './render';
import { pool, scoreLines, structureScore, type Score } from './score';
import { SEEDS, type Result } from './run';

export type EarlierKind = 'none' | 'same' | 'blanks' | 'corrected';

const NEW_ACTION = ['The kettle clicks off.', 'Someone laughs in the next room.', 'A phone buzzes on the table.', 'The floor creaks.', 'She looks away.'];

/** The earlier draft of a script: the same elements with some cut, some reworded and some new action lines in. Seeded. */
export function earlierDraft(elements: Element[], seed: number): Element[] {
  const r = rng(seed * 31 + 7);
  const out: Element[] = [];
  let skipGroup: number | null = null;
  for (const el of elements) {
    if (el.type === 'slug') { out.push(el); skipGroup = null; continue; }
    if (el.group !== null) {
      if (skipGroup === el.group) continue;
      if (el.type === 'character' && r.chance(0.1)) { skipGroup = el.group; continue; } // the whole speech was cut
    } else if (el.type === 'action' && r.chance(0.1)) continue; // an action line was cut
    if (el.group === null && el.type === 'action' && r.chance(0.08)) out.push({ ...el, text: `${el.text} Then it passes.` }); // reworded
    else if (el.type === 'dialogue' && r.chance(0.08)) out.push({ ...el, text: `${el.text} Please.` });
    else out.push(el);
    if (el.group === null && el.type !== 'transition' && r.chance(0.06)) out.push({ type: 'action', text: r.pick(NEW_ACTION), group: null }); // a new line
  }
  return out;
}

const dropBlanks = (text: string, truth: TruthLine[]) => {
  const keep = text.replace(/\n$/, '').split('\n').map((l) => l.trim() !== '');
  return { text: text.replace(/\n$/, '').split('\n').filter((_, i) => keep[i]).join('\n'), truth: truth.filter((_, i) => keep[i]), keep };
};

/** What the earlier draft was read as, in the form the reader takes it. */
export function earlierReading(elements: Element[], seed: number, kind: Exclude<EarlierKind, 'none'>): PreviousDraft {
  const earlier = renderText(earlierDraft(elements, seed));
  if (kind === 'corrected') return previousDraftFromReading(dropBlanks(earlier.text, earlier.truth).truth.map((t) => ({ text: t.text, type: t.type })));
  const text = kind === 'blanks' ? earlier.text : dropBlanks(earlier.text, earlier.truth).text;
  return previousDraftFromReading(parseScript(text).lines);
}

/** The later draft with no blank lines, read with the earlier one (or without it: kind 'none'). */
export function measureTightWithEarlier(style: Style, kind: EarlierKind, seeds = SEEDS, options?: ParseOptions): Result {
  const scores: Score[] = [];
  const structure: ReturnType<typeof structureScore>[] = [];
  for (const seed of seeds) {
    const elements = generateScript(seed, style);
    const { text, truth } = renderText(elements);
    const tight = dropBlanks(text, truth);
    const previousDraft = kind === 'none' ? undefined : earlierReading(elements, seed, kind);
    const read = parseScript(tight.text, 'screenplay', undefined, { ...options, context: { ...options?.context, previousDraft } });
    scores.push(scoreLines(tight.truth, read.lines));
    structure.push(structureScore(truth, { scenes: read.scenes.length, cast: read.characters.map((c) => c.name) }));
  }
  const n = structure.length;
  return {
    score: pool(scores),
    sceneExact: structure.filter((s) => s.sceneExact).length / n,
    castRecall: structure.reduce((s, x) => s + x.castRecall, 0) / n,
    castInvented: structure.reduce((s, x) => s + x.castInvented, 0) / n,
  };
}
