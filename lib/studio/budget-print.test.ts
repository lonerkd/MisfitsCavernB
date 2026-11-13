import { describe, it, expect } from 'vitest';
import { budgetDoc, type BudgetPrintInput } from './budget-print';
import { printHtml } from '@/lib/print/kit';

const fmt = (n: number) => `USD ${n.toFixed(0)}`;
const input = (over: Partial<BudgetPrintInput> = {}): BudgetPrintInput => ({
  project: 'The Pier', accent: null, format: fmt, generated: 'd', labourPaid: 0, unassigned: { committed: 0, paid: 0 },
  lines: [{ label: 'Camera — kit', planned: 1000, committed: 200, paid: 300, left: 500 }, { label: 'Food', planned: 400, committed: 0, paid: 500, left: -100 }],
  totals: { planned: 1400, committed: 200, paid: 800, left: 400 }, ...over,
});

describe('the printed budget', () => {
  it('shows planned, committed, paid and left for each line, with a total row', () => {
    const html = printHtml(budgetDoc(input()));
    for (const s of ['Camera — kit', 'USD 1000', 'USD 200', 'USD 300', 'USD 500', 'USD 100 over', '>Total<', '<dt>Left</dt><dd>USD 400</dd>']) expect(html).toContain(s);
    expect(html).toContain('<td class="right">—</td>'); // Food has nothing committed
    expect(html).not.toContain('over its planned budget');
  });
  it('warns when the project is over, and notes labour and money on no line', () => {
    const html = printHtml(budgetDoc(input({ totals: { planned: 1000, committed: 0, paid: 1200, left: -200 }, labourPaid: 150, unassigned: { committed: 40, paid: 60 } })));
    expect(html).toContain('The project is USD 200 over its planned budget.');
    expect(html).toContain('<dt>Over by</dt><dd>USD 200</dd>');
    expect(html).toContain('Paid includes USD 150 of approved labour.');
    expect(html).toContain('Not on any budget line: USD 40 committed, USD 60 paid.');
  });
  it('says so when there are no lines', () => {
    expect(printHtml(budgetDoc(input({ lines: [] })))).toContain('No budget lines yet.');
  });
});
