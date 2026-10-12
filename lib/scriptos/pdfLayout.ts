// Reads a screenplay PDF from where its text actually sits on the page.
//
// A screenplay is a grid: action and headings at the left margin, dialogue
// indented, parentheticals further, cues further still, transitions at the
// right. But WHERE depends on the file — page size, margins, font — so nothing
// here knows a coordinate. It learns the document's own columns from the lines
// themselves, decides what each column is from what is in it, and only then reads
// the lines: respecting the blank-line gaps between elements, dropping page
// furniture by position, and writing out plain structured text (a cue with its
// speech directly under it, a blank line between elements) for the parser.

import type { PositionedItem } from './pdfImport';

interface VLine { text: string; x: number; y: number; page: number; size: number; /** A scene number printed in the margin of a heading. */ sceneNo?: string }
type Role = 'action' | 'dialogue' | 'parenthetical' | 'character' | 'transition' | 'margin';
interface Column { x: number; count: number }

const HEADING = /^\s*(?:\d+[A-Z]?\.?\s+)?(?:INTERIOR|EXTERIOR|INT\.?\/EXT\.?|EXT\.?\/INT\.?|INT|EXT|EST|I\/E|E\/I)\b/i;
const TRANSITION = /^(?:FADE (?:IN|OUT|TO)|CUT TO|DISSOLVE TO|SMASH CUT|MATCH CUT|JUMP CUT|FLASH CUT|WIPE TO|IRIS (?:IN|OUT)|INTERCUT|BACK TO|TIME CUT|MORPH TO|BLACKOUT|SLAM TO|QUICK CUT|HARD CUT|CROSSFADE)\b|\bTO:$/i;
const FURNITURE = /^\(?\s*(?:CONTINUED|MORE|CONT'?D)\s*\)?:?$/i;
const PAGE_NUMBER = /^\d{1,3}[A-Z]?\.?$/;
const SCENE_NUMBER = /^\d{1,3}[A-Z]{0,2}\.?$/;

const hasCase = (c: string) => c !== c.toLowerCase() || c !== c.toUpperCase();
const isCaps = (t: string) => [...t].some(hasCase) && t === t.toUpperCase();
const hasLower = (t: string) => [...t].some((c) => hasCase(c) && c === c.toLowerCase());
/** A short line that is a name: capitals, or any letters in a script with none; no sentence punctuation; not a heading or a transition. */
function cueLike(t: string): boolean {
  const bare = t.replace(/\s*\([^)]*\)\s*$/, '').trim();
  if (!bare || bare.length > 40 || HEADING.test(bare) || TRANSITION.test(bare) || /[.!?…。！？,，、;:]$/.test(bare)) return false;
  return [...bare].some(hasCase) ? isCaps(bare) : /\p{L}/u.test(bare);
}
/** Running text rather than a name: lower-case letters, or (in a script with no case) a line that is not name-like. */
function proseLike(t: string): boolean {
  return hasLower(t) || (![...t].some(hasCase) && /\p{L}/u.test(t) && !cueLike(t));
}
const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };

// ── 1. visual lines ───────────────────────────────────────────────────────────

/** Items on one row (within a few points of each other vertically) become one line, left to right. */
function groupLines(items: PositionedItem[], page: number): VLine[] {
  const sorted = [...items].filter((i) => i.str !== '').sort((a, b) => (b.transform[5] - a.transform[5]) || (a.transform[4] - b.transform[4]));
  const rows: PositionedItem[][] = [];
  for (const it of sorted) {
    const row = rows[rows.length - 1];
    const size = Math.abs(it.transform[3]) || 12;
    if (row && Math.abs(row[0].transform[5] - it.transform[5]) <= Math.max(2, size * 0.3)) row.push(it); else rows.push([it]);
  }
  const lines: VLine[] = [];
  for (const row of rows) {
    row.sort((a, b) => a.transform[4] - b.transform[4]);
    // A scene number standing apart in the left or right margin of a row is not part of the line.
    let cells = row;
    let sceneNo: string | undefined;
    const apart = (a: PositionedItem, b: PositionedItem) => b.transform[4] - (a.transform[4] + a.str.length * (Math.abs(a.transform[3]) || 12) * 0.6) > (Math.abs(a.transform[3]) || 12) * 1.2;
    if (cells.length >= 2 && SCENE_NUMBER.test(cells[0].str.trim()) && apart(cells[0], cells[1])) { sceneNo = cells[0].str.trim().replace(/\.$/, ''); cells = cells.slice(1); }
    if (cells.length >= 2 && SCENE_NUMBER.test(cells[cells.length - 1].str.trim()) && apart(cells[cells.length - 2], cells[cells.length - 1])) cells = cells.slice(0, -1);
    let text = '';
    let prevEnd = 0;
    for (const it of cells) {
      const size = Math.abs(it.transform[3]) || 12;
      const x = it.transform[4];
      const width = (it as { width?: number }).width ?? it.str.length * size * 0.6;
      if (text && x - prevEnd > size * 0.25 && !text.endsWith(' ') && !it.str.startsWith(' ')) text += ' ';
      text += it.str;
      prevEnd = x + width;
    }
    text = text.replace(/\s+/g, ' ').trim();
    if (text) lines.push({ text, x: cells[0].transform[4], y: cells[0].transform[5], page, size: Math.abs(cells[0].transform[3]) || 12, sceneNo });
  }
  return lines;
}

