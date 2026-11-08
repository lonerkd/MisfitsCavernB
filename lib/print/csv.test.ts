import { describe, it, expect } from 'vitest';
import { csvCell, csvFileName, docToCsv, hasTable } from './csv';
import type { PrintDoc } from './kit';

const doc = (blocks: PrintDoc['blocks']): PrintDoc => ({ title: 'Budget', kind: 'The Pier', blocks });

describe('csv from a printed document', () => {
  it('quotes what must be quoted, and neutralises a typed formula', () => {
    expect(csvCell('plain')).toBe('plain');
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('two\nlines')).toBe('"two\nlines"');
    expect(csvCell(null)).toBe('');
    for (const evil of ['=HYPERLINK("http://x")', '+1+1', '@SUM(A1)', '-cmd|x']) expect(csvCell(evil).replace(/^"/, '').startsWith("'")).toBe(true);
    expect(csvCell('-12.5')).toBe('-12.5'); // a plain negative number stays a number
    expect(csvCell(42)).toBe('42');
  });

  it('writes each table with its header, its rows and its totals, tables apart by a blank line, CRLF', () => {
    const csv = docToCsv(doc([
      { type: 'section', title: 'A', blocks: [{ type: 'table', columns: [{ key: 'a', label: 'Line' }, { key: 'n', label: 'Amount' }], rows: [{ a: 'Camera, kit', n: 10 }, { a: 'Food', n: 5 }], totals: { a: 'Total', n: 15 } }] },
      { type: 'table', columns: [{ key: 'x', label: 'X' }], rows: [{ x: 1 }] },
      { type: 'table', columns: [{ key: 'x', label: 'Empty' }], rows: [] },
    ]));
    expect(csv).toBe('Line,Amount\r\n"Camera, kit",10\r\nFood,5\r\nTotal,15\r\n\r\nX\r\n1');
  });

  it('knows whether there is anything for a spreadsheet, and names the file safely', () => {
    expect(hasTable(doc([{ type: 'text', text: 'hi' }]))).toBe(false);
    expect(hasTable(doc([{ type: 'table', columns: [{ key: 'a', label: 'A' }], rows: [] }]))).toBe(false);
    expect(hasTable(doc([{ type: 'columns', columns: [[{ type: 'table', columns: [{ key: 'a', label: 'A' }], rows: [{ a: 1 }] }]] }]))).toBe(true);
    expect(csvFileName({ ...doc([]), kind: 'The Pier: 2026', title: '../Day 3 / Call sheet' })).toBe('the-pier-2026-day-3-call-sheet.csv');
    expect(csvFileName({ ...doc([]), kind: '', title: '' })).toBe('export.csv');
  });
});
