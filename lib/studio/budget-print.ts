// The printed budget: planned against committed, paid and left, line by line, with the totals. Built on the print kit. Pure: the view
// hands over the numbers it already shows (`moneySummary`), so the page and the screen cannot disagree.
import type { PrintDoc } from '@/lib/print/kit';

export interface BudgetPrintInput {
  project: string;
  accent?: string | null;
  lines: Array<{ label: string; planned: number; committed: number; paid: number; left: number }>;
  totals: { planned: number; committed: number; paid: number; left: number };
  /** Approved labour already counted in "paid", when there is some. */
  labourPaid: number;
  /** Committed and paid money not on any budget line. */
  unassigned: { committed: number; paid: number };
  format: (n: number) => string;
  generated: string;
}

export function budgetDoc(i: BudgetPrintInput): PrintDoc {
  const f = i.format;
  const dash = (n: number) => (n ? f(n) : '—');
  const left = (n: number) => (n < 0 ? `${f(-n)} over` : f(n));
  const over = i.totals.left < 0;
  return {
    title: 'Budget',
    kind: 'Budget vs spend',
    subtitle: i.project,
    accent: i.accent,
    meta: [['Planned', f(i.totals.planned)], ['Committed', f(i.totals.committed)], ['Paid', f(i.totals.paid)], [over ? 'Over by' : 'Left', over ? f(-i.totals.left) : f(i.totals.left)]],
    blocks: [
      ...(over ? [{ type: 'note' as const, tone: 'warn' as const, text: `The project is ${f(-i.totals.left)} over its planned budget.` }] : []),
      {
        type: 'table',
        columns: [{ key: 'label', label: 'Line' }, { key: 'planned', label: 'Planned', align: 'right', width: '14%' }, { key: 'committed', label: 'Committed', align: 'right', width: '14%' }, { key: 'paid', label: 'Paid', align: 'right', width: '14%' }, { key: 'left', label: 'Left', align: 'right', width: '16%' }],
        rows: i.lines.map((l) => ({ label: l.label, planned: f(l.planned), committed: dash(l.committed), paid: dash(l.paid), left: left(l.left) })),
        totals: { label: 'Total', planned: f(i.totals.planned), committed: f(i.totals.committed), paid: f(i.totals.paid), left: left(i.totals.left) },
        empty: 'No budget lines yet.',
      },
      ...(i.labourPaid ? [{ type: 'note' as const, text: `Paid includes ${f(i.labourPaid)} of approved labour.` }] : []),
      ...(i.unassigned.committed || i.unassigned.paid ? [{ type: 'note' as const, text: `Not on any budget line: ${f(i.unassigned.committed)} committed, ${f(i.unassigned.paid)} paid.` }] : []),
    ],
    footer: i.project,
    generated: i.generated,
  };
}
