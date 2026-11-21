// Comparing two versions of a script (wishlist 4.12). Pure: the editor's Compare view and the change report render it.
//
// What a writer coming back to notes needs is not a wall of changed lines but "which scenes moved, who got renamed,
// how much dialogue changed". So the two texts are cut into scenes, the scenes are paired (by heading, then by what
// is in them), a scene that kept its heading but changed place is *moved* (not cut and added), a character cue that
// changes the same way everywhere is one *rename* (not N dialogue edits), and only inside a paired scene are the
// lines diffed, word by word.
//
// Lines are typed here by structure (heading, cue, parenthetical, dialogue, action), not by `parseScript`: the full
// parser with its decoder takes ~150 ms a script at 120 pages, and a comparison reads two of them.

import * as Diff from 'diff';
import { LINES_PER_PAGE, printedLineRuns } from './timing';
import type { LineType } from './types';

export type ChangeCategory = 'heading' | 'dialogue' | 'action';
export type ChangeFilter = 'all' | ChangeCategory;
export type RowKind = 'same' | 'added' | 'removed' | 'changed';
export type SceneStatus = 'added' | 'removed' | 'changed' | 'moved' | 'same';

export interface WordPart { text: string; changed: boolean }

/** One line of the comparison, in the two versions. */
export interface CompareRow {
  kind: RowKind;
  type: LineType;
  category: ChangeCategory;
  /** The line in the earlier / later version ('' where that side has nothing). */
  left: string;
  right: string;
  /** For a changed pair only: the words, with what changed marked. */
  leftParts?: WordPart[];
  rightParts?: WordPart[];
  /** The line differs only by a character rename (shown, but not a change). */
  renamed?: boolean;
  /** Zero-based line in each text (the position it would sit at, for a line the other side lacks). */
  leftLine: number;
  rightLine: number;
}

export interface SceneDiff {
  id: string;
  heading: string;
  /** The heading as the earlier version spells it. */
  headingBefore: string;
  status: SceneStatus;
  /** True when the scene sits in a different place in the order (whether or not its words changed). */
  moved: boolean;
  /** One-based scene numbers in each version (null where the scene is not in it). */
  from: number | null;
  to: number | null;
  /** The part before the first heading (title page, FADE IN:). */
  preamble: boolean;
  rows: CompareRow[];
  counts: { added: number; removed: number; changed: number };
}

export interface Rename { from: string; to: string; cues: number; scenes: number }

export interface CompareStats {
  scenes: { added: number; removed: number; changed: number; moved: number; same: number };
  /** Lines added, cut or reworded, by kind of line. */
  lines: { dialogue: number; action: number; heading: number };
  words: { added: number; removed: number };
  pages: { before: number; after: number; changed: number };
  renames: number;
}

export interface Comparison {
  scenes: SceneDiff[];
  renames: Rename[];
  stats: CompareStats;
  /** True when nothing differs (a rename-only difference is still a difference). */
  identical: boolean;
}

// ── typing the lines ───────────────────────────────────────────────────────

const SLUG = /^(?:\.[A-Za-z0-9]|(?:INT\.?\s*\/\s*EXT|EXT\.?\s*\/\s*INT|INT|EXT|EST|I\/E|E\/I)(?:[.\s-]))/i;
const TRANSITION = /^(?:>\s*|[A-Z][A-Z .'-]*\bTO:\s*$|FADE (?:IN|OUT)[.:]?$|CUT TO BLACK\.?$)/;

/** A cue's name: the extension (V.O., CONT'D), a dual-dialogue caret and a forced "@" are not part of who speaks. */
export function cueName(line: string): string {
  return line.replace(/\^\s*$/, '').replace(/\([^)]*\)/g, '').replace(/^@/, '').replace(/\s+/g, ' ').trim().toUpperCase();
}

function looksLikeCue(line: string, next: string): boolean {
  const t = line.trim();
  if (!t || t.length > 40 || !next.trim() || SLUG.test(next.trim())) return false;
  if (t.startsWith('@')) return true;
  const name = t.replace(/\^\s*$/, '').replace(/\([^)]*\)/g, '').trim();
  return /[A-Z]/.test(name) && name === name.toUpperCase() && !/[a-z]/.test(name) && !TRANSITION.test(t) && !/^[.!?]/.test(t);
}