// ── 2. the document's own columns ─────────────────────────────────────────────

function findColumns(lines: VLine[]): Column[] {
  const bins = new Map<number, number>();
  for (const l of lines) bins.set(Math.round(l.x / 3), (bins.get(Math.round(l.x / 3)) ?? 0) + 1);
  const raw = [...bins.entries()].sort((a, b) => a[0] - b[0]);
  const cols: { sum: number; w: number }[] = [];
  let last = -99;
  for (const [bin, n] of raw) {
    if (bin - last <= 2 && cols.length) { const c = cols[cols.length - 1]; c.sum += bin * 3 * n; c.w += n; } else cols.push({ sum: bin * 3 * n, w: n });
    last = bin;
  }
  // A column is where several lines start; in a very short document a single line may be all there is of one.
  const floor = lines.length < 40 ? 1 : Math.max(3, Math.round(lines.length * 0.02));
  return cols.filter((c) => c.w >= floor).map((c) => ({ x: c.sum / c.w, count: c.w }));
}

const near = (l: VLine, c: Column) => Math.abs(l.x - c.x) <= 9;

/** What each column is, from what is in it — never from where it is. */
function assignRoles(cols: Column[], lines: VLine[]): Map<Column, Role> {
  const roles = new Map<Column, Role>();
  if (!cols.length) return roles;
  const stat = (c: Column) => {
    const ls = lines.filter((l) => near(l, c));
    const n = Math.max(1, ls.length);
    return {
      n: ls.length,
      heading: ls.filter((l) => HEADING.test(l.text)).length / n,
      paren: ls.filter((l) => l.text.startsWith('(')).length / n,
      transition: ls.filter((l) => isCaps(l.text) && TRANSITION.test(l.text)).length / n,
      capsShort: ls.filter((l) => cueLike(l.text)).length / n,
      lower: ls.filter((l) => proseLike(l.text)).length / n,
    };
  };
  const stats = new Map(cols.map((c) => [c, stat(c)]));
  // The action column is where the headings are; failing that, the leftmost column with prose.
  const byHeading = [...cols].sort((a, b) => stats.get(b)!.heading * stats.get(b)!.n - stats.get(a)!.heading * stats.get(a)!.n)[0];
  const action = stats.get(byHeading)!.heading > 0 ? byHeading : (cols.find((c) => stats.get(c)!.lower > 0.4) ?? cols[0]);
  roles.set(action, 'action');
  const right = cols.filter((c) => c !== action && c.x > action.x + 20).sort((a, b) => a.x - b.x);
  for (const c of cols) if (c !== action && c.x <= action.x + 20) roles.set(c, 'margin');
  const free = [...right];
  const take = (role: Role, pick: (s: ReturnType<typeof stat>) => number, min: number) => {
    const best = free.map((c) => ({ c, v: pick(stats.get(c)!) })).filter((e) => e.v >= min).sort((a, b) => b.v - a.v)[0];
    if (best) { roles.set(best.c, role); free.splice(free.indexOf(best.c), 1); }
  };
  take('parenthetical', (s) => s.paren, 0.6);
  take('transition', (s) => s.transition, 0.5);
  take('character', (s) => s.capsShort, 0.55);
  take('dialogue', (s) => s.lower * Math.min(1, s.n / 2), 0.3);
  // A column between the action margin and the cue column is dialogue, whatever is in it (shouting has no lower case).
  const cueCol = [...roles.entries()].find(([, r]) => r === 'character')?.[0];
  if (cueCol && ![...roles.values()].includes('dialogue')) {
    const between = free.filter((c) => c.x > action.x + 20 && c.x < cueCol.x - 20).sort((x, y) => y.count - x.count)[0];
    if (between) { roles.set(between, 'dialogue'); free.splice(free.indexOf(between), 1); }
  }
  // Anything left sits with its nearest named neighbour.
  for (const c of free) {
    const named = [...roles.entries()].filter(([k]) => k !== c).sort((a, b) => Math.abs(a[0].x - c.x) - Math.abs(b[0].x - c.x))[0];
    roles.set(c, named ? named[1] : 'action');
  }
  return roles;
}

