// The printed cash flow: money out week by week against the planned budget. Built on the print kit; the view hands over the same
// `cashFlow()` result it shows, so the page and the screen cannot disagree.
import type { PrintDoc } from '@/lib/print/kit';
import type { CashFlow } from './cash-flow';

export interface CashFlowPrintInput {
  project: string;
  accent?: string | null;
  logo?: string | null;
  flow: CashFlow;
  format: (n: number) => string;
  /** Formats a YYYY-MM-DD for the page. */
  date: (iso: string) => string;
  generated: string;
}

export function cashFlowDoc(i: CashFlowPrintInput): PrintDoc {
  const f = i.format;
  const dash = (n: number) => (n ? f(n) : '—');
  const c = i.flow;
  const rows = c.weeks.map((w) => ({
    week: `${i.date(w.start)} – ${i.date(w.end)}${w.crossing ? ' (over budget from here)' : ''}`,
    paid: dash(w.paid), committed: dash(w.committed), labour: dash(w.labour), total: f(w.total), running: f(w.running),
  }));
  if (c.undated.total) rows.push({ week: 'No date', paid: dash(c.undated.paid), committed: dash(c.undated.committed), labour: dash(c.undated.labour), total: f(c.undated.total), running: f(c.spent) });
  if (c.remaining) rows.push({ week: 'Planned, not yet scheduled', paid: '—', committed: '—', labour: '—', total: f(c.remaining), running: f(c.planned) });
  return {
    title: 'Cash flow',
    kind: 'Money out by week',
    subtitle: i.project,
    accent: i.accent, logo: i.logo,
    meta: [['Planned', f(c.planned)], ['Out so far', f(c.spent)], [c.overBy ? 'Over by' : 'Not yet spent', f(c.overBy || c.remaining)]],
    blocks: [
      ...(c.overBy ? [{ type: 'note' as const, tone: 'warn' as const, text: `Spend is ${f(c.overBy)} over the planned budget${c.crossingWeek ? `, from the week of ${i.date(c.crossingWeek)}` : ''}.` }] : []),
      {
        type: 'table' as const,
        columns: [
          { key: 'week', label: 'Week' },
          { key: 'paid', label: 'Paid', align: 'right' as const, width: '13%' },
          { key: 'committed', label: 'Committed', align: 'right' as const, width: '13%' },
          { key: 'labour', label: 'Labour', align: 'right' as const, width: '13%' },
          { key: 'total', label: 'Out', align: 'right' as const, width: '13%' },
          { key: 'running', label: 'Running total', align: 'right' as const, width: '15%' },
        ],
        rows,
        empty: 'Nothing spent or committed yet.',
      },
      ...(c.pendingHours || c.unratedHours ? [{ type: 'note' as const, text: `Not counted yet: ${c.pendingHours} submitted hours waiting for approval, ${c.unratedHours} approved hours with no rate.` }] : []),
    ],
    footer: i.project,
    generated: i.generated,
  };
}