/** The element type of each line, by structure. */
export function typeLines(lines: string[]): LineType[] {
  const out: LineType[] = [];
  let prev: LineType = 'empty';
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    let type: LineType;
    if (!t) type = 'empty';
    else if (SLUG.test(t) && (prev === 'empty' || i === 0)) type = 'slug';
    else if (t.startsWith('(') && (prev === 'character' || prev === 'dialogue')) type = 'parenthetical';
    else if ((prev === 'character' || prev === 'parenthetical' || prev === 'dialogue') && !SLUG.test(t)) type = 'dialogue';
    else if (TRANSITION.test(t)) type = 'transition';
    else if ((prev === 'empty' || i === 0) && looksLikeCue(t, lines[i + 1] ?? '')) type = 'character';
    else type = 'action';
    out.push(type);
    prev = type;
  }
  return out;
}

export function categoryOf(type: LineType): ChangeCategory {
  if (type === 'slug') return 'heading';
  if (type === 'character' || type === 'dialogue' || type === 'parenthetical' || type === 'dual') return 'dialogue';
  return 'action';
}

// ── cutting into scenes ────────────────────────────────────────────────────

interface Seg {
  heading: string;
  key: string;
  /** The scene's non-blank lines, with where each sits in the text. */
  lines: { text: string; type: LineType; at: number }[];
}