// ── 3. elements ───────────────────────────────────────────────────────────────

type Kind = 'heading' | 'action' | 'cue' | 'parenthetical' | 'dialogue' | 'transition';
interface Element { kind: Kind; text: string; page: number; bottom: number }

/** Plain structured text for the whole document. */
export function layoutPages(pages: PositionedItem[][]): string {
  const perPage = pages.map((items, i) => groupLines(items, i + 1));
  const all = perPage.flat();
  if (!all.length) return '';
  const evidence = all.filter((l) => !FURNITURE.test(l.text) && !PAGE_NUMBER.test(l.text));
  const cols = findColumns(evidence);
  const roles = assignRoles(cols, evidence);
  const actionX = [...roles.entries()].find(([, r]) => r === 'action')?.[0].x ?? Math.min(...all.map((l) => l.x));
  const maxX = Math.max(...all.map((l) => l.x));
  const lineHeight = median(all.map((l) => l.size)) || 12; // a screenplay is set solid: one blank line is two of these

  const roleOf = (l: VLine): Role => {
    const col = [...roles.keys()].sort((a, b) => Math.abs(a.x - l.x) - Math.abs(b.x - l.x))[0];
    return col ? roles.get(col)! : 'action';
  };

  const elements: Element[] = [];
  let more = false; // a (MORE) / (CONT'D) marker was seen: the next dialogue continues the speech above
  for (const ls of perPage) {
    ls.forEach((l, li) => {
      const role = roleOf(l);
      const text = l.text;
      // Page furniture, by what it says and where it sits.
      if (FURNITURE.test(text)) { more = true; return; }
      const topOrBottom = li === 0 || li === ls.length - 1;
      if (PAGE_NUMBER.test(text) && (topOrBottom || l.x > actionX + (maxX - actionX) * 0.9)) return;
      if (role === 'margin' && SCENE_NUMBER.test(text)) return;
      if (SCENE_NUMBER.test(text) && l.x > maxX + 1) return;

      const prev = elements[elements.length - 1];
      const gap = prev && prev.page === l.page ? prev.bottom - l.y : Infinity;
      const breaks = gap > lineHeight * 1.55;
      const sameBlock = (k: Kind) => !!prev && prev.kind === k && !breaks;
      let el: Element | null = null;

      if (role === 'transition' || (role === 'action' && isCaps(text) && TRANSITION.test(text) && text.length < 40)) el = { kind: 'transition', text, page: l.page, bottom: l.y };
      else if (role === 'parenthetical') {
        if (prev && prev.kind === 'parenthetical' && !breaks && !prev.text.endsWith(')')) { prev.text += ' ' + text; prev.bottom = l.y; return; }
        el = { kind: 'parenthetical', text, page: l.page, bottom: l.y };
      } else if (role === 'character') {
        if (cueLike(text)) el = { kind: 'cue', text, page: l.page, bottom: l.y };
        else if (sameBlock('dialogue')) { prev!.text += ' ' + text; prev!.bottom = l.y; return; } else el = { kind: 'dialogue', text, page: l.page, bottom: l.y };
      } else if (role === 'dialogue') {
        if (sameBlock('dialogue') || (more && prev?.kind === 'dialogue')) { prev!.text += ' ' + text; prev!.bottom = l.y; prev!.page = l.page; more = false; return; }
        el = { kind: 'dialogue', text, page: l.page, bottom: l.y };
      } else if (HEADING.test(text)) el = { kind: 'heading', text: l.sceneNo ? `${text} #${l.sceneNo}#` : text, page: l.page, bottom: l.y };
      else {
        if (sameBlock('action')) { prev!.text += ' ' + text; prev!.bottom = l.y; return; }
        el = { kind: 'action', text, page: l.page, bottom: l.y };
      }
      if (el.kind === 'cue' || el.kind === 'heading') more = false;
      elements.push(el);
    });
  }

  // Words hyphenated across a line break are one word again.
  const clean = (t: string) => t.replace(/(\p{L})- (\p{Ll})/gu, '$1$2').replace(/\s+/g, ' ').trim();
  const out: string[] = [];
  let inSpeech = false;
  for (const el of elements) {
    const text = clean(el.text);
    if (!text) continue;
    const speechPart = el.kind === 'parenthetical' || el.kind === 'dialogue';
    if (el.kind === 'cue') { out.push(out.length ? '\n\n' : '', text); inSpeech = true; continue; }
    if (speechPart && inSpeech) { out.push('\n', text); continue; }
    inSpeech = false;
    out.push(out.length ? '\n\n' : '', text);
  }
  return out.join('').trim();
}
