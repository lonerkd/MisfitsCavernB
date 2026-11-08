// Runs the real reading pipeline over the seeded corpus and scores it.

import { parseScript, type ParseOptions } from '../parser';
import { layoutPages } from '../pdfLayout';
import { generateScript, type Style } from './generate';
import { renderPdfPages, renderText } from './render';
import { pool, scoreBlocks, scoreLines, structureScore, type Score } from './score';

export const SEEDS = Array.from({ length: 30 }, (_, i) => 1000 + i * 7);

export interface Result { score: Score; sceneExact: number; castRecall: number; castInvented: number }

function summarize(scores: Score[], structure: ReturnType<typeof structureScore>[]): Result {
  const n = structure.length;
  return {
    score: pool(scores),
    sceneExact: structure.filter((s) => s.sceneExact).length / n,
    castRecall: structure.reduce((s, x) => s + x.castRecall, 0) / n,
    castInvented: structure.reduce((s, x) => s + x.castInvented, 0) / n,
  };
}

/** The parser, on a script typed as text. */
export function measureText(style: Style, seeds = SEEDS, options?: ParseOptions): Result {
  const scores: Score[] = [];
  const structure: ReturnType<typeof structureScore>[] = [];
  for (const seed of seeds) {
    const { text, truth } = renderText(generateScript(seed, style));
    const read = parseScript(text, 'screenplay', undefined, options);
    scores.push(scoreLines(truth, read.lines));
    structure.push(structureScore(truth, { scenes: read.scenes.length, cast: read.characters.map((c) => c.name) }));
  }
  return summarize(scores, structure);
}

/**
 * A script pasted from another editor with every blank line gone (a common way text reaches the editor). Fountain
 * wants a blank line before a cue, so here the reader has to decide from the rest of the evidence; the document
 * profile (decode.ts documentProfile) is what lets it. Truth is the same script with the same lines removed.
 */
export function measureTight(style: Style, seeds = SEEDS, options?: ParseOptions): Result {
  const scores: Score[] = [];
  const structure: ReturnType<typeof structureScore>[] = [];
  for (const seed of seeds) {
    const { text, truth } = renderText(generateScript(seed, style));
    const keep = text.replace(/\n$/, '').split('\n').map((line) => line.trim() !== '');
    const read = parseScript(text.replace(/\n$/, '').split('\n').filter((_, i) => keep[i]).join('\n'), 'screenplay', undefined, options);
    scores.push(scoreLines(truth.filter((_, i) => keep[i]), read.lines));
    structure.push(structureScore(truth, { scenes: read.scenes.length, cast: read.characters.map((c) => c.name) }));
  }
  return summarize(scores, structure);
}

/** The whole PDF path: page text items → the layout reader → the parser. */
export function measurePdf(style: Style, seeds = SEEDS, layout: { shift?: number; scale?: number } = {}, options?: ParseOptions): Result {
  const scores: Score[] = [];
  const structure: ReturnType<typeof structureScore>[] = [];
  for (const seed of seeds) {
    const elements = generateScript(seed, style);
    const { truth } = renderText(elements);
    const read = parseScript(layoutPages(renderPdfPages(elements, layout)), 'screenplay', undefined, options);
    scores.push(scoreBlocks(truth, read.lines));
    structure.push(structureScore(truth, { scenes: read.scenes.length, cast: read.characters.map((c) => c.name) }));
  }
  return summarize(scores, structure);
}
