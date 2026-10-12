// Runs the real reading pipeline over the seeded corpus and scores it.

import { parseScript } from '../parser';
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
export function measureText(style: Style, seeds = SEEDS): Result {
  const scores: Score[] = [];
  const structure: ReturnType<typeof structureScore>[] = [];
  for (const seed of seeds) {
    const { text, truth } = renderText(generateScript(seed, style));
    const read = parseScript(text);
    scores.push(scoreLines(truth, read.lines));
    structure.push(structureScore(truth, { scenes: read.scenes.length, cast: read.characters.map((c) => c.name) }));
  }
  return summarize(scores, structure);
}

/** The whole PDF path: page text items → the layout reader → the parser. */
export function measurePdf(style: Style, seeds = SEEDS, layout: { shift?: number; scale?: number } = {}): Result {
  const scores: Score[] = [];
  const structure: ReturnType<typeof structureScore>[] = [];
  for (const seed of seeds) {
    const elements = generateScript(seed, style);
    const { truth } = renderText(elements);
    const read = parseScript(layoutPages(renderPdfPages(elements, layout)));
    scores.push(scoreBlocks(truth, read.lines));
    structure.push(structureScore(truth, { scenes: read.scenes.length, cast: read.characters.map((c) => c.name) }));
  }
  return summarize(scores, structure);
}
