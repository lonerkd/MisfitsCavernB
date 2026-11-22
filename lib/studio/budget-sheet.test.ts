// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { budgetSpreadsheetXml, budgetSpreadsheetName, safeText } from './budget-sheet';
import { moneySummary } from './money';

const lines = [
  { id: 'a', category: 'Director', description: 'Prep & shoot', amount: 5000, above_the_line: true },
  { id: 'b', category: 'Camera', description: '=HYPERLINK("http://x")', amount: 1200.5 },
  { id: 'c', category: 'Camera', description: '<Rental> "A"', amount: 800 },
];
const spend = [
  { id: 's1', budget_item_id: 'b', amount: 300, status: 'paid' },
  { id: 's2', budget_item_id: 'c', amount: 100, status: 'committed' },
  { id: 's3', budget_item_id: null, amount: 50, status: 'paid' },
];

function build() {
  const sum = moneySummary(lines, spend, [{ user_id: 'u', hours: 10, rate: 20, status: 'approved' }]);
  const by = new Map(lines.map((l) => [l.id, l]));
  const xml = budgetSpreadsheetXml({
    project: 'My <Film> & Co', totals: sum.totals, labourPaid: sum.labour.paid, unassigned: sum.unassigned, generated: '22 Nov 2026',
    lines: sum.lines.map((l) => ({ category: by.get(l.id)!.category, description: by.get(l.id)!.description, planned: l.planned, committed: l.committed, paid: l.paid, left: l.left, above: l.id === 'a' })),
  });
  return { sum, xml };
}

function cells(xml: string) {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  expect(doc.getElementsByTagName('parsererror').length).toBe(0);
  return [...doc.getElementsByTagName('Row')].map((r) => [...r.getElementsByTagName('Cell')].map((c) => c.getElementsByTagName('Data')[0]?.textContent ?? ''));
}

describe('budget spreadsheet', () => {
  it('is well-formed XML with above and below the line, category totals and group totals', () => {
    const rows = cells(build().xml);
    const col1 = rows.map((r) => r[1]);
    expect(col1).toEqual(expect.arrayContaining(['Total Director', 'Total Camera', 'Total Above the line', 'Total Below the line', 'GRAND TOTAL']));
    expect(rows.find((r) => r[0] === 'ABOVE THE LINE')).toBeTruthy();
    expect(rows.find((r) => r[0] === 'BELOW THE LINE')).toBeTruthy();
  });

  it('grand total equals the totals the screen shows, and the line rows add up', () => {
    const { sum, xml } = build();
    const rows = cells(xml);
    const grand = rows.find((r) => r[1] === 'GRAND TOTAL')!;
    expect(grand.slice(3).map(Number)).toEqual([sum.totals.planned, sum.totals.committed, sum.totals.paid, sum.totals.left]);
    const camera = rows.find((r) => r[1] === 'Total Camera')!;
    expect(camera.slice(3).map(Number)).toEqual([2000.5, 100, 300, 1600.5]);
    const lineRows = rows.filter((r) => /^\d{4}$/.test(r[0]));
    expect(lineRows.reduce((n, r) => n + Number(r[3]), 0)).toBe(sum.totals.planned);
  });

  it('shows spend on no line and approved labour on their own rows', () => {
    const rows = cells(build().xml);
    expect(rows.find((r) => r[1] === 'Not on a budget line')?.slice(4, 6)).toEqual(['0', '50']);
    expect(rows.find((r) => r[1] === 'Approved labour')?.[5]).toBe('200');
  });

  it('escapes markup and never lets a typed value run as a formula', () => {
    const { xml } = build();
    expect(xml).not.toContain('<Rental>');
    const rows = cells(xml);
    expect(rows.flat()).toContain('<Rental> "A"');
    expect(rows.flat()).toContain("'=HYPERLINK(\"http://x\")");
    expect(rows[0][0]).toBe('My <Film> & Co');
    expect(safeText('-5 apples')).toBe("'-5 apples");
    expect(safeText('Plain')).toBe('Plain');
  });

  it('is one flat budget with no groups when nothing is above the line', () => {
    const xml = budgetSpreadsheetXml({ project: 'P', lines: [{ category: 'Misc', planned: 10, committed: 0, paid: 0, left: 10 }], totals: { planned: 10, committed: 0, paid: 0, left: 10 }, labourPaid: 0, unassigned: { committed: 0, paid: 0 }, generated: 'x' });
    const col0 = cells(xml).map((r) => r[0]);
    expect(col0).toContain('BUDGET');
    expect(col0).not.toContain('ABOVE THE LINE');
  });

  it('names the file from the project', () => {
    expect(budgetSpreadsheetName('My Film: Part 2!')).toBe('budget-my-film-part-2.xml');
    expect(budgetSpreadsheetName('???')).toBe('budget-project.xml');
  });
});

describe('the sheet with fringes', () => {
  const fringed = (over = {}) => budgetSpreadsheetXml({
    project: 'P', labourPaid: 0, unassigned: { committed: 0, paid: 0 }, generated: 'd',
    totals: { planned: 1215, committed: 0, paid: 0, left: 1215 },
    lines: [{ category: 'Gaffer', planned: 1215, base: 1000, fringe: 215, committed: 0, paid: 0, left: 1215 }],
    ...over,
  });
  it('adds Base and Fringe columns before Planned, and the grand total is the fringed total', () => {
    const rows = cells(fringed());
    const head = rows.find((r) => r[0] === 'Account')!;
    expect(head.slice(3, 6)).toEqual(['Base', 'Fringe', 'Planned']);
    const grand = rows.find((r) => r[1] === 'GRAND TOTAL')!;
    expect(grand.slice(3, 6)).toEqual(['1000', '215', '1215']);
  });
  it('is the same sheet as before when there are no fringes', () => {
    const rows = cells(fringed({ lines: [{ category: 'Gaffer', planned: 1000, committed: 0, paid: 0, left: 1000 }], totals: { planned: 1000, committed: 0, paid: 0, left: 1000 } }));
    expect(rows.find((r) => r[0] === 'Account')).toEqual(['Account', 'Category', 'Description', 'Planned', 'Committed', 'Paid', 'Left (negative is over)']);
  });
});
