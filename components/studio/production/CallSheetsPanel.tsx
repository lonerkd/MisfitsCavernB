'use client';

import React, { useMemo, useState } from 'react';
import { FileText, Printer } from 'lucide-react';
import { useToast } from '@/components/Toast';
import {
  studio, useCallSheets, useCallSheetCalls,
  type CallSheet, type CallSheetCall, type CallSheetPatch, type CallTarget, type SceneRow,
} from '@/lib/studio';
import { useStudio } from '../StudioContext';
import { cx } from '../ui';
import s from '../studio.module.css';

type CrewMember = { user_id: string; role: string; username?: string };

const hhmm = (t: string | null | undefined) => (t ? t.slice(0, 5) : '');
const esc = (v: unknown) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

function dayFacts(scenes: SceneRow[], day: number) {
  const dayScenes = scenes.filter((sc) => (sc.shoot_day ?? 1) === day).sort((a, b) => a.scene_number - b.scene_number);
  const locations = Array.from(new Set(dayScenes.map((sc) => sc.location).filter(Boolean))) as string[];
  const cast = Array.from(new Set(dayScenes.flatMap((sc) => (sc.cast_list ? sc.cast_list.split(',').map((c) => c.trim()) : [])).filter(Boolean)));
  const eighths = dayScenes.reduce((t, sc) => { const m = String(sc.est_duration || '').match(/(\d+)\/8/); return t + (m ? Number(m[1]) : 0); }, 0);
  return { dayScenes, locations, cast, pages: eighths ? (eighths / 8).toFixed(1) : null };
}

/**
 * Call sheets per shoot day. Scenes, locations and cast come from the
 * schedule; date, call times, address, weather, notes and each person's call
 * are saved (call_sheets / call_sheet_calls) and shared live with the crew.
 */
