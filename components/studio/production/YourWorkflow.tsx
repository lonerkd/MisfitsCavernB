'use client';

// A person's working day, written down for their craft (lib/roles/workflows.ts): the steps in order, each in the tool it happens in
// (offered only if they can open it), and what they receive and hand on. It never hides a tool; it says what to do next.
import React from 'react';
import { ListChecks } from 'lucide-react';
import { workflowFor, STAGES } from '@/lib/roles/workflows';
import type { ProductionView } from '@/lib/os/progress';
import { PRODUCTION_VIEW_LABELS } from '@/lib/os/progress';
import { cx } from '../ui';
import s from '../studio.module.css';

export function YourWorkflow({ craft, department, openable, onView }: { craft: string | null; department: string | null | undefined; openable: readonly ProductionView[]; onView: (v: ProductionView) => void }) {
  const w = workflowFor(craft, department);
  return (
    <details style={{ margin: '4px 0' }}>
      <summary style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--accent)' }}><ListChecks size={13} aria-hidden /> Your workflow{craft ? ` as ${craft}` : ''}</summary>
      <div style={{ marginTop: 8, display: 'grid', gap: 10 }}>
        {STAGES.filter((st) => (w.stages[st] ?? []).length > 0).map((st) => (
          <section key={st} aria-label={st}>
            <h4 style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--fg-muted)' }}>{st}</h4>
            <ol style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 3 }}>
              {(w.stages[st] ?? []).map((step) => (
                <li key={step.text} style={{ fontSize: 13 }}>
                  {step.text}{' '}
                  {step.tool && openable.includes(step.tool) && <button type="button" className={cx(s.chip)} onClick={() => onView(step.tool as ProductionView)} aria-label={`${step.text} Open ${PRODUCTION_VIEW_LABELS[step.tool]}`}>{PRODUCTION_VIEW_LABELS[step.tool]}</button>}
                </li>
              ))}
            </ol>
          </section>
        ))}
        <p className={s.hint} style={{ margin: 0 }}><strong>You receive:</strong> {w.receives.join(' · ')}</p>
        <p className={s.hint} style={{ margin: 0 }}><strong>You hand on:</strong> {w.hands.join(' · ')}</p>
      </div>
    </details>
  );
}
