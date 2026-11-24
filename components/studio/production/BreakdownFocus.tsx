'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, CheckCircle2, ListChecks } from 'lucide-react';
import { placeHref } from '@/lib/os/progress';
import type { BreakdownFocus as Focus, FocusAction, FocusItem } from '@/lib/studio/breakdown-focus';
import { cx } from '../ui';
import s from '../studio.module.css';
import v from './breakdownView.module.css';

/**
 * Readiness, the lead of the Breakdown tab: what is blocking the project and what comes next, each with the numbers behind it and a
 * button to the tool that fixes it. Read from the project's own data (lib/studio/breakdown-focus.ts), never ticked by hand.
 */
export function BreakdownFocus({ focus, projectId, onAction, readinessHref }: {
  focus: Focus;
  projectId: string;
  onAction: (a: FocusAction) => void;
  /** The scene-by-scene view of the same readiness. */
  readinessHref?: string;
}) {
  if (focus.state === 'loading') {
    return <div className="skeleton" style={{ height: 96, borderRadius: 14, marginBottom: 16 }} role="status" aria-busy="true" aria-label="Reading readiness" />;
  }
  const tone = focus.state === 'blocked' ? v.focusBlocked : focus.state === 'clear' ? v.focusClear : '';
  const Icon = focus.state === 'blocked' ? AlertTriangle : focus.state === 'clear' ? CheckCircle2 : ListChecks;
  return (
    <section className={cx(v.focus, tone)} aria-labelledby="bd-focus-title" data-testid="breakdown-focus" data-state={focus.state}>
      <div className={v.focusHead}>
        <Icon size={18} aria-hidden className={v.focusIcon} />
        <div className={v.focusTitles}>
          <h2 id="bd-focus-title" className={v.focusTitle}>{focus.headline}</h2>
          {focus.context && <p className={v.focusContext}>Readiness · {focus.context}</p>}
        </div>
        {readinessHref && focus.state !== 'unphased' && <Link href={readinessHref} className={cx(s.btn, s.small)}>Scene by scene <ArrowRight size={11} aria-hidden /></Link>}
      </div>
      {focus.items.length > 0 && (
        <ol className={v.focusList}>
          {focus.items.map((i) => <FocusRow key={i.id} item={i} projectId={projectId} onAction={onAction} />)}
        </ol>
      )}
      {focus.more > 0 && <p className={v.focusMore}>and {focus.more} more after these.</p>}
    </section>
  );
}

function FocusRow({ item, projectId, onAction }: { item: FocusItem; projectId: string; onAction: (a: FocusAction) => void }) {
  const label = <>{item.actionLabel} <ArrowRight size={11} aria-hidden /></>;
  const to = item.to;
  return (
    <li className={cx(v.focusRow, item.kind === 'blocker' && v.focusRowBlocker)} data-kind={item.kind}>
      <span className={v.focusKind}>{item.kind === 'blocker' ? 'Blocking' : 'Next'}</span>
      <div className={v.focusText}>
        <div className={v.focusRowTitle}>{item.title}</div>
        <div className={v.focusRowDetail}>{item.detail}</div>
      </div>
      {'action' in to
        ? <button type="button" className={cx(s.btn, s.small)} onClick={() => onAction(to.action)}>{label}</button>
        : <Link href={placeHref(to.place, projectId)} className={cx(s.btn, s.small)}>{label}</Link>}
    </li>
  );
}
