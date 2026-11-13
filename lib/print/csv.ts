// A spreadsheet file from any printed document: its tables become CSV. Every tool that prints through the print kit gets this for free,
// because the table's columns and rows are already the data. Pure: the download itself is in `download.ts`.
import type { PrintBlock, PrintDoc } from './kit';

/** One cell, quoted when it must be. A cell that a spreadsheet would run as a formula (= + - @) gets a leading apostrophe, so a typed value
 *  such as "=HYPERLINK(...)" is shown as text and never executed when the file is opened. */
export function csvCell(v: unknown): string {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+@]/.test(s) || /^-(?![\d.,]+$)/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function tablesOf(blocks: PrintBlock[]): Extract<PrintBlock, { type: 'table' }>[] {
  const out: Extract<PrintBlock, { type: 'table' }>[] = [];
  for (const b of blocks) {
    if (b.type === 'table') out.push(b);
    else if (b.type === 'section') out.push(...tablesOf(b.blocks));
    else if (b.type === 'columns') for (const c of b.columns) out.push(...tablesOf(c));
  }
  return out;
}

/** Does this document have a table worth a spreadsheet (at least one table with rows)? */
export function hasTable(doc: PrintDoc): boolean {
  return tablesOf(doc.blocks).some((t) => t.rows.length > 0);
}

/** The document's tables as CSV: a header row and the rows of each table, with a blank line between tables, and a totals row where there is one.
 *  Line breaks are CRLF, as spreadsheets expect. */
export function docToCsv(doc: PrintDoc): string {
  const parts: string[] = [];
  for (const t of tablesOf(doc.blocks)) {
    if (t.rows.length === 0) continue;
    const lines = [t.columns.map((c) => csvCell(c.label)).join(',')];
    for (const r of t.rows) lines.push(t.columns.map((c) => csvCell(r[c.key])).join(','));
    if (t.totals) lines.push(t.columns.map((c) => csvCell(t.totals![c.key])).join(','));
    parts.push(lines.join('\r\n'));
  }
  return parts.join('\r\n\r\n');
}

/** A safe file name from a document's title: letters, digits and dashes. */
export function csvFileName(doc: PrintDoc): string {
  const base = `${doc.kind}-${doc.title}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  return `${base || 'export'}.csv`;
}