/** A heading with its scene numbers and a forced "." taken off, so renumbering is not a change. */
export function headingKey(heading: string): string {
  return heading.replace(/#[^#]*#/g, ' ').replace(/^\.(?=\S)/, '').replace(/^\s*\d+[A-Z]?[.)]?\s+(?=\S)/, '').replace(/\s+\d+[A-Z]?\s*$/, '').replace(/\s+/g, ' ').trim().toUpperCase();
}

function cut(text: string): { preamble: Seg; scenes: Seg[]; lines: string[]; types: LineType[] } {
  const lines = text.split(/\r?\n/);
  const types = typeLines(lines);
  const preamble: Seg = { heading: '', key: '', lines: [] };
  const scenes: Seg[] = [];
  let cur: Seg = preamble;
  for (let i = 0; i < lines.length; i++) {
    if (types[i] === 'slug') {
      cur = { heading: lines[i].trim(), key: headingKey(lines[i]), lines: [] };
      scenes.push(cur);
    }
    if (lines[i].trim()) cur.lines.push({ text: lines[i].replace(/\s+$/, ''), type: types[i], at: i });
  }
  return { preamble, scenes, lines, types };
}

const words = (s: string): string[] => s.toLowerCase().match(/[\p{L}\p{N}']+/gu) ?? [];

function similarity(a: string[], b: string[]): number {
  if (!a.length && !b.length) return 1;
  const set = new Set(a);
  let both = 0;
  const seen = new Set<string>();
  for (const w of b) if (set.has(w) && !seen.has(w)) { both++; seen.add(w); }
  return both / (set.size + new Set(b).size - both || 1);
}

/** Pair the scenes of the two versions: the same heading (the nth of it with the nth), then the best of what is left by what they say. */
function pairScenes(a: Seg[], b: Seg[]): Map<number, number> {
  const pairs = new Map<number, number>();
  const usedB = new Set<number>();
  const byKey = new Map<string, number[]>();
  b.forEach((s, j) => { const l = byKey.get(s.key) ?? []; l.push(j); byKey.set(s.key, l); });
  const taken = new Map<string, number>();
  a.forEach((s, i) => {
    const list = byKey.get(s.key);
    const n = taken.get(s.key) ?? 0;
    if (list && n < list.length) { pairs.set(i, list[n]); usedB.add(list[n]); taken.set(s.key, n + 1); }
  });
  // An edited heading: pair what is left when the words in the two scenes are mostly the same.
  const restA = a.map((_, i) => i).filter((i) => !pairs.has(i));
  const restB = b.map((_, j) => j).filter((j) => !usedB.has(j));
  if (restA.length && restB.length && restA.length * restB.length <= 40000) {
    const wa = new Map(restA.map((i) => [i, words(a[i].lines.slice(1).map((l) => l.text).join(' '))]));
    const wb = new Map(restB.map((j) => [j, words(b[j].lines.slice(1).map((l) => l.text).join(' '))]));
    const scored: { i: number; j: number; s: number }[] = [];
    for (const i of restA) for (const j of restB) {
      const s = similarity(wa.get(i)!, wb.get(j)!);
      if (s >= 0.5 && wa.get(i)!.length >= 3) scored.push({ i, j, s });
    }
    scored.sort((x, y) => y.s - x.s || x.i - y.i);
    for (const { i, j } of scored) if (!pairs.has(i) && !usedB.has(j)) { pairs.set(i, j); usedB.add(j); }
  }
  return pairs;
}

/** Of the paired scenes (in the earlier version's order), the ones that are out of order: everything not on a longest increasing run. */
function movedScenes(pairs: Map<number, number>): Set<number> {
  const order = [...pairs.entries()].sort((x, y) => x[0] - y[0]);
  const tails: number[] = [];
  const prev: number[] = new Array(order.length).fill(-1);
  const tailIdx: number[] = [];
  order.forEach(([, j], k) => {
    let lo = 0, hi = tails.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (tails[mid] < j) lo = mid + 1; else hi = mid; }
    tails[lo] = j; tailIdx[lo] = k;
    prev[k] = lo ? tailIdx[lo - 1] : -1;
  });
  const keep = new Set<number>();
  for (let k = tails.length ? tailIdx[tails.length - 1] : -1; k >= 0; k = prev[k]) keep.add(order[k][0]);
  const moved = new Set<number>();
  for (const [i] of order) if (!keep.has(i)) moved.add(i);
  return moved;
}

// ── diffing inside a scene ─────────────────────────────────────────────────

type L = Seg['lines'][number];

function wordParts(a: string, b: string): { left: WordPart[]; right: WordPart[]; added: number; removed: number } {
  const left: WordPart[] = [];
  const right: WordPart[] = [];
  let added = 0;
  let removed = 0;
  const count = (s: string) => (s.match(/\S+/g) ?? []).length;
  for (const part of Diff.diffWords(a, b)) {
    if (part.added) { right.push({ text: part.value, changed: true }); added += count(part.value); }
    else if (part.removed) { left.push({ text: part.value, changed: true }); removed += count(part.value); }
    else { left.push({ text: part.value, changed: false }); right.push({ text: part.value, changed: false }); }
  }
  return { left, right, added, removed };
}

/** Which removed lines pair with which added ones in a run: in order when the shapes match, else the best-scoring alignment. */
function alignRun(r: L[], a: L[]): [number, number][] {
  const sameShape = r.length === a.length && r.every((l, i) => l.type === a[i].type);
  if (sameShape) return r.map((_, i) => [i, i]);
  if (r.length * a.length > 1600) {
    const n = Math.min(r.length, a.length);
    return Array.from({ length: n }, (_, i) => [i, i] as [number, number]).filter(([i, j]) => r[i].type === a[j].type);
  }
  const wr = r.map((l) => words(l.text));
  const wa = a.map((l) => words(l.text));
  const score = (i: number, j: number) => (r[i].type === a[j].type ? Math.max(similarity(wr[i], wa[j]), 0.05) : -1);
  const dp: number[][] = Array.from({ length: r.length + 1 }, () => new Array<number>(a.length + 1).fill(0));
  for (let i = r.length - 1; i >= 0; i--) for (let j = a.length - 1; j >= 0; j--) {
    const s = score(i, j);
    dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1], s >= 0.3 ? dp[i + 1][j + 1] + s : -1);
  }
  const out: [number, number][] = [];
  let i = 0, j = 0;
  while (i < r.length && j < a.length) {
    const s = score(i, j);
    if (s >= 0.3 && dp[i][j] === dp[i + 1][j + 1] + s) { out.push([i, j]); i++; j++; }
    else if (dp[i][j] === dp[i + 1][j]) i++;
    else j++;
  }
  return out;
}

