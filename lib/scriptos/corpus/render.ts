// The same labelled script, written out the ways a script really arrives:
// as Fountain / plain text, and as the text items a PDF reader reports.

import type { Element, ElementType } from './generate';
import type { PositionedItem } from '../pdfImport';

/** One source line with its true type ('empty' for a blank line). */
export interface TruthLine { type: ElementType | 'empty'; text: string }

/** Plain text, the way it is typed: a blank line between elements, none inside a speech. */
export function renderText(elements: Element[]): { text: string; truth: TruthLine[] } {
  const truth: TruthLine[] = [];
  let prevGroup: number | null = null;
  elements.forEach((el, i) => {
    const sameSpeech = i > 0 && el.group !== null && el.group === prevGroup;
    if (i > 0 && !sameSpeech) truth.push({ type: 'empty', text: '' });
    truth.push({ type: el.type, text: el.text });
    prevGroup = el.group;
  });
  return { text: truth.map((l) => l.text).join('\n') + '\n', truth };
}

// Standard US-Letter screenplay layout, in points: 12 pt Courier, 1.5 in left margin.
const COLUMN: Record<ElementType, { x: number; width: number }> = {
  slug: { x: 108, width: 60 },
  action: { x: 108, width: 60 },
  character: { x: 252, width: 38 },
  parenthetical: { x: 223, width: 25 },
  dialogue: { x: 180, width: 35 },
  transition: { x: 396, width: 20 },
};

function wrap(text: string, width: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if (cur && (cur + ' ' + w).length > width) { lines.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w;
  }
  if (cur) lines.push(cur);
  return lines;
}

/** The pages of text items a PDF reader would report for the script (55 lines a page, page numbers from page 2). */
export function renderPdfPages(elements: Element[], opts: { linesPerPage?: number; shift?: number; scale?: number } = {}): PositionedItem[][] {
  const perPage = opts.linesPerPage ?? 55;
  // Everything moves sideways by `shift` points: another page size or margin (a 1 in left margin is -36; A4 centred is about -8).
  const shift = opts.shift ?? 0;
  // Horizontal scale about the page's left edge: another page size, or another font size.
  const scale = opts.scale ?? 1;
  const px = (x: number) => x * scale + shift;
  const rows: Array<{ str: string; x: number } | null> = [];
  let prevGroup: number | null = null;
  elements.forEach((el, i) => {
    const sameSpeech = i > 0 && el.group !== null && el.group === prevGroup;
    if (i > 0 && !sameSpeech) rows.push(null);
    const col = COLUMN[el.type];
    for (const line of wrap(el.text, col.width)) rows.push({ str: line, x: px(col.x) });
    prevGroup = el.group;
  });
  const pages: PositionedItem[][] = [];
  for (let start = 0; start < rows.length; start += perPage) {
    const items: PositionedItem[] = [];
    const pageNo = pages.length + 1;
    if (pageNo > 1) items.push({ str: `${pageNo}.`, transform: [12, 0, 0, 12, px(540), 740] });
    rows.slice(start, start + perPage).forEach((row, r) => {
      if (row) items.push({ str: row.str, transform: [12, 0, 0, 12, row.x, 700 - r * 12] });
    });
    pages.push(items);
  }
  return pages;
}
