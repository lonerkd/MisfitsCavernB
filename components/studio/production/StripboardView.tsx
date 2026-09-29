'use client';

import React, { useMemo, useRef, useState } from 'react';
import { AlertTriangle, Calendar, Minus, Plus, Printer, Wand2 } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/Confirm';
import { useProject } from '@/lib/os';
import { logActivity } from '@/lib/supabase/activity';
import { patchProjectSettings } from '@/lib/supabase/progress';
import { studio, useCallSheets, type SceneRow } from '@/lib/studio';
import { DEFAULT_DAY_CAPACITY_EIGHTHS, eighthsOf, packShootDays } from '@/lib/studio/shoot-days';
import { buildBoard, castOf, dayOutOfDays, pages, stripKind, STRIP_LABEL, type StripKind } from '@/lib/studio/stripboard';
import type { ProjectSettings } from '@/lib/types/settings';
import { readable } from '@/lib/color';
import { useStudio } from '../StudioContext';
import { cx } from '../ui';
import s from '../studio.module.css';
import b from './stripboard.module.css';

// Strip colours follow the paper stripboard: white/yellow/blue/green,
// darkened to sit on the suite's ink background.
const KIND_COLOR: Record<StripKind, string> = { 'int-day': '#e0ddae', 'ext-day': '#f5c542', 'int-night': '#5b8cff', 'ext-night': '#34c77b' };
const STATUS_ORDER = ['planned', 'shot', 'wrapped'] as const;
type Status = (typeof STATUS_ORDER)[number];

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

/**
 * The shooting schedule as a stripboard: drag scenes between days (or
 * Alt+←/→ on a focused strip), see each day's pages against the crew's day,
 * company moves and who's called; cycle a scene planned → shot → wrapped.
 */
