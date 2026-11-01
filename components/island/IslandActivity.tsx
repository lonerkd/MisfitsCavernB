'use client';

import React from 'react';
import type { Activity, ActivityTone } from '@/lib/island/activities';
import s from './island.module.css';

/** The island's colour while it holds an activity (or is a dot that stands for one). */
export const ACTIVITY_TONE_COLOR: Record<ActivityTone, string> = {
  info: 'var(--accent)',
  warn: 'var(--warn)',
  error: 'var(--danger)',
  busy: 'var(--violet)',
};

/**
 * What the island says while it holds an activity: its title, a line of detail and, if the work knows how
 * far along it is, a thin bar. A ticking timer is not announced to a screen reader every second; the
 * handle's label carries it for anyone who focuses the island.
 */
export function ActivityLabel({ activity }: { activity: Activity }) {
  const pct = activity.progress === undefined ? null : Math.round(activity.progress * 100);
  return (
    <span className={s.activity} role={activity.kind === 'timer' ? undefined : 'status'}>
      <span className={s.activityTitle}>{activity.title}</span>
      {activity.detail && <span className={s.activityDetail}>{activity.detail}</span>}
      {pct !== null && (
        <span className={s.progress} role="progressbar" aria-label={`${activity.title} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
          <span style={{ width: `${pct}%` }} />
        </span>
      )}
    </span>
  );
}

/** The activity's own buttons, and a "+N" that shows the next one when several are running. */
export function ActivityControls({ activity, count, onCycle }: { activity: Activity; count: number; onCycle: () => void }) {
  const controls = activity.controls ?? [];
  if (controls.length === 0 && count < 2) return null;
  return (
    <span className={s.activityControls} role="group" aria-label={`${activity.title} — controls`}>
      {controls.map((c) => (
        <button key={c.id} type="button" className={s.activityBtn} onClick={c.run}>{c.label}</button>
      ))}
      {count > 1 && (
        <button type="button" className={s.activityMore} onClick={onCycle} aria-label={`${count - 1} more running — show the next`}>
          +{count - 1}
        </button>
      )}
    </span>
  );
}
