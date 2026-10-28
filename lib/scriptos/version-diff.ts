// Comparing two versions of a script (wishlist 4.12): what changed, scene by
// scene. A writer coming back to a draft needs "which scenes moved", not only a
// wall of lines — so this pairs the scenes of both versions in order (a heading
// that survives keeps its place; an edited heading reads as one out, one in) and
// counts the lines added and removed in each. Pure: the editor renders it.

import * as Diff from 'diff';
import { parseScript } from './parser';

export type SceneChangeStatus = 'added' | 'removed' | 'changed' | 'same';

export interface VersionScene {
  /** The heading as the later version spells it (the earlier one when the scene is gone). */
  heading: string;
  status: SceneChangeStatus;
  /** Lines added / removed inside the scene. */
  added: number;
  removed: number;
  /** The scene's text in each version ('' when it is not in that version). */
  before: string;
  after: string;
}

export interface VersionSummary {
  /** Lines added / removed across the whole script. */
  added: number;
  removed: number;
  scenes: VersionScene[];
  /** True when the two versions have nothing different at all. */
  identical: boolean;
}

interface Segment {
  heading: string;
  /** The scene's lines, heading included, without trailing blank lines. */
  lines: string[];
}

/** The longest common subsequence of two heading lists, as index pairs. */
function matchHeadings(before: string[], after: string[]): [number, number][] {
  const rows = before.length;
  const cols = after.length;
  const table: number[][] = Array.from({ length: rows + 1 }, () => new Array<number>(cols + 1).fill(0));
  for (let i = rows - 1; i >= 0; i--) {
    for (let j = cols - 1; j >= 0; j--) {
      table[i][j] = before[i] === after[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const pairs: [number, number][] = [];
  let i = 0;
  let j = 0;
  while (i < rows && j < cols) {
    if (before[i] === after[j]) { pairs.push([i, j]); i++; j++; }
    else if (table[i + 1][j] >= table[i][j + 1]) i++;
    else j++;
  }
  return pairs;
}

/** The script split into scenes (plus the preamble before the first heading, as its own segment). */
function segments(text: string): { preamble: Segment; scenes: Segment[] } {
  const lines = text.split(/\r?\n/);
  const parsed = parseScript(text, 'screenplay').lines;
  const sceneStarts: number[] = [];
  const headings: string[] = [];
  parsed.forEach((l, i) => { if (l.type === 'slug') { sceneStarts.push(i); headings.push(l.text.trim()); } });

  const trim = (rows: string[]): string[] => {
    const out = [...rows];
    while (out.length && !out[out.length - 1].trim()) out.pop();
    return out;
  };

  if (!sceneStarts.length) {
    return { preamble: { heading: '', lines: trim(lines) }, scenes: [] };
  }
  const scenes = sceneStarts.map((start, k) => {
    const end = sceneStarts[k + 1] ?? lines.length;
    return { heading: headings[k], lines: trim(lines.slice(start, end)) };
  });
  return { preamble: { heading: '', lines: trim(lines.slice(0, sceneStarts[0])) }, scenes };
}

function countLines(before: string, after: string): { added: number; removed: number } {
  if (before === after) return { added: 0, removed: 0 };
  let added = 0;
  let removed = 0;
  for (const part of Diff.diffLines(before, after)) {
    if (!part.added && !part.removed) continue;
    const n = part.value.split('\n').filter((l) => l.trim()).length;
    if (part.added) added += n; else removed += n;
  }
  return { added, removed };
}

const body = (s: Segment): string => s.lines.join('\n');

/**
 * What changed between two versions of the same script: line counts and a scene
 * by scene list, in the later version's order, with removed scenes where they
 * used to sit.
 */
export function summarizeVersions(before: string, after: string): VersionSummary {
  const a = segments(before);
  const b = segments(after);
  const pairs = matchHeadings(a.scenes.map((s) => s.heading), b.scenes.map((s) => s.heading));

  const scenes: VersionScene[] = [];
  let added = 0;
  let removed = 0;

  const preamble = countLines(body(a.preamble), body(b.preamble));
  added += preamble.added;
  removed += preamble.removed;

  let ai = 0;
  let bi = 0;
  const flush = (fromA: number, toA: number, fromB: number, toB: number) => {
    // Scenes with no counterpart: gone before the next match, then new ones.
    for (let k = fromA; k < toA; k++) {
      const s = a.scenes[k];
      const counts = countLines(body(s), '');
      removed += counts.removed;
      scenes.push({ heading: s.heading, status: 'removed', added: 0, removed: counts.removed, before: body(s), after: '' });
    }
    for (let k = fromB; k < toB; k++) {
      const s = b.scenes[k];
      const counts = countLines('', body(s));
      added += counts.added;
      scenes.push({ heading: s.heading, status: 'added', added: counts.added, removed: 0, before: '', after: body(s) });
    }
  };

  for (const [pa, pb] of [...pairs, [a.scenes.length, b.scenes.length] as [number, number]]) {
    flush(ai, pa, bi, pb);
    if (pa >= a.scenes.length) break;
    const sa = a.scenes[pa];
    const sb = b.scenes[pb];
    const counts = countLines(body(sa), body(sb));
    added += counts.added;
    removed += counts.removed;
    scenes.push({
      heading: sb.heading,
      status: counts.added || counts.removed ? 'changed' : 'same',
      added: counts.added,
      removed: counts.removed,
      before: body(sa),
      after: body(sb),
    });
    ai = pa + 1;
    bi = pb + 1;
  }

  return { added, removed, scenes, identical: added === 0 && removed === 0 };
}

/** Only what moved: the scenes that are not identical (for a summary list). */
export function changedScenes(summary: VersionSummary): VersionScene[] {
  return summary.scenes.filter((s) => s.status !== 'same');
}


/** One line of a two-pane comparison. */
export interface InlineRow {
  kind: 'same' | 'changed' | 'added' | 'removed';
  /** The line on the left / right; '' where that side has nothing. */
  left: string;
  right: string;
  /** Only for a changed pair: the words, side by side, with what changed marked. */
  leftParts?: { text: string; changed: boolean }[];
  rightParts?: { text: string; changed: boolean }[];
}

/**
 * Pair two texts line by line for a side-by-side view. Unchanged lines sit on
 * both sides; a run of removed and added lines is paired in order, so a reworded
 * line is one row with the words that changed highlighted rather than a deletion
 * stacked on an insertion. Extra lines on either side follow as removed / added.
 */
export function inlineRows(before: string, after: string): InlineRow[] {
  const changes = Diff.diffLines(before, after);
  const rows: InlineRow[] = [];
  let removed: string[] = [];
  let added: string[] = [];

  const flush = () => {
    const pairs = Math.min(removed.length, added.length);
    for (let i = 0; i < pairs; i++) {
      const leftParts: { text: string; changed: boolean }[] = [];
      const rightParts: { text: string; changed: boolean }[] = [];
      for (const part of Diff.diffWords(removed[i], added[i])) {
        if (part.added) rightParts.push({ text: part.value, changed: true });
        else if (part.removed) leftParts.push({ text: part.value, changed: true });
        else {
          leftParts.push({ text: part.value, changed: false });
          rightParts.push({ text: part.value, changed: false });
        }
      }
      rows.push({ kind: 'changed', left: removed[i], right: added[i], leftParts, rightParts });
    }
    for (let i = pairs; i < removed.length; i++) rows.push({ kind: 'removed', left: removed[i], right: '' });
    for (let i = pairs; i < added.length; i++) rows.push({ kind: 'added', left: '', right: added[i] });
    removed = [];
    added = [];
  };

  for (const part of changes) {
    const lines = part.value.split('\n');
    if (lines[lines.length - 1] === '') lines.pop();
    if (part.removed) { removed.push(...lines); continue; }
    if (part.added) { added.push(...lines); continue; }
    flush();
    for (const line of lines) rows.push({ kind: 'same', left: line, right: line });
  }
  flush();
  return rows;
}

/** The indexes of the rows that are not identical — for next / previous change. */
export function changedRowIndexes(rows: InlineRow[]): number[] {
  const out: number[] = [];
  rows.forEach((r, i) => { if (r.kind !== 'same') out.push(i); });
  return out;
}