export function StripboardView({ elementCounts }: { elementCounts: Map<string, number> }) {
  const { project, scenes, isOwner } = useStudio();
  const { refreshProject } = useProject();
  const { toast } = useToast();
  const confirm = useConfirm();
  const sheets = useCallSheets(project.id);
  const settings = (project.settings ?? {}) as ProjectSettings;
  const [capacity, setCapacity] = useState(settings.dayLengthEighths ?? DEFAULT_DAY_CAPACITY_EIGHTHS);
  const [view, setView] = useState<'board' | 'dood'>('board');
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropDay, setDropDay] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [announce, setAnnounce] = useState('');
  const stripRefs = useRef(new Map<string, HTMLLIElement>());

  const list = scenes.rows;
  const board = useMemo(() => buildBoard(list, capacity), [list, capacity]);
  const dood = useMemo(() => dayOutOfDays(board), [board]);
  const dateOf = useMemo(() => new Map(sheets.rows.filter((c) => c.shoot_date).map((c) => [c.shoot_day, c.shoot_date as string])), [sheets.rows]);
  const wrapped = list.filter((sc) => sc.status === 'wrapped').length;
  const totalEighths = list.reduce((n, sc) => n + eighthsOf(sc.est_duration), 0);

  const moveTo = async (sc: SceneRow, day: number, refocus = false) => {
    if (!Number.isInteger(day) || day < 1 || day === (sc.shoot_day ?? 1)) return;
    const before = sc;
    scenes.upsertLocal({ ...sc, shoot_day: day, updated_at: new Date().toISOString() });
    setAnnounce(`Scene ${sc.scene_number} moved to day ${day}.`);
    if (refocus) requestAnimationFrame(() => stripRefs.current.get(sc.id)?.focus());
    try {
      scenes.upsertLocal(await studio.updateScene(sc.id, { shoot_day: day }));
    } catch (e) {
      scenes.upsertLocal({ ...before, updated_at: new Date().toISOString() });
      toast(e instanceof Error ? e.message : 'Could not move the scene', 'error');
    }
  };

  const cycleStatus = async (sc: SceneRow) => {
    const cur = (STATUS_ORDER as readonly string[]).includes(sc.status ?? '') ? (sc.status as Status) : 'planned';
    const next = STATUS_ORDER[(STATUS_ORDER.indexOf(cur) + 1) % STATUS_ORDER.length];
    try {
      scenes.upsertLocal(await studio.updateScene(sc.id, { status: next }));
      setAnnounce(`Scene ${sc.scene_number}: ${next}.`);
      if (next === 'wrapped') logActivity(`wrapped scene ${sc.scene_number} "${sc.heading ?? sc.title}"`, 'scene', sc.id, { project_id: project.id });
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not update', 'error');
    }
  };

  const changeCapacity = async (next: number) => {
    const value = Math.min(160, Math.max(8, next));
    const prev = capacity;
    setCapacity(value);
    try {
      await patchProjectSettings(project.id, { dayLengthEighths: value });
      await refreshProject(project.id);
    } catch (e) {
      setCapacity(prev);
      toast(e instanceof Error ? e.message : 'Could not save the day length', 'error');
    }
  };

  const autoSchedule = async () => {
    const plan = packShootDays(list, capacity);
    if (!plan.updates.length) { toast(`Already grouped by location — ${plan.days} shoot day${plan.days === 1 ? '' : 's'}.`, 'info'); return; }
    if (!await confirm({
      title: 'Auto-schedule?',
      message: `Groups ${list.length} scenes by location into ${plan.days} day${plan.days === 1 ? '' : 's'} of up to ${pages(capacity)} pages, day scenes before night. ${plan.updates.length} scene${plan.updates.length === 1 ? '' : 's'} will move — you can drag any of them back.`,
      confirmLabel: 'Reschedule',
      danger: false,
    })) return;
    setBusy(true);
    let failed = 0;
    for (const u of plan.updates) {
      try { scenes.upsertLocal(await studio.updateScene(u.id, { shoot_day: u.shoot_day })); } catch { failed++; }
    }
    setBusy(false);
    toast(failed ? `${failed} scene${failed === 1 ? '' : 's'} could not be moved — try again.` : `Scheduled into ${plan.days} days`, failed ? 'error' : 'success');
  };

  const print = () => {
    const w = window.open('', '_blank', 'width=860,height=1100');
    if (!w) { toast('Allow pop-ups to print the schedule.', 'info'); return; }
    const body = board.filter((d) => d.scenes.length).map((d) => `<h2>DAY ${d.day}${dateOf.get(d.day) ? ` — ${esc(new Date(`${dateOf.get(d.day)}T00:00`).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }))}` : ''} · ${pages(d.eighths)} pp${d.locations.length > 1 ? ` · ${d.locations.length} locations` : ''}</h2><table><tr><th>#</th><th>Scene</th><th>I/E · D/N</th><th>Cast</th><th>Pages</th><th>Status</th></tr>${d.scenes
      .map((sc) => `<tr><td>${sc.scene_number}</td><td>${esc(sc.heading ?? sc.title)}</td><td>${STRIP_LABEL[stripKind(sc)]}</td><td>${esc(castOf(sc).join(', ') || '—')}</td><td>${pages(eighthsOf(sc.est_duration))}</td><td>${esc(sc.status)}</td></tr>`)
      .join('')}</table>`).join('');
    w.document.write(`<!doctype html><html><head><title>${esc(project.title)} — Shooting Schedule</title><style>body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#111;margin:40px}h1{font-size:22px;letter-spacing:2px;margin:0 0 4px}h2{font-size:11px;letter-spacing:2px;color:#b45309;margin:24px 0 8px}table{width:100%;border-collapse:collapse;font-size:12px}th{text-align:left;color:var(--fg-dim);font-size:9px;letter-spacing:1px;border-bottom:1px solid #ccc;padding:4px}td{padding:5px 4px;border-bottom:1px solid #eee}</style></head><body><h1>${esc(project.title).toUpperCase()} — SHOOTING SCHEDULE</h1><div style="color:var(--fg-dim);font-size:11px">${list.length} scenes · ${board.filter((d) => d.scenes.length).length} days · ${pages(totalEighths)} pages</div>${body}<script>window.onload=()=>window.print()</script></body></html>`);
    w.document.close();
  };

  const dropProps = (day: number) => ({
    onDragOver: (e: React.DragEvent) => { if (dragId) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (dropDay !== day) setDropDay(day); } },
    onDragLeave: (e: React.DragEvent) => { if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) setDropDay((d) => (d === day ? null : d)); },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      const sc = list.find((x) => x.id === (e.dataTransfer.getData('text/plain') || dragId));
      setDragId(null); setDropDay(null);
      if (sc) void moveTo(sc, day);
    },
  });

  return (
    <div className={s.panel}>
      <div className={b.bar}>
        <div>
          <div className={b.title}><Calendar size={14} aria-hidden /> Stripboard</div>
          <div className={b.summary}>{list.length} scenes · {pages(totalEighths)} pages · {board.filter((d) => d.scenes.length).length} shoot days · {wrapped} wrapped</div>
        </div>
        <span className={b.spacer} />
        <div className={s.chips} role="tablist" aria-label="Schedule view">
          <button type="button" role="tab" aria-selected={view === 'board'} className={cx(s.chip, view === 'board' && s.chipOn)} onClick={() => setView('board')}>Strips</button>
          <button type="button" role="tab" aria-selected={view === 'dood'} className={cx(s.chip, view === 'dood' && s.chipOn)} onClick={() => setView('dood')}>Day out of days</button>
        </div>
        <div className={b.stepper} role="group" aria-label="Pages per shoot day">
          <button type="button" className={b.stepBtn} aria-label="Shorter day" disabled={!isOwner || capacity <= 8} onClick={() => void changeCapacity(capacity - 4)}><Minus size={11} /></button>
          <span className={b.stepValue} title={isOwner ? 'How many pages the crew shoots in a day' : 'Set by the project owner'}>{pages(capacity)} pp / day</span>
          <button type="button" className={b.stepBtn} aria-label="Longer day" disabled={!isOwner || capacity >= 160} onClick={() => void changeCapacity(capacity + 4)}><Plus size={11} /></button>
        </div>
        <button type="button" className={cx(s.btn, s.small)} onClick={autoSchedule} disabled={busy || !list.length}><Wand2 size={11} aria-hidden /> {busy ? 'Scheduling…' : 'Auto-schedule'}</button>
        <button type="button" className={cx(s.btn, s.small)} onClick={print} disabled={!list.length}><Printer size={11} aria-hidden /> Print</button>
      </div>

      <div aria-live="polite" className="sr-only">{announce}</div>

      {view === 'board' ? (
        <>
          <p className={b.hint} id="strip-help" style={{ margin: '0 0 12px' }}>Drag a strip to another day, or focus it and press Alt+← / Alt+→. The dot marks planned → shot → wrapped.</p>
          <div className={b.board}>
            {board.map((d) => {
              const date = dateOf.get(d.day);
              const fill = Math.min(100, Math.round((d.eighths / capacity) * 100));
              return (
                <section key={d.day} aria-labelledby={`day-${d.day}`} className={cx(b.day, d.over && b.dayOver, dropDay === d.day && b.dayDrop)} {...dropProps(d.day)}>
                  <div className={b.dayHead}>
                    <h3 id={`day-${d.day}`} className={b.dayName}>Day {d.day}</h3>
                    <span className={b.dayDate}>{date ? new Date(`${date}T00:00`).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) : 'No date yet'}</span>
                  </div>
                  <div className={b.meter} role="meter" aria-label={`Day ${d.day} pages`} aria-valuemin={0} aria-valuemax={capacity} aria-valuenow={Math.min(d.eighths, capacity)} aria-valuetext={`${pages(d.eighths)} of ${pages(capacity)} pages`}>
                    <div className={cx(b.meterFill, d.over && b.meterOver)} style={{ width: `${fill}%` }} />
                  </div>
                  <div className={b.dayStats}>
                    <span className={d.over ? b.over : undefined}>{pages(d.eighths)} of {pages(capacity)} pp{d.over ? ' — over' : ''}</span>
                    <span>{d.scenes.length} scene{d.scenes.length === 1 ? '' : 's'}</span>
                  </div>
                  {d.locations.length > 1 && (
                    <div className={b.move} title={d.locations.join(' → ')}><AlertTriangle size={11} aria-hidden /> {d.locations.length} locations — company move</div>
                  )}
                  {d.cast.length > 0 && (
                    <div className={b.castRow} aria-label={`Cast called: ${d.cast.join(', ')}`}>
                      {d.cast.slice(0, 6).map((c) => <span key={c} className={b.castChip}>{c}</span>)}
                      {d.cast.length > 6 && <span className={b.castChip}>+{d.cast.length - 6}</span>}
                    </div>
                  )}
                  <ul className={b.strips} aria-label={`Day ${d.day} scenes`}>
                    {d.scenes.length === 0 && <li className={b.hint} style={{ padding: '10px 2px' }}>No scenes — drop one here.</li>}
                    {d.scenes.map((sc) => {
                      const row = sc as SceneRow;
                      const kind = stripKind(sc);
                      const e = eighthsOf(sc.est_duration);
                      const status = (STATUS_ORDER as readonly string[]).includes(sc.status ?? '') ? (sc.status as Status) : 'planned';
                      const els = elementCounts.get(sc.id) ?? 0;
                      const cast = castOf(sc);
                      return (
                        <li
                          key={sc.id}
                          ref={(el) => { if (el) stripRefs.current.set(sc.id, el); else stripRefs.current.delete(sc.id); }}
                          className={cx(b.strip, dragId === sc.id && b.dragging, status === 'wrapped' && b.wrapped)}
                          style={{ ['--k' as string]: KIND_COLOR[kind], ['--kt' as string]: readable(KIND_COLOR[kind]), minHeight: 44 + Math.min(e, 16) * 2 }}
                          draggable
                          tabIndex={0}
                          aria-label={`Scene ${sc.scene_number}, ${sc.heading ?? sc.title}, ${pages(e)} pages, ${status}`}
                          aria-describedby="strip-help"
                          onDragStart={(ev) => { ev.dataTransfer.setData('text/plain', sc.id); ev.dataTransfer.effectAllowed = 'move'; setDragId(sc.id); }}
                          onDragEnd={() => { setDragId(null); setDropDay(null); }}
                          onKeyDown={(ev) => {
                            if (!ev.altKey) return;
                            if (ev.key === 'ArrowRight') { ev.preventDefault(); void moveTo(row, d.day + 1, true); }
                            if (ev.key === 'ArrowLeft' && d.day > 1) { ev.preventDefault(); void moveTo(row, d.day - 1, true); }
                          }}
                        >
                          <span className={b.num}>{sc.scene_number}</span>
                          <span className={b.heading}>{sc.heading ?? sc.title}</span>
                          <span className={b.pg}>{pages(e)}</span>
                          <span className={b.meta}>
                            <span className={b.kind}>{STRIP_LABEL[kind]}</span>
                            {cast.length > 0 && <span>{cast.length} cast</span>}
                            {els > 0 && <span>{els} element{els === 1 ? '' : 's'}</span>}
                          </span>
                          <button type="button" className={b.statusBtn} aria-label={`Scene ${sc.scene_number} is ${status} — mark ${STATUS_ORDER[(STATUS_ORDER.indexOf(status) + 1) % 3]}`} title={`${status} — click for ${STATUS_ORDER[(STATUS_ORDER.indexOf(status) + 1) % 3]}`} onClick={() => void cycleStatus(row)} draggable={false}>
                            <span className={cx(b.dot, b[`dot_${status}`])} aria-hidden />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
            <section aria-label="A new shoot day" className={cx(b.day, b.dayNew, dropDay === board.length + 1 && b.dayDrop)} {...dropProps(board.length + 1)}>
              <div className={b.dayName} style={{ fontSize: '1.1rem' }}>Day {board.length + 1}</div>
              <p className={b.hint} style={{ margin: 0 }}>Drop a scene here to add a shoot day.</p>
            </section>
          </div>
          <div className={b.legend} aria-label="Strip colours">
            {(Object.keys(KIND_COLOR) as StripKind[]).map((k) => (
              <span key={k} className={b.legendItem}><span className={b.swatch} style={{ background: KIND_COLOR[k] }} aria-hidden />{STRIP_LABEL[k]}</span>
            ))}
          </div>
        </>
      ) : dood.length === 0 ? (
        <p className={b.hint}>No cast yet — speaking parts come from the script’s dialogue; they appear here once scenes are scheduled.</p>
      ) : (
        <div className={b.dood}>
          <table className={b.doodTable}>
            <caption className="sr-only">Day out of days: S start, W work, H hold, F finish, SF start and finish</caption>
            <thead>
              <tr><th scope="col">Cast</th>{board.map((d) => <th key={d.day} scope="col">{d.day}</th>)}<th scope="col">Days</th></tr>
            </thead>
            <tbody>
              {dood.map((r) => (
                <tr key={r.name}>
                  <th scope="row" style={{ fontWeight: 400 }}>{r.name}</th>
                  {r.cells.map((c, i) => <td key={i} className={c ? b[`code_${c}`] : undefined}>{c || '·'}</td>)}
                  <td>{r.worked}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className={b.legend}>
            <span>S start</span><span>W work</span><span>H hold (paid, not shooting)</span><span>F finish</span><span>SF start & finish</span>
          </div>
        </div>
      )}
    </div>
  );
}