export function CallSheetsPanel({ scenes, crew }: { scenes: SceneRow[]; crew: CrewMember[] }) {
  const { project } = useStudio();
  const sheets = useCallSheets(project.id);
  const calls = useCallSheetCalls(project.id);
  const [openDay, setOpenDay] = useState<number | null>(null);
  const days = useMemo(() => Array.from(new Set(scenes.map((sc) => sc.shoot_day ?? 1))).sort((a, b) => a - b), [scenes]);
  const sheetFor = (day: number) => sheets.rows.find((x) => x.shoot_day === day);

  const print = (day: number) => {
    const d = dayFacts(scenes, day);
    const sheet = sheetFor(day);
    const mine = calls.rows.filter((c) => c.call_sheet_id === sheet?.id);
    const callOf = (t: CallTarget) => mine.find((c) => ('crew_user_id' in t ? c.crew_user_id === t.crew_user_id : c.character_name === t.character_name));
    const w = window.open('', '_blank', 'width=820,height=1060');
    if (!w) return;
    const line = (label: string, v: string | null | undefined) => (v ? `<div><b>${label}</b> ${esc(v)}</div>` : '');
    w.document.write(`<!doctype html><html><head><title>${esc(project.title)} — Call Sheet Day ${day}</title>
      <style>body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#111;margin:40px;line-height:1.5}
      h1{font-size:20px;margin:0 0 2px;letter-spacing:2px}h2{font-size:11px;color:#b45309;letter-spacing:3px;margin:0 0 16px}
      h3{font-size:10px;letter-spacing:2px;color:#666;border-bottom:1px solid #ddd;padding-bottom:4px;margin:18px 0 8px}
      .row{display:flex;gap:24px}.col{flex:1}.sc{margin-bottom:4px;font-size:13px}.num{color:#999}b{font-size:10px;letter-spacing:1px;color:#666;margin-right:6px}
      table{border-collapse:collapse;width:100%;font-size:12px}td{padding:4px;border-bottom:1px solid #eee}</style></head><body>
      <h1>${esc(project.title).toUpperCase()}</h1><h2>CALL SHEET · DAY ${day}${sheet?.shoot_date ? ` · ${esc(new Date(sheet.shoot_date + 'T00:00').toDateString())}` : ''}</h2>
      <div class="row"><div class="col">${line('GENERAL CALL', hhmm(sheet?.general_call))}${line('SHOOTING CALL', hhmm(sheet?.shooting_call))}${line('EST. WRAP', hhmm(sheet?.estimated_wrap))}</div>
      <div class="col">${line('LOCATION', sheet?.location_address)}${line('WEATHER', sheet?.weather)}</div></div>
      ${sheet?.notes ? `<h3>NOTES</h3><div>${esc(sheet.notes).replace(/\n/g, '<br>')}</div>` : ''}
      <div class="row"><div class="col"><h3>SCENES (${d.dayScenes.length}${d.pages ? ` · ${d.pages} pg` : ''})</h3>
      ${d.dayScenes.map((sc) => `<div class="sc"><span class="num">${sc.scene_number}.</span> ${esc(sc.heading ?? sc.title)}</div>`).join('')}
      <h3>LOCATIONS</h3>${d.locations.length ? d.locations.map((l) => `<div>${esc(l)}</div>`).join('') : '—'}</div>
      <div class="col"><h3>CAST</h3><table>${d.cast.map((name) => { const c = callOf({ character_name: name }); return `<tr><td>${esc(name)}</td><td>${esc(hhmm(c?.call_time)) || '—'}</td><td>${esc(c?.remarks)}</td></tr>`; }).join('') || '<tr><td>—</td></tr>'}</table>
      <h3>CREW</h3><table>${crew.map((m) => { const c = callOf({ crew_user_id: m.user_id }); return `<tr><td>${esc(m.username || 'Crew')}</td><td>${esc(m.role)}</td><td>${esc(hhmm(c?.call_time)) || '—'}</td><td>${esc(c?.remarks)}</td></tr>`; }).join('') || '<tr><td>No crew yet</td></tr>'}</table></div></div>
      <script>window.onload=()=>{window.print()}</script></body></html>`);
    w.document.close();
  };

  return (
    <div className={s.panel}>
      <div className={s.panelTitle}><FileText size={14} /> Call sheets <span className={s.hint}>· {days.length} shoot {days.length === 1 ? 'day' : 'days'}</span></div>
      {(sheets.status === 'error' || calls.status === 'error') && <div className={s.hint} style={{ color: '#ff6b6b' }}>{sheets.error || calls.error}</div>}
      <div className={s.callGrid}>
        {days.map((day) => {
          const d = dayFacts(scenes, day);
          const sheet = sheetFor(day);
          const open = openDay === day;
          return (
            <div key={day} className={cx(s.callDay, open && s.callDayOpen)}>
              <button type="button" className={s.callDayHead} onClick={() => setOpenDay(open ? null : day)} aria-expanded={open}>
                <span className={s.callDayNum}>DAY {day}</span>
                <span className={s.hint}>
                  {sheet?.shoot_date ? new Date(sheet.shoot_date + 'T00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' · ' : ''}
                  {sheet?.general_call ? `call ${hhmm(sheet.general_call)} · ` : ''}{d.dayScenes.length} sc{d.pages ? ` · ${d.pages} pg` : ''}
                </span>
              </button>
              {open && (
                <DayEditor
                  day={day} sheet={sheet} facts={d} crew={crew}
                  calls={calls.rows.filter((c) => c.call_sheet_id === sheet?.id)}
                  onSheet={(row) => sheets.upsertLocal(row)}
                  onCall={(row, removedId) => { if (row) calls.upsertLocal(row); else if (removedId) calls.removeLocal(removedId); }}
                  onPrint={() => print(day)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DayEditor({ day, sheet, facts, crew, calls, onSheet, onCall, onPrint }: {
  day: number; sheet: CallSheet | undefined; facts: ReturnType<typeof dayFacts>; crew: CrewMember[]; calls: CallSheetCall[];
  onSheet: (row: CallSheet) => void; onCall: (row: CallSheetCall | null, removedId?: string) => void; onPrint: () => void;
}) {
  const { project } = useStudio();
  const { toast } = useToast();

  const saveSheet = async (patch: CallSheetPatch): Promise<CallSheet | null> => {
    try { const row = await studio.saveCallSheet(project.id, day, patch); onSheet(row); return row; }
    catch (e) { toast(e instanceof Error ? e.message : 'Could not save the call sheet', 'error'); return null; }
  };

  const field = (key: keyof CallSheetPatch, value: string) => {
    const current = (sheet?.[key] ?? '') as string;
    const next = value.trim() || null;
    if ((key.endsWith('call') || key === 'estimated_wrap' ? hhmm(current) : current) === (next ?? '')) return;
    void saveSheet({ [key]: next } as CallSheetPatch);
  };

  const saveCall = async (target: CallTarget, fields: { call_time: string | null; remarks: string | null; role_label?: string | null }) => {
    const existing = calls.find((c) => ('crew_user_id' in target ? c.crew_user_id === target.crew_user_id : c.character_name === target.character_name));
    const sh = sheet ?? await saveSheet({});
    if (!sh) return;
    try { onCall(await studio.saveCall(sh, target, existing, fields), existing?.id); }
    catch (e) { toast(e instanceof Error ? e.message : 'Could not save the call', 'error'); }
  };

  // Render helpers (plain functions, not components, so inputs keep focus across re-renders).
  const textField = (k: keyof CallSheetPatch, label: string, type = 'text', multiline = false) => {
    const raw = (sheet?.[k] ?? '') as string;
    const value = type === 'time' ? hhmm(raw) : raw;
    return (
      <label className={s.callField} key={k}>
        <span className={s.hint}>{label}</span>
        {multiline
          ? <textarea className={s.textarea} rows={2} defaultValue={value} key={`${k}:${value}`} onBlur={(e) => field(k, e.target.value)} maxLength={5000} />
          : <input className={s.input} type={type} defaultValue={value} key={`${k}:${value}`} onBlur={(e) => field(k, e.target.value)} maxLength={500} />}
      </label>
    );
  };

  const callRow = (key: string, target: CallTarget, name: string, role?: string) => {
    const c = calls.find((x) => ('crew_user_id' in target ? x.crew_user_id === target.crew_user_id : x.character_name === target.character_name));
    const time = hhmm(c?.call_time);
    const remarks = c?.remarks ?? '';
    return (
      <div className={s.callRow} key={key}>
        <span className={s.callName}>{name}{role ? <span className={s.hint}> — {role}</span> : null}</span>
        <input
          className={s.input} type="time" aria-label={`Call time for ${name}`} defaultValue={time} key={`t:${c?.id}:${time}`}
          onBlur={(e) => { if (e.target.value !== time) void saveCall(target, { call_time: e.target.value || null, remarks: remarks || null }); }}
        />
        <input
          className={s.input} placeholder="Remarks" aria-label={`Remarks for ${name}`} defaultValue={remarks} key={`r:${c?.id}:${remarks}`} maxLength={1000}
          onBlur={(e) => { const v = e.target.value.trim(); if (v !== remarks) void saveCall(target, { call_time: time || null, remarks: v || null }); }}
        />
      </div>
    );
  };

  return (
    <div className={s.callBody}>
      <div className={s.row} style={{ justifyContent: 'flex-end' }}>
        <button type="button" className={cx(s.btn, s.small)} onClick={onPrint}><Printer size={11} /> Print / PDF</button>
      </div>
      <div className={s.callFields}>
        {textField('shoot_date', 'Date', 'date')}
        {textField('general_call', 'General call', 'time')}
        {textField('shooting_call', 'Shooting call', 'time')}
        {textField('estimated_wrap', 'Est. wrap', 'time')}
        {textField('location_address', 'Location address')}
        {textField('weather', 'Weather')}
      </div>
      {textField('notes', 'Notes (parking, safety, catering…)', 'text', true)}

      <div className={s.callCols}>
        <div>
          <div className={s.hint}>Scenes ({facts.dayScenes.length}{facts.pages ? ` · ${facts.pages} pg` : ''})</div>
          {facts.dayScenes.map((sc) => <div key={sc.id} className={s.callScene}><span className={s.hint}>{sc.scene_number}.</span> {sc.heading ?? sc.title}</div>)}
          <div className={s.hint} style={{ marginTop: 10 }}>Locations</div>
          <div className={s.callScene}>{facts.locations.join(' · ') || '—'}</div>
        </div>
        <div>
          <div className={s.hint}>Cast calls</div>
          {facts.cast.length ? facts.cast.map((name) => callRow(`c:${name}`, { character_name: name }, name)) : <div className={s.hint}>No speaking cast in these scenes</div>}
          <div className={s.hint} style={{ marginTop: 10 }}>Crew calls</div>
          {crew.length ? crew.map((m) => callRow(`u:${m.user_id}`, { crew_user_id: m.user_id }, m.username || 'Crew member', m.role)) : <div className={s.hint}>No crew on this project yet</div>}
        </div>
      </div>
    </div>
  );
}