function diffScene(a: Seg | null, b: Seg | null): CompareRow[] {
  const A = a?.lines ?? [];
  const B = b?.lines ?? [];
  const rows: CompareRow[] = [];
  const mk = (kind: RowKind, l: L | undefined, r: L | undefined, leftAt: number, rightAt: number): CompareRow => {
    const type = (r ?? l)!.type;
    return { kind, type, category: categoryOf(type), left: l?.text ?? '', right: r?.text ?? '', leftLine: l?.at ?? leftAt, rightLine: r?.at ?? rightAt };
  };
  const key = (l: L) => (l.type === 'slug' ? `#${headingKey(l.text)}` : l.text.trim());
  const parts = Diff.diffArrays(A.map(key), B.map(key));
  let ai = 0;
  let bi = 0;
  let removed: L[] = [];
  let added: L[] = [];
  const flush = () => {
    const pairs = alignRun(removed, added);
    let ri = 0;
    let aj = 0;
    const nextRight = () => B[bi]?.at ?? B[B.length - 1]?.at ?? 0;
    for (const [i, j] of pairs) {
      while (ri < i) { rows.push(mk('removed', removed[ri], undefined, 0, nextRight())); ri++; }
      while (aj < j) { rows.push(mk('added', undefined, added[aj], removed[ri]?.at ?? 0, 0)); aj++; }
      rows.push(mk('changed', removed[i], added[j], 0, 0));
      ri = i + 1; aj = j + 1;
    }
    while (ri < removed.length) { rows.push(mk('removed', removed[ri], undefined, 0, nextRight())); ri++; }
    while (aj < added.length) { rows.push(mk('added', undefined, added[aj], removed[removed.length - 1]?.at ?? 0, 0)); aj++; }
    removed = []; added = [];
  };
  for (const part of parts) {
    const n = part.count ?? part.value.length;
    if (part.removed) { removed = removed.concat(A.slice(ai, ai + n)); ai += n; }
    else if (part.added) { added = added.concat(B.slice(bi, bi + n)); bi += n; }
    else {
      flush();
      for (let k = 0; k < n; k++) rows.push(mk('same', A[ai + k], B[bi + k], 0, 0));
      ai += n; bi += n;
    }
  }
  flush();
  // A paired line whose words differ carries them, marked.
  for (const row of rows) if (row.kind === 'changed') {
    const p = wordParts(row.left, row.right);
    row.leftParts = p.left; row.rightParts = p.right;
  }
  return rows;
}

// ── renames ────────────────────────────────────────────────────────────────

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function carryCase(found: string, to: string): string {
  if (found === found.toUpperCase()) return to.toUpperCase();
  if (found[0] === found[0].toUpperCase()) return to.toLowerCase().replace(/(^|\s)(\p{L})/gu, (_, sp: string, ch: string) => sp + ch.toUpperCase());
  return to.toLowerCase();
}

/** Cue changes that happen the same way throughout: who was renamed to whom. */
function findRenames(scenes: SceneDiff[], cuesBefore: Map<string, number>, cuesAfter: Map<string, number>): Rename[] {
  const tally = new Map<string, { cues: number; scenes: Set<string> }>();
  for (const s of scenes) for (const row of s.rows) {
    if (row.kind !== 'changed' || row.type !== 'character') continue;
    const x = cueName(row.left);
    const y = cueName(row.right);
    if (!x || !y || x === y) continue;
    const k = `${x}\u0000${y}`;
    const t = tally.get(k) ?? { cues: 0, scenes: new Set<string>() };
    t.cues++; t.scenes.add(s.id);
    tally.set(k, t);
  }
  const out: Rename[] = [];
  const claimed = new Set<string>();
  for (const [k, t] of [...tally.entries()].sort((p, q) => q[1].cues - p[1].cues)) {
    const [from, to] = k.split('\u0000');
    // Renamed means the old name is gone, the new one is new, and the cues that changed are most of the old name's.
    if (cuesAfter.has(from) || cuesBefore.has(to) || claimed.has(from) || claimed.has(to)) continue;
    if (t.cues < (cuesBefore.get(from) ?? 0) * 0.5) continue;
    claimed.add(from); claimed.add(to);
    out.push({ from, to, cues: t.cues, scenes: t.scenes.size });
  }
  return out;
}

function applyRenames(text: string, renames: Rename[]): string {
  let t = text;
  for (const r of renames) t = t.replace(new RegExp(`(?<![\\p{L}\\p{N}'])${escapeRe(r.from)}(?![\\p{L}\\p{N}'])`, 'giu'), (m) => carryCase(m, r.to));
  return t;
}

// ── the comparison ─────────────────────────────────────────────────────────

const countIn = (rows: CompareRow[]) => {
  const c = { added: 0, removed: 0, changed: 0 };
  for (const r of rows) if (!r.renamed) { if (r.kind === 'added') c.added++; else if (r.kind === 'removed') c.removed++; else if (r.kind === 'changed') c.changed++; }
  return c;
};

function cueCounts(segs: Seg[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const s of segs) for (const l of s.lines) if (l.type === 'character') { const n = cueName(l.text); if (n) m.set(n, (m.get(n) ?? 0) + 1); }
  return m;
}

