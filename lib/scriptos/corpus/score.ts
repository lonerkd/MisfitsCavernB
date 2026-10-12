// Scoring: how well a read of a script matches the truth. Per element type
// (precision, recall, F1), over all the non-blank lines, and on the two things
// the suite is built on — the scenes found and the cast found.

import type { ElementType } from './generate';
import type { TruthLine } from './render';

export const TYPES: ElementType[] = ['slug', 'action', 'character', 'dialogue', 'parenthetical', 'transition'];

export interface TypeScore { tp: number; fp: number; fn: number; precision: number; recall: number; f1: number }
export interface Score {
  perType: Record<ElementType, TypeScore>;
  /** Share of true (non-blank) elements read as the right type. */
  accuracy: number;
  /** Mean F1 over the six types — the one number to move. */
  macroF1: number;
  total: number;
}

const ratio = (a: number, b: number) => (b === 0 ? 1 : a / b);

function finish(counts: Record<ElementType, { tp: number; fp: number; fn: number }>, correct: number, total: number): Score {
  const perType = {} as Record<ElementType, TypeScore>;
  for (const t of TYPES) {
    const { tp, fp, fn } = counts[t];
    const precision = ratio(tp, tp + fp);
    const recall = ratio(tp, tp + fn);
    perType[t] = { tp, fp, fn, precision, recall, f1: precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall) };
  }
  return { perType, accuracy: ratio(correct, total), macroF1: TYPES.reduce((s, t) => s + perType[t].f1, 0) / TYPES.length, total };
}
const emptyCounts = () => Object.fromEntries(TYPES.map((t) => [t, { tp: 0, fp: 0, fn: 0 }])) as Record<ElementType, { tp: number; fp: number; fn: number }>;
const asType = (t: string): ElementType | 'other' => ((TYPES as string[]).includes(t) ? (t as ElementType) : 'other');

/** Line for line — for a read that keeps every source line (the parser on text). */
export function scoreLines(truth: TruthLine[], read: Array<{ type: string }>): Score {
  const counts = emptyCounts();
  let correct = 0;
  let total = 0;
  truth.forEach((tl, i) => {
    if (tl.type === 'empty') return;
    total++;
    const got = asType(read[i]?.type ?? 'other');
    if (got === tl.type) { counts[tl.type].tp++; correct++; } else {
      counts[tl.type].fn++;
      if (got !== 'other') counts[got].fp++;
    }
  });
  return finish(counts, correct, total);
}

const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();

/**
 * Block for block — for a read that may merge or reflow lines (a PDF import).
 * True elements and read lines are matched in order by their text (the longest
 * common subsequence); a matched pair is right when its type is. An element the
 * read swallowed into another, or split apart, is a miss.
 */
export function scoreBlocks(truth: TruthLine[], read: Array<{ type: string; text: string }>): Score {
  const t = truth.filter((l) => l.type !== 'empty');
  const r = read.filter((l) => l.type !== 'empty' && l.text.trim());
  const a = t.map((l) => norm(l.text));
  const b = r.map((l) => norm(l.text));
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) {
    dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  }
  const matchOf = new Map<number, number>();
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { matchOf.set(i, j); i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++;
  }
  const counts = emptyCounts();
  const matchedReads = new Set(matchOf.values());
  let correct = 0;
  t.forEach((tl, ti) => {
    const rj = matchOf.get(ti);
    const truthType = tl.type as ElementType;
    if (rj === undefined) { counts[truthType].fn++; return; }
    const got = asType(r[rj].type);
    if (got === truthType) { counts[truthType].tp++; correct++; } else {
      counts[truthType].fn++;
      if (got !== 'other') counts[got].fp++;
    }
  });
  // Read blocks that matched nothing true are noise (a merged or split element).
  r.forEach((rl, rj) => { if (!matchedReads.has(rj)) { const got = asType(rl.type); if (got !== 'other') counts[got].fp++; } });
  return finish(counts, correct, t.length);
}

/** Of the true scenes, the share found; and the true cast, the share found and the share invented. */
export function structureScore(truth: TruthLine[], read: { scenes: number; cast: string[] }) {
  const trueScenes = truth.filter((l) => l.type === 'slug').length;
  const trueCast = new Set(truth.filter((l) => l.type === 'character').map((l) => l.text.replace(/\s*\([^)]*\)\s*/g, '').trim().toUpperCase()));
  const found = new Set(read.cast.map((c) => c.trim().toUpperCase()));
  let hit = 0;
  for (const c of trueCast) if (found.has(c)) hit++;
  return {
    sceneRecall: ratio(Math.min(read.scenes, trueScenes), trueScenes),
    sceneExact: read.scenes === trueScenes,
    castRecall: ratio(hit, trueCast.size),
    castInvented: [...found].filter((c) => !trueCast.has(c)).length,
  };
}

/** Pool scores (sum the counts) across many scripts. */
export function pool(scores: Score[]): Score {
  const counts = emptyCounts();
  let correct = 0;
  let total = 0;
  for (const s of scores) {
    for (const t of TYPES) { counts[t].tp += s.perType[t].tp; counts[t].fp += s.perType[t].fp; counts[t].fn += s.perType[t].fn; }
    correct += Math.round(s.accuracy * s.total);
    total += s.total;
  }
  return finish(counts, correct, total);
}

export function report(name: string, s: Score): string {
  const rows = TYPES.map((t) => `  ${t.padEnd(14)} P ${s.perType[t].precision.toFixed(2)}  R ${s.perType[t].recall.toFixed(2)}  F1 ${s.perType[t].f1.toFixed(2)}   (tp ${s.perType[t].tp}, fp ${s.perType[t].fp}, fn ${s.perType[t].fn})`);
  return `${name}: accuracy ${(s.accuracy * 100).toFixed(1)}%  macro-F1 ${s.macroF1.toFixed(3)}  over ${s.total} elements\n${rows.join('\n')}`;
}
