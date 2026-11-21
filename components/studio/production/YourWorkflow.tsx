'use client';

// A person's working day, written down for their craft (lib/roles/workflows.ts): the steps in order, each in the tool it happens in
// (offered only if they can open it), and what they receive and hand on. It never hides a tool; it says what to do next.
import React, { useEffect, useState } from 'react';
import { ListChecks, Circle, CheckCircle2 } from 'lucide-react';
import { workflowFor, STAGES } from '@/lib/roles/workflows';
import type { ProductionView, ProjectSignals } from '@/lib/os/progress';
import { readiness, readySummary, recordKindsNeeded } from '@/lib/roles/readiness';
import { listRecords, type RecordKind } from '@/lib/supabase/productionRecords';
import { PRODUCTION_VIEW_LABELS } from '@/lib/os/progress';
import { cx } from '../ui';
import s from '../studio.module.css';

export function YourWorkflow({ craft, department, openable, onView, projectId, signals }: { craft: string | null; department: string | null | undefined; openable: readonly ProductionView[]; onView: (v: ProductionView) => void; projectId?: string; signals?: ProjectSignals | null }) {
  const w = workflowFor(craft, department);
  // A step is ready when its tool holds real data. Record counts are read as this person sees them (RLS), only for the kinds their steps use.
  const [recordCounts, setRecordCounts] = useState<Record<string, number>>({});
  const kinds = recordKindsNeeded(w, STAGES).join(',');
  useEffect(() => {
    if (!projectId || !kinds) return;
    let live = true;
    Promise.all(kinds.split(',').map(async (k) => [k, (await listRecords(projectId, k as RecordKind)).length] as const))
      .then((rows) => { if (live) setRecordCounts(Object.fromEntries(rows)); })
      .catch(() => { /* unknown, so no tick is shown */ });
    return () => { live = false; };
  }, [projectId, kinds]);
  const ev = { signals: signals ?? null, recordCounts };
  const prep = readySummary(readiness(w, 'Prep', ev));
  return (
    <details style={{ margin: '4px 0' }}>
      <summary style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--accent)' }}><ListChecks size={13} aria-hidden /> Your workflow{craft ? ` as ${craft}` : ''}{prep ? ` · Prep: ${prep.ready} of ${prep.total} ready` : ''}</summary>
      <div style={{ marginTop: 8, display: 'grid', gap: 10 }}>
        {STAGES.filter((st) => (w.stages[st] ?? []).length > 0).map((st) => (
          <section key={st} aria-label={st}>
            <h4 style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--fg-muted)' }}>{st}</h4>
            <ol style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 3 }}>
              {readiness(w, st, ev).map(({ step, done }) => (
                <li key={step.text} style={{ fontSize: 13 }}>
                  {done !== null && (done ? <CheckCircle2 size={13} aria-label="Ready" style={{ color: 'var(--accent)', verticalAlign: '-2px', marginRight: 4 }} /> : <Circle size={13} aria-label="Not started" style={{ color: 'var(--fg-muted)', verticalAlign: '-2px', marginRight: 4 }} />)}
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