export function compareScripts(before: string, after: string): Comparison {
  const A = cut(before);
  const B = cut(after);
  const pairs = pairScenes(A.scenes, B.scenes);
  const moved = movedScenes(pairs);
  const reverse = new Map([...pairs.entries()].map(([i, j]) => [j, i]));

  const scenes: SceneDiff[] = [];
  const mkScene = (id: string, a: Seg | null, b: Seg | null, ai: number | null, bi: number | null, preamble = false): SceneDiff => ({
    id, heading: (b ?? a)!.heading, headingBefore: a?.heading ?? '', status: 'same', moved: false,
    from: ai === null ? null : ai + 1, to: bi === null ? null : bi + 1, preamble, rows: diffScene(a, b), counts: { added: 0, removed: 0, changed: 0 },
  });

  if (A.preamble.lines.length || B.preamble.lines.length) scenes.push(mkScene('preamble', A.preamble, B.preamble, null, null, true));
  const order: { scene: SceneDiff; pos: number }[] = [];
  B.scenes.forEach((b, j) => {
    const i = reverse.get(j);
    const s = mkScene(`s${j}`, i === undefined ? null : A.scenes[i], b, i ?? null, j);
    s.moved = i !== undefined && moved.has(i);
    order.push({ scene: s, pos: j });
  });
  // A scene that is gone sits after the scene that came before it in the earlier version.
  A.scenes.forEach((a, i) => {
    if (pairs.has(i)) return;
    let k = i - 1;
    while (k >= 0 && !pairs.has(k)) k--;
    const s = mkScene(`x${i}`, a, null, i, null);
    order.push({ scene: s, pos: k < 0 ? -1 : pairs.get(k)! + 0.5 });
  });
  order.sort((x, y) => x.pos - y.pos);
  for (const o of order) scenes.push(o.scene);

  const renames = findRenames(scenes, cueCounts(A.scenes), cueCounts(B.scenes));
  if (renames.length) for (const s of scenes) for (const row of s.rows) {
    if (row.kind === 'changed' && applyRenames(row.left, renames).trim() === row.right.trim()) { row.kind = 'same'; row.renamed = true; row.leftParts = undefined; row.rightParts = undefined; }
  }

  const stats: CompareStats = {
    scenes: { added: 0, removed: 0, changed: 0, moved: 0, same: 0 },
    lines: { dialogue: 0, action: 0, heading: 0 },
    words: { added: 0, removed: 0 },
    pages: { before: 0, after: 0, changed: 0 },
    renames: renames.length,
  };
  const runsB = printedLineRuns(B.lines.map((text, i) => ({ type: B.types[i], text })));
  const runsA = printedLineRuns(A.lines.map((text, i) => ({ type: A.types[i], text })));
  const pageOf = (runs: number[], line: number) => Math.floor(Math.max(0, (runs[Math.min(Math.max(line, 0), runs.length - 1)] ?? 1) - 1) / LINES_PER_PAGE) + 1;
  stats.pages.before = Math.ceil((runsA[runsA.length - 1] ?? 0) / LINES_PER_PAGE);
  stats.pages.after = Math.ceil((runsB[runsB.length - 1] ?? 0) / LINES_PER_PAGE);
  const touched = new Set<number>();

  for (const s of scenes) {
    s.counts = countIn(s.rows);
    const edited = s.counts.added + s.counts.removed + s.counts.changed > 0;
    if (s.from === null && !s.preamble) s.status = 'added';
    else if (s.to === null && !s.preamble) s.status = 'removed';
    else if (edited) s.status = 'changed';
    else if (s.moved) s.status = 'moved';
    else s.status = 'same';
    if (!s.preamble) stats.scenes[s.status]++;
    if (s.moved && s.status === 'changed') stats.scenes.moved++;
    if (s.moved) touched.add(pageOf(runsB, B.scenes[s.to! - 1] ? B.scenes[s.to! - 1].lines[0]?.at ?? 0 : 0));
    for (const row of s.rows) {
      if (row.renamed || row.kind === 'same') continue;
      stats.lines[row.category]++;
      if (row.kind === 'changed') {
        const p = wordParts(row.left, row.right);
        stats.words.added += p.added; stats.words.removed += p.removed;
      } else {
        const n = ((row.kind === 'added' ? row.right : row.left).match(/\S+/g) ?? []).length;
        if (row.kind === 'added') stats.words.added += n; else stats.words.removed += n;
      }
      if (s.status !== 'removed') touched.add(pageOf(runsB, row.rightLine));
    }
  }
  stats.pages.changed = touched.size;

  const identical = scenes.every((s) => s.status === 'same' && !s.rows.some((r) => r.renamed)) && !renames.length && !touched.size;
  return { scenes, renames, stats, identical };
}

