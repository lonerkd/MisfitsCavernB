// The printed budget: planned against committed, paid and left, line by line, with the totals. Built on the print kit. Pure: the view
// hands over the numbers it already shows (`moneySummary`), so the page and the screen cannot disagree.
import type { PrintBlock, PrintColumn, PrintDoc } from '@/lib/print/kit';

export interface BudgetPrintInput {
  project: string;
  accent?: string | null;
  logo?: string | null;
  /** `above` marks a line above the line; when any line is, the budget prints in two groups with subtotals. */
  lines: Array<{ label: string; planned: number; base?: number; fringe?: number; committed: number; paid: number; left: number; above?: boolean }>;
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
    accent: i.accent, logo: i.logo,
    meta: [['Planned', f(i.totals.planned)], ['Committed', f(i.totals.committed)], ['Paid', f(i.totals.paid)], [over ? 'Over by' : 'Left', over ? f(-i.totals.left) : f(i.totals.left)]],
    blocks: [
      ...(over ? [{ type: 'note' as const, tone: 'warn' as const, text: `The project is ${f(-i.totals.left)} over its planned budget.` }] : []),
      ...tables(i, dash, left),
      ...(i.labourPaid ? [{ type: 'note' as const, text: `Paid includes ${f(i.labourPaid)} of approved labour.` }] : []),
      ...(i.unassigned.committed || i.unassigned.paid ? [{ type: 'note' as const, text: `Not on any budget line: ${f(i.unassigned.committed)} committed, ${f(i.unassigned.paid)} paid.` }] : []),
    ],
    footer: i.project,
    generated: i.generated,
  };
}

function tables(i: BudgetPrintInput, dash: (n: number) => string, left: (n: number) => string): PrintBlock[] {
  const f = i.format;
  // With fringes, Base and Fringe come before Planned (= base + fringe); with none the table is what it always was.
  const fringed = i.lines.some((l) => (l.fringe ?? 0) !== 0);
  const columns: PrintColumn[] = [{ key: 'label', label: 'Line' }, ...(fringed ? [{ key: 'base', label: 'Base', align: 'right' as const, width: '11%' }, { key: 'fringe', label: 'Fringe', align: 'right' as const, width: '10%' }] : []), { key: 'planned', label: 'Planned', align: 'right', width: '14%' }, { key: 'committed', label: 'Committed', align: 'right', width: '14%' }, { key: 'paid', label: 'Paid', align: 'right', width: '14%' }, { key: 'left', label: 'Left', align: 'right', width: '16%' }];
  type L = BudgetPrintInput['lines'][number];
  const baseOf = (l: L) => l.base ?? l.planned - (l.fringe ?? 0);
  const fr = (rows: L[]) => (fringed ? { base: f(rows.reduce((n, l) => n + baseOf(l), 0)), fringe: dash(rows.reduce((n, l) => n + (l.fringe ?? 0), 0)) } : {});
  const row = (l: L) => ({ label: l.label, ...(fringed ? { base: f(baseOf(l)), fringe: dash(l.fringe ?? 0) } : {}), planned: f(l.planned), committed: dash(l.committed), paid: dash(l.paid), left: left(l.left) });
  const sum = (rows: L[], k: 'planned' | 'committed' | 'paid' | 'left') => rows.reduce((n, l) => n + l[k], 0);
  if (!i.lines.some((l) => l.above)) {
    return [{
      type: 'table', columns, rows: i.lines.map(row),
      totals: { label: 'Total', ...fr(i.lines), planned: f(i.totals.planned), committed: f(i.totals.committed), paid: f(i.totals.paid), left: left(i.totals.left) },
      empty: 'No budget lines yet.',
    }];
  }
  const group = (title: string, rows: L[]): PrintBlock[] => rows.length ? [{
    type: 'table', title, columns, rows: rows.map(row),
    totals: { label: 'Subtotal', ...fr(rows), planned: f(sum(rows, 'planned')), committed: f(sum(rows, 'committed')), paid: f(sum(rows, 'paid')), left: left(sum(rows, 'left')) },
  }] : [];
  return [...group('Above the line', i.lines.filter((l) => l.above)), ...group('Below the line', i.lines.filter((l) => !l.above))];
}
