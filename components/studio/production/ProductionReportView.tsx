'use client';

import React, { useMemo, useState } from 'react';
import { FileText, Printer } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { studio, useCallSheets, useCallSheetCalls, useSetLog, type CallSheet, type SceneRow, type Shot } from '@/lib/studio';
import { dayClock } from '@/lib/studio/onset';
import { useStudio } from '../StudioContext';
import { cx } from '../ui';
import s from '../studio.module.css';

/**
 * A daily production report (DPR): what was shot, how many pages, wrap time.
 * Generated from the on-set data — scenes wrapped, shots got, clock times.
 */
export function ProductionReportView() {
  const { project, scenes, shots } = useStudio();
  const { toast } = useToast();
  const sheets = useCallSheets(project.id);
  const calls = useCallSheetCalls(project.id);
  const log = useSetLog(project.id);

  const days = useMemo(() => [...sheets.rows].sort((a, b) => a.shoot_day - b.shoot_day), [sheets.rows]);

  const printReport = (sheet: CallSheet) => {
    const dayScenes = scenes.rows.filter((sc) => sc.shoot_day === sheet.shoot_day);
    const dayShots = shots.rows.filter((sh) => dayScenes.some((sc) => sc.id === sh.scene_id));
    const dayLog = log.rows.filter((r) => r.call_sheet_id === sheet.id);
    const clock = dayClock(dayLog);
    const w = window.open('', '_blank', 'width=820,height=1060');
    if (!w) { toast('Allow pop-ups to print.', 'error'); return; }
    const esc = (v: unknown) => String(v ?? '').replace(/[&<>\"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' }[c] as string));
    const wrapped = dayScenes.filter((sc) => sc.status === 'wrapped');
    const shot = dayScenes.filter((sc) => sc.status === 'shot');
    const pages = dayScenes.reduce((t, sc) => { const m = String(sc.est_duration || '').match(/(\d+)\/8/); return t + (m ? Number(m[1]) : 0); }, 0);
    const got = dayShots.filter((sh) => sh.status === 'shot').length;
    w.document.write(`<!doctype html><html><head><title>${esc(project.title)} — Production Report Day ${sheet.shoot_day}</title>
      <style>body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#111;margin:40px;line-height:1.5}
      h1{font-size:20px;margin:0 0 2px;letter-spacing:2px}h2{font-size:11px;color:#b45309;letter-spacing:3px;margin:0 0 16px}
      h3{font-size:10px;letter-spacing:2px;color:var(--fg-dim);border-bottom:1px solid #ddd;padding-bottom:4px;margin:18px 0 8px}
      .row{display:flex;gap:24px}.col{flex:1}table{border-collapse:collapse;width:100%;font-size:12px}td,th{padding:4px;border-bottom:1px solid #eee;text-align:left}
      .sc{margin-bottom:4px;font-size:13px}.num{color:var(--fg-dim)}</style></head><body>
      <h1>${esc(project.title).toUpperCase()}</h1><h2>PRODUCTION REPORT · DAY ${sheet.shoot_day}${sheet.shoot_date ? ` · ${esc(new Date(sheet.shoot_date + 'T00:00').toDateString())}` : ''}</h2>
      <div class="row"><div class="col">
        ${clock.call ? `<div><b>GENERAL CALL</b> ${esc(clock.call.slice(0,5))}</div>` : ''}
        ${clock.wrap ? `<div><b>WRAP</b> ${esc(clock.wrap.slice(0,5))}</div>` : ''}
        <div><b>SCENES SHOT</b> ${wrapped.length + shot.length} of ${dayScenes.length}</div>
        <div><b>PAGES</b> ${(pages/8).toFixed(1)} pp</div>
        <div><b>SHOTS</b> ${got}/${dayShots.length} got</div>
      </div></div>
      <h3>SCENES</h3>
      ${dayScenes.map((sc) => `<div class="sc"><span class="num">${sc.scene_number}.</span> ${esc(sc.heading ?? sc.title)} <span class="num">— ${sc.status ?? 'planned'}</span></div>`).join('')}
      <h3>SHOTS</h3>
      <table><tr><th>#</th><th>Scene</th><th>Size</th><th>Status</th></tr>
      ${dayShots.map((sh) => `<tr><td>${esc(sh.shot_number)}</td><td>${esc(dayScenes.find((sc) => sc.id === sh.scene_id)?.scene_number ?? '?')}</td><td>${esc(sh.shot_size ?? '')}</td><td>${esc(sh.status ?? 'planned')}</td></tr>`).join('')}
      </table>
      ${sheet.notes ? `<h3>NOTES</h3><div>${esc(sheet.notes).replace(/\n/g, '<br>')}</div>` : ''}
      <script>window.onload=()=>{window.print()}</script></body></html>`);
    w.document.close();
  };

  if (days.length === 0) {
    return <EmptyState icon={<FileText size={26} />} title="No shoot days yet" subtitle="Schedule scenes and issue call sheets first." />;
  }

  return (
    <div className={s.stack}>
      <div className={s.toolbar}>
        <div className={s.panelTitle}>Production reports</div>
        <span className={s.hint}>{days.length} day{days.length === 1 ? '' : 's'}</span>
      </div>
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