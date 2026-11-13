'use client';

import React, { useMemo } from 'react';
import EmptyState from '@/components/ui/EmptyState';
import { FileText, Printer } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { studio, useCallSheets, useSetLog, type CallSheet } from '@/lib/studio';
import { dayClock } from '@/lib/studio/onset';
import { productionReportDoc } from '@/lib/studio/production-report-print';
import { printDocument } from '@/lib/print/print';
import { useStudio } from '../StudioContext';
import { cx } from '../ui';
import { ToolHeader } from '../ToolHeader';
import s from '../studio.module.css';

/**
 * A daily production report (DPR): what was shot, how many pages, wrap time.
 * Generated from the on-set data — scenes wrapped, shots got, clock times.
 */
export function ProductionReportView() {
  const { project, scenes, shots } = useStudio();
  const { toast } = useToast();
  const sheets = useCallSheets(project.id);
  const log = useSetLog(project.id);

  const days = useMemo(() => [...sheets.rows].sort((a, b) => a.shoot_day - b.shoot_day), [sheets.rows]);

  const printReport = (sheet: CallSheet) => {
    const dayScenes = scenes.rows.filter((sc) => sc.shoot_day === sheet.shoot_day);
    const dayShots = shots.rows.filter((sh) => dayScenes.some((sc) => sc.id === sh.scene_id));
    const dayLog = log.rows.filter((r) => r.call_sheet_id === sheet.id);
    const clock = dayClock(dayLog);
    const eighths = dayScenes.reduce((t, sc) => { const m = String(sc.est_duration || '').match(/(\d+)\/8/); return t + (m ? Number(m[1]) : 0); }, 0);
    const done = dayScenes.filter((sc) => sc.status === 'wrapped' || sc.status === 'shot');
    const ok = printDocument(productionReportDoc({
      project: project.title,
      accent: project.accent_color,
      day: sheet.shoot_day,
      date: sheet.shoot_date ? new Date(sheet.shoot_date + 'T00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : null,
      call: clock.call ? clock.call.slice(0, 5) : '',
      wrap: clock.wrap ? clock.wrap.slice(0, 5) : '',
      scenes: dayScenes.map((sc) => ({ number: sc.scene_number, heading: sc.heading ?? sc.title ?? '', status: sc.status ?? 'planned' })),
      scenesDone: done.length,
      eighths,
      shots: dayShots.map((sh) => ({ number: sh.shot_number, scene: dayScenes.find((sc) => sc.id === sh.scene_id)?.scene_number ?? '?', size: sh.shot_size ?? null, status: sh.status ?? 'planned' })),
      shotsGot: dayShots.filter((sh) => sh.status === 'shot').length,
      notes: sheet.notes ?? null,
      generated: new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }),
    }));
    if (!ok) toast('Could not open the print dialog.', 'error');
  };

  if (days.length === 0) {
    return <EmptyState icon={<FileText size={26} />} title="No shoot days yet" subtitle="Schedule scenes and issue call sheets first." />;
  }

  return (
    <div className={s.stack}>
      <ToolHeader icon={<FileText size={16} />} eyebrow="Reports & logs" title="Production reports" purpose="The end-of-day report: what was shot, the times and the notes." accent={project.accent_color}
        summary={<>{days.length} day{days.length === 1 ? '' : 's'}</>} />
      <div className={s.stack} style={{ gap: 6 }}>
        {days.map((sheet) => {
          const dayScenes = scenes.rows.filter((sc) => sc.shoot_day === sheet.shoot_day);
          const wrapped = dayScenes.filter((sc) => sc.status === 'wrapped' || sc.status === 'shot').length;
          return (
            <div key={sheet.id} className={s.row} style={{ alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 700 }}>Day {sheet.shoot_day}</span>
              <span className={s.hint}>{sheet.shoot_date ? new Date(sheet.shoot_date + 'T00:00').toLocaleDateString() : 'No date'}</span>
              <span className={s.hint}>{wrapped}/{dayScenes.length} scenes</span>
              <button type="button" className={cx(s.btn, s.small)} onClick={() => printReport(sheet)}>
                <Printer size={11} aria-hidden /> Print report
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}