// ── filters, change list, collapsing ───────────────────────────────────────

export function matchesFilter(category: ChangeCategory, filter: ChangeFilter): boolean {
  return filter === 'all' || filter === category;
}

/** A row's kind as the filter shows it: a change outside the filter reads as unchanged. */
export function effectiveKind(row: CompareRow, filter: ChangeFilter): RowKind {
  return row.renamed || !matchesFilter(row.category, filter) ? 'same' : row.kind;
}

/** Whether a scene has something to show under the filter. */
export function sceneVisible(scene: SceneDiff, filter: ChangeFilter): boolean {
  if (scene.status === 'same') return false;
  if (scene.status === 'moved') return filter === 'all' || filter === 'heading';
  return scene.rows.some((r) => effectiveKind(r, filter) !== 'same');
}

export interface ChangeRef {
  /** Element id the view gives the change (for scrolling and focus). */
  id: string;
  sceneId: string;
  /** The first row of the change (null for a whole scene that moved, appeared or went). */
  row: number | null;
  label: string;
}

const KIND_WORD: Record<RowKind, string> = { same: 'unchanged', added: 'added', removed: 'cut', changed: 'changed' };
const CATEGORY_WORD: Record<ChangeCategory, string> = { heading: 'scene heading', dialogue: 'dialogue', action: 'action' };

/** The changes to step through, in script order: a moved, added or cut scene is one; in an edited scene, each run of changed lines is one. */
export function changeRefs(c: Comparison, filter: ChangeFilter): ChangeRef[] {
  const refs: ChangeRef[] = [];
  for (const s of c.scenes) {
    if (!sceneVisible(s, filter)) continue;
    const name = s.heading || 'Before the first scene';
    if (s.status === 'moved') { refs.push({ id: `cmp-${s.id}`, sceneId: s.id, row: null, label: `${name}: scene moved from ${s.from} to ${s.to}` }); continue; }
    if (s.status === 'added' || s.status === 'removed') { refs.push({ id: `cmp-${s.id}`, sceneId: s.id, row: null, label: `${name}: scene ${s.status === 'added' ? 'added' : 'cut'}` }); continue; }
    let inRun = false;
    s.rows.forEach((row, i) => {
      const kind = effectiveKind(row, filter);
      if (kind === 'same') { inRun = false; return; }
      if (!inRun) refs.push({ id: `cmp-${s.id}-${i}`, sceneId: s.id, row: i, label: `${name}: ${CATEGORY_WORD[row.category]} ${KIND_WORD[kind]}` });
      inRun = true;
    });
  }
  return refs;
}

export type SceneItem = { type: 'scene'; scene: SceneDiff } | { type: 'unchanged'; scenes: SceneDiff[] };

/** The scenes to draw: each one with something to show, and the stretches between them folded into one "N unchanged scenes". */
export function groupScenes(c: Comparison, filter: ChangeFilter): SceneItem[] {
  const items: SceneItem[] = [];
  for (const s of c.scenes) {
    if (sceneVisible(s, filter)) { items.push({ type: 'scene', scene: s }); continue; }
    if (s.preamble) continue; // the title page is not a scene to count among the unchanged ones
    const last = items[items.length - 1];
    if (last?.type === 'unchanged') last.scenes.push(s); else items.push({ type: 'unchanged', scenes: [s] });
  }
  return items;
}

export type RowItem = { type: 'row'; index: number } | { type: 'gap'; from: number; count: number };

/** The rows to draw: the changed lines with `context` unchanged lines either side, and what lies between folded into a gap. */
export function collapseRows(rows: CompareRow[], filter: ChangeFilter, context = 1, minGap = 3): RowItem[] {
  const near = new Array<boolean>(rows.length).fill(false);
  rows.forEach((r, i) => {
    if (effectiveKind(r, filter) === 'same') return;
    for (let k = Math.max(0, i - context); k <= Math.min(rows.length - 1, i + context); k++) near[k] = true;
  });
  const items: RowItem[] = [];
  let i = 0;
  while (i < rows.length) {
    if (near[i]) { items.push({ type: 'row', index: i }); i++; continue; }
    let j = i;
    while (j < rows.length && !near[j]) j++;
    if (j - i < minGap) for (let k = i; k < j; k++) items.push({ type: 'row', index: k });
    else items.push({ type: 'gap', from: i, count: j - i });
    i = j;
  }
  return items;
}
