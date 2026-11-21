'use client';

import React, { useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import { money } from '@/lib/studio';
import { cashFlow } from '@/lib/studio/cash-flow';
import { cashFlowDoc } from '@/lib/studio/cash-flow-print';
import type { BudgetLine } from '@/lib/studio/money';
import type { Expense, Timesheet } from '@/lib/studio';
import { PrintButton } from '@/components/ui/PrintButton';
import { ToolHeader } from '../ToolHeader';
import { useStudio } from '../StudioContext';
import s from '../studio.module.css';

const short = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' });
const long = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

const cell = { padding: 6, textAlign: 'right' } as const;
const rule = '1px solid rgba(var(--ink-rgb), 0.06)';

/**
 * Money out by week, from the project's own spend and hours (`lib/studio/cash-flow.ts`): paid on the day paid, committed on its date,
 * approved labour on the day worked, a running total against the planned budget, and the week it first goes over. Shown to people who
 * can read the budget (the caller decides).
 */
export function CashFlowSection({ lines, expenses, timesheets }: { lines: BudgetLine[]; expenses: Expense[]; timesheets: Timesheet[] }) {
  const { project } = useStudio();
  const flow = useMemo(() => cashFlow(lines, expenses, timesheets), [lines, expenses, timesheets]);
  const dash = (v: number) => (v ? money(v) : '—');
  const empty = flow.weeks.length === 0 && flow.undated.total === 0;
  const over = <span style={{ color: 'var(--danger)', marginLeft: 8, fontWeight: 600 }}>Over budget from here</span>;

  return (
    <section aria-label="Cash flow" className={s.stack} style={{ gap: 12 }}>
      <ToolHeader icon={<TrendingUp size={16} />} eyebrow="Money" title="Cash flow" purpose="Money out week by week, against the planned budget." accent={project.accent_color}
        next={flow.overBy > 0 ? { text: `Spend is ${money(flow.overBy)} over the plan${flow.crossingWeek ? `, from the week of ${short(flow.crossingWeek)}` : ''}.` } : null}
        actions={<PrintButton label="the cash flow" build={() => cashFlowDoc({ project: project.title, accent: project.accent_color, logo: project.logo_url, flow, format: money, date: long, generated: long(new Date().toISOString().slice(0, 10)) })} />} />
      {empty ? (
        <p className={s.hint}>Nothing spent or committed yet. Add spend below and it lands here on its date.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 520 }}>
            <caption className="sr-only">Money out by week: paid, committed, labour, the week&apos;s total and the running total against the planned budget of {money(flow.planned)}</caption>
            <thead>
              <tr className={s.hint} style={{ textAlign: 'left' }}>
                <th scope="col" style={{ padding: 6, fontWeight: 400 }}>Week</th>
                {['Paid', 'Committed', 'Labour', 'Out', 'Running total'].map((h) => <th key={h} scope="col" style={{ ...cell, fontWeight: 400 }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {flow.weeks.map((w) => (
                <tr key={w.start} data-over={w.over ? 'true' : undefined} data-crossing={w.crossing ? 'true' : undefined}
                  style={{ borderTop: rule, background: w.crossing ? 'color-mix(in srgb, var(--danger) 12%, transparent)' : undefined }}>
                  <th scope="row" style={{ padding: 6, textAlign: 'left', fontWeight: w.crossing ? 600 : 400 }}>{short(w.start)} – {short(w.end)}{w.crossing && over}</th>
                  <td style={cell}>{dash(w.paid)}</td>
                  <td style={cell}>{dash(w.committed)}</td>
                  <td style={cell}>{dash(w.labour)}</td>
                  <td style={cell}>{money(w.total)}</td>
                  <td style={{ ...cell, fontWeight: 600, color: w.over ? 'var(--danger)' : undefined }}>{money(w.running)}</td>
                </tr>
              ))}
              {flow.undated.total > 0 && (
                <tr style={{ borderTop: rule }}>
                  <th scope="row" style={{ padding: 6, textAlign: 'left', fontWeight: 400 }}>No date{flow.crossingUndated && over}</th>
                  <td style={cell}>{dash(flow.undated.paid)}</td>
                  <td style={cell}>{dash(flow.undated.committed)}</td>
                  <td style={cell}>{dash(flow.undated.labour)}</td>
                  <td style={cell}>{money(flow.undated.total)}</td>
                  <td style={{ ...cell, fontWeight: 600, color: flow.crossingUndated ? 'var(--danger)' : undefined }}>{money(flow.spent)}</td>
                </tr>
              )}
              {flow.remaining > 0 && (
                <tr style={{ borderTop: '1px solid rgba(var(--ink-rgb), 0.12)' }}>
                  <th scope="row" style={{ padding: 6, textAlign: 'left', fontWeight: 400 }}>Planned, not yet scheduled</th>
                  <td style={cell}>—</td>
                  <td style={cell}>—</td>
                  <td style={cell}>—</td>
                  <td style={cell}>{money(flow.remaining)}</td>
                  <td style={cell}>{money(flow.planned)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {(flow.pendingHours > 0 || flow.unratedHours > 0) && (
        <p className={s.hint}>Not counted yet: {flow.pendingHours > 0 ? `${flow.pendingHours} submitted hours waiting for approval` : ''}{flow.pendingHours > 0 && flow.unratedHours > 0 ? ', ' : ''}{flow.unratedHours > 0 ? `${flow.unratedHours} approved hours with no rate` : ''}.</p>
      )}
    </section>
  );
}
