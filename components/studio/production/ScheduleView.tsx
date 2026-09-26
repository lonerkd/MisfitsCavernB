'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Calendar, PenLine, Printer, Tags } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/Confirm';
import { useProject } from '@/lib/os';
import { logActivity } from '@/lib/supabase/activity';
import { syncBudgetFromSceneElements, ELEMENT_CATEGORIES, type ElementCategory, type SceneElements } from '@/lib/supabase/breakdown';
import { studio, type SceneRow } from '@/lib/studio';
import { packShootDays } from '@/lib/studio/shoot-days';
import { Stripboard, CallSheets } from '../ProductionBoards';
import { useStudio } from '../StudioContext';
import { cx } from '../ui';
import s from '../studio.module.css';

const STATUS_ORDER = ['planned', 'shot', 'wrapped'] as const;
const STATUS_COLOR: Record<string, string> = { planned: '#6b7280', shot: '#f59e0b', wrapped: '#10b981' };
const CAT_COLOR: Record<ElementCategory, string> = { props: '#ffaa00', wardrobe: '#d7340b', vehicles: '#0099ff', sfx: '#a855f7', vfx: '#6366f1' };

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

/**
 * The shooting schedule for the selected script: shoot days, status, the
 * production breakdown, stripboard and call sheets. Scene headings, cast and
 * page counts come from the screenplay; day and status are set here.
 */
