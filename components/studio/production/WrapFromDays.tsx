'use client';

import React, { useMemo, useState } from 'react';
import { CalendarDays, Plus } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useShootDays } from '@/lib/studio';
import { useStudio } from '../StudioContext';
import { cx } from '../ui';
import s from '../studio.module.css';

export interface WrapEntry { id: string; date: string; dayNumber: number; shotsGot: number; pages: string; incidents: string; notes: string }

/** Today as YYYY-MM-DD in the person's own time zone, so a day shot today counts as due today. */
function localToday(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * The shoot days that have happened (dated on or before today) and have no wrap report yet, with the scenes the schedule
 * put on each day. Adding writes a wrap report for the day; nothing else changes.
 */
export function WrapFromDays({ items, save }: { items: WrapEntry[]; save: (next: WrapEntry[]) => Promise<boolean> }) {
  const { project, scenes } = useStudio();
  const days = useShootDays(project.id);
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const suggestions = useMemo(() => {
    const today = localToday();
    const reported = new Set(items.map((i) => i.dayNumber));
    return days.rows
      .filter((d) => d.shoot_date && d.shoot_date <= today && !reported.has(d.day_number))
      .sort((a, b) => (a.shoot_date ?? '').localeCompare(b.shoot_date ?? '') || a.day_number - b.day_number)
      .map((d) => {
        const sceneNumbers = scenes.rows
          .filter((r) => r.shoot_day === d.day_number)
          .map((r) => r.scene_number)
          .sort((a, b) => a - b);
        return { id: d.id, dayNumber: d.day_number, date: d.shoot_date as string, sceneNumbers };
      });
  }, [days.rows, scenes.rows, items]);

  const add = async (list: typeof suggestions) => {
    if (busy || list.length === 0) return;
    setBusy(true);
    try {
      const next = list.map((x): WrapEntry => ({
        id: `w-${crypto.randomUUID()}`,
        date: x.date,
        dayNumber: x.dayNumber,
        shotsGot: 0,
        pages: '',
        incidents: '',
        notes: x.sceneNumbers.length ? `Scenes: ${x.sceneNumbers.join(', ')}` : '',
      }));
      if (await save([...items, ...next])) toast(next.length === 1 ? 'Wrap report added' : `${next.length} wrap reports added`, 'success');
    } finally { setBusy(false); }
  };

  if (suggestions.length === 0) return null;
  return (
    <details className={s.panel} style={{ padding: 12 }} open={items.length === 0 || undefined}>
      <summary style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, minHeight: 32 }}>
        <CalendarDays size={14} aria-hidden />
        <strong>From the schedule</strong>
        <span className={s.hint}>{suggestions.length} shoot day{suggestions.length === 1 ? '' : 's'} without a wrap report</span>
      </summary>
      <div className={s.row} style={{ margin: '8px 0' }}>
        <button type="button" className={s.btnPrimary} disabled={busy} onClick={() => void add(suggestions)}><Plus size={12} /> Add all {suggestions.length}</button>
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {suggestions.map((x) => (
          <li key={x.id} className={cx(s.row)} style={{ gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 240px', minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>Day {x.dayNumber} <span className={s.hint}>· {x.date}</span></div>
              <div className={s.hint} style={{ fontSize: 12 }}>
                {x.sceneNumbers.length ? `Scenes ${x.sceneNumbers.join(', ')}` : 'No scenes scheduled on this day'}
              </div>
            </div>
            <button type="button" className={cx(s.btn, s.small)} disabled={busy} onClick={() => void add([x])}><Plus size={11} /> Add</button>
          </li>
        ))}
      </ul>
    </details>
  );
}