export function ScheduleView({ crew }: { crew: Array<{ user_id: string; role: string; username?: string }> }) {
  const { project, scenes, scriptId } = useStudio();
  const { refreshProject } = useProject();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [busy, setBusy] = useState<'schedule' | 'budget' | null>(null);
  const list = scenes.rows;

  const wrapped = list.filter((sc) => sc.status === 'wrapped').length;
  const days = useMemo(() => Array.from(new Set(list.map((sc) => sc.shoot_day ?? 1))).sort((a, b) => a - b), [list]);

  const setDay = async (sc: SceneRow, day: number) => {
    if (!Number.isInteger(day) || day < 1 || day === sc.shoot_day) return;
    try { scenes.upsertLocal(await studio.updateScene(sc.id, { shoot_day: day })); }
    catch (e) { toast(e instanceof Error ? e.message : 'Could not update', 'error'); }
  };

  const cycleStatus = async (sc: SceneRow) => {
    const next = STATUS_ORDER[(STATUS_ORDER.indexOf((sc.status as typeof STATUS_ORDER[number]) ?? 'planned') + 1) % STATUS_ORDER.length];
    try {
      scenes.upsertLocal(await studio.updateScene(sc.id, { status: next }));
      if (next === 'wrapped') logActivity(`wrapped scene ${sc.scene_number} "${sc.heading ?? sc.title}"`, 'scene', sc.id, { project_id: project.id });
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not update', 'error');
    }
  };

  const autoSchedule = async () => {
    const plan = packShootDays(list);
    if (!plan.updates.length) { toast(`Already grouped by location — ${plan.days} shoot day${plan.days === 1 ? '' : 's'}.`, 'info'); return; }
    const ok = await confirm({
      title: 'Auto-schedule?',
      message: `Groups ${list.length} scenes by location into ${plan.days} shoot day${plan.days === 1 ? '' : 's'} (about 5 pages a day, day scenes before night). ${plan.updates.length} scene${plan.updates.length === 1 ? '' : 's'} will move.`,
      confirmLabel: 'Reschedule',
    });
    if (!ok) return;
    setBusy('schedule');
    let failed = 0;
    for (const u of plan.updates) {
      try { scenes.upsertLocal(await studio.updateScene(u.id, { shoot_day: u.shoot_day })); }
      catch { failed++; }
    }
    setBusy(null);
    toast(failed ? `${failed} scene${failed === 1 ? '' : 's'} could not be moved — try again.` : `Scheduled into ${plan.days} days`, failed ? 'error' : 'success');
  };

  const syncBudget = async () => {
    setBusy('budget');
    try {
      const lines = await syncBudgetFromSceneElements(project.id, list.map((sc) => ({ elements: (sc.elements ?? {}) as unknown as SceneElements })), (project.budget_items ?? []) as { id: string; category: string }[]);
      logActivity('synced the production breakdown into the budget', 'project', project.id);
      await refreshProject(project.id);
      toast(lines.length ? `Budget updated — ${lines.length} categor${lines.length === 1 ? 'y' : 'ies'}` : 'No props, wardrobe, vehicles or effects found in the script', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not update the budget', 'error');
    } finally {
      setBusy(null);
    }
  };

  const print = () => {
    const w = window.open('', '_blank', 'width=860,height=1100');
    if (!w) { toast('Allow pop-ups to print the schedule.', 'info'); return; }
    const body = days.map((day) => {
      const ds = list.filter((sc) => (sc.shoot_day ?? 1) === day);
      return `<h2>DAY ${day}</h2><table><tr><th>#</th><th>Scene</th><th>Location</th><th>Time</th><th>Cast</th><th>Pages</th><th>Status</th></tr>${ds
        .map((sc) => `<tr><td>${sc.scene_number}</td><td>${esc(sc.heading ?? sc.title)}</td><td>${esc(sc.location || '—')}</td><td>${esc(sc.time_of_day)}</td><td>${esc(sc.cast_list || '—')}</td><td>${esc(sc.est_duration)}</td><td>${esc(sc.status)}</td></tr>`)
        .join('')}</table>`;
    }).join('');
    w.document.write(`<!doctype html><html><head><title>${esc(project.title)} — Shooting Schedule</title><style>body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#111;margin:40px}h1{font-size:22px;letter-spacing:2px;margin:0 0 4px}h2{font-size:11px;letter-spacing:3px;color:#b45309;margin:24px 0 8px}table{width:100%;border-collapse:collapse;font-size:12px}th{text-align:left;color:#888;font-size:9px;letter-spacing:1px;border-bottom:1px solid #ccc;padding:4px}td{padding:5px 4px;border-bottom:1px solid #eee}</style></head><body><h1>${esc(project.title).toUpperCase()} — SHOOTING SCHEDULE</h1><div style="color:#888;font-size:11px">${list.length} scenes · ${days.length} days</div>${body}<script>window.onload=()=>window.print()</script></body></html>`);
    w.document.close();
  };

  if (!list.length) {
    return (
      <EmptyState
        icon={<Calendar size={26} />}
        title="No scenes to schedule"
        subtitle="The schedule is built from the screenplay’s scene headings."
        action={scriptId ? <Link href={`/editor?script=${scriptId}`} className={s.btnPrimary}><PenLine size={12} /> Open ScriptOS</Link> : undefined}
      />
    );
  }

  return (
    <div className={s.stack} style={{ gap: 28 }}>
      <div className={s.panel}>
        <div className={s.toolbar}>
          <div>
            <div className={s.panelTitle} style={{ marginBottom: 6 }}><Calendar size={14} /> Shooting schedule</div>
            <div className={s.hint}>{wrapped}/{list.length} wrapped · {days.length} shoot day{days.length === 1 ? '' : 's'}</div>
          </div>
          <div className={s.actions}>
            <button type="button" className={cx(s.btn, s.small)} onClick={autoSchedule} disabled={busy !== null} title="Group scenes by location and pack into days of about 5 pages">
              <Calendar size={11} /> {busy === 'schedule' ? 'Scheduling…' : 'Auto-schedule'}
            </button>
            <button type="button" className={cx(s.btn, s.small)} onClick={syncBudget} disabled={busy !== null} title="Roll the props, wardrobe, vehicles and effects in the script into the budget">
              <Tags size={11} /> {busy === 'budget' ? 'Updating…' : 'Breakdown → Budget'}
            </button>
            <button type="button" className={cx(s.btn, s.small)} onClick={print}><Printer size={11} /> Print</button>
          </div>
        </div>

        <div className={s.stack} style={{ gap: 0 }}>
          {list.map((sc) => {
            const status = sc.status || 'planned';
            const els = (sc.elements ?? {}) as Record<string, string[] | undefined>;
            const chips = ELEMENT_CATEGORIES.flatMap((cat) => (els[cat] ?? []).map((name) => ({ cat, name })));
            return (
              <div key={sc.id} style={{ display: 'grid', gridTemplateColumns: '40px minmax(0,1fr) 92px 84px', gap: 12, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div className={s.mono} style={{ fontWeight: 700, fontSize: 12 }}>{sc.scene_number}</div>
                <div style={{ minWidth: 0 }}>
                  <div className={s.sceneHeading} style={{ fontSize: 11.5 }}>{sc.heading ?? sc.title}</div>
                  <div className={s.sceneMeta}>{[sc.time_of_day, sc.cast_list, sc.est_duration].filter(Boolean).join(' · ')}</div>
                  {chips.length > 0 && (
                    <div className={s.chips} style={{ marginTop: 6, gap: 4 }}>
                      {chips.map(({ cat, name }) => (
                        <span key={`${cat}-${name}`} title={cat} className={s.tag} style={{ color: CAT_COLOR[cat], borderColor: `${CAT_COLOR[cat]}44`, background: `${CAT_COLOR[cat]}14` }}>{name}</span>
                      ))}
                    </div>
                  )}
                </div>
                <label className={s.row} style={{ gap: 6 }}>
                  <span className={s.hint}>Day</span>
                  <input
                    className={s.input}
                    style={{ width: 54, padding: '5px 8px' }}
                    type="number"
                    min={1}
                    defaultValue={sc.shoot_day ?? 1}
                    key={`${sc.id}:${sc.shoot_day}`}
                    aria-label={`Shoot day for scene ${sc.scene_number}`}
                    onBlur={(e) => void setDay(sc, Number(e.target.value))}
                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void cycleStatus(sc)}
                  title="Planned → Shot → Wrapped"
                  className={s.tag}
                  style={{ justifyContent: 'center', cursor: 'pointer', color: STATUS_COLOR[status], borderColor: `${STATUS_COLOR[status]}55`, background: `${STATUS_COLOR[status]}1a` }}
                >
                  {status}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <Stripboard scenes={list} />
      <CallSheets scenes={list} crew={crew} projectTitle={project.title} />
    </div>
  );
}
