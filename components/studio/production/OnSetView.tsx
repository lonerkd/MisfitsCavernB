'use client';

import React, { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { Camera, Check, Clapperboard, CloudOff, FileText, MapPin, Minus, Plus, RefreshCw, RotateCcw, Trash2, X } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/Confirm';
import { studio, useCallSheetCalls, useCallSheets, useSetLog, useSignedUrls, type CallSheet, type CallSheetCall, type SceneRow, type SetLogEntry, type SetLogRow, type Shot } from '@/lib/studio';
import { changes, draftLogRow, loadSnapshot, saveSnapshot, type DaySnapshot } from '@/lib/studio/onset-offline';
import { useOnSetSync, type OnSetSync } from '@/lib/studio/useOnSetSync';
import { CLOCK, dayClock, dayProgress, dayStatus, eighthsOf, formatMinutes, localDateTime, pickDay, type ClockKind } from '@/lib/studio/onset';
import type { Place } from '@/lib/os/progress';
import { useStudio } from '../StudioContext';
import { cx } from '../ui';
import s from '../studio.module.css';
import o from './onset.module.css';
import { useOnChange } from '@/lib/hooks/useOnChange';

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const fmtDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const fmtClock = (t: string | null) => (t ? t.slice(0, 5) : null);
const pages = (e: number) => (e >= 8 ? `${Math.floor(e / 8)}${e % 8 ? ` ${e % 8}/8` : ''}` : `${e}/8`);

function useNow(ms: number) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return now;
}

const PHASE_TEXT = { before: 'Before call', prep: 'Crew in — setting up', shooting: 'Shooting', lunch: 'On lunch', wrapped: 'Wrapped' } as const;

/**
 * The shoot day, for the people on it. Today's call sheet (or the next), the
 * day's clock stamped with a tap, the day's scenes with their shots to tick
 * off as they're got (or dropped), scenes wrapped, and continuity — notes and
 * photos per scene, shot and take — all live for the whole crew.
 */
export function OnSetView({ onNavigate }: { onNavigate: (place: Place) => boolean }) {
  const { project, userId, isOwner, scenes, shots, openInScript } = useStudio();
  const { toast } = useToast();
  const sheets = useCallSheets(project.id);
  const calls = useCallSheetCalls(project.id);
  const log = useSetLog(project.id);
  const now = useNow(30_000);
  const today = localToday();

  // Without signal the day keeps working: changes wait on this device and
  // are sent in order when the connection is back.
  const sync = useOnSetSync(project.id, {
    reload: () => Promise.all([sheets.reload(), calls.reload(), log.reload(), scenes.reload(), shots.reload()]),
    onRefused: (m) => toast(`${changes(m.length)} made offline couldn’t be saved — ${m[0]}`, 'error'),
  });
  // The last copy of the day seen here, so the view can open without signal.
  const [fromCopy, setFromCopy] = useState<string | null>(null);
  // Once the real day has loaded, the copy is no longer what's shown.
  useOnChange(sheets.status === 'ready', (ready) => { if (ready) setFromCopy(null); });
  // Saved on every change, not debounced: on set the tab may close (or the
  // battery die) a moment after the last tap.
  useEffect(() => {
    if (!sheets.rows.length) return;
    saveSnapshot(project.id, {
      savedAt: new Date().toISOString(), sheets: sheets.rows, calls: calls.rows, log: log.rows, scenes: scenes.rows, shots: shots.rows,
    });
  }, [project.id, sheets.rows, calls.rows, log.rows, scenes.rows, shots.rows]);
  const hasSheets = sheets.rows.length > 0;
  const seedFromCopy = useEffectEvent((snap: DaySnapshot<CallSheet, CallSheetCall, SetLogRow, SceneRow, Shot>) => {
    snap.sheets.forEach(sheets.upsertLocal);
    snap.calls.forEach(calls.upsertLocal);
    snap.log.forEach(log.upsertLocal);
    snap.scenes.forEach(scenes.upsertLocal);
    snap.shots.forEach(shots.upsertLocal);
    setFromCopy(snap.savedAt);
  });
  useEffect(() => {
    if (sheets.status === 'ready') return;
    // With no signal there's nothing to wait for; otherwise only once the load has failed.
    if ((sheets.status !== 'error' && sync.online) || hasSheets) return;
    const snap = loadSnapshot<CallSheet, CallSheetCall, SetLogRow, SceneRow, Shot>(project.id);
    if (!snap) return;
    // Next tick: the Studio's own lists (scenes, shots) reset when they mount,
    // and their effects run after this one.
    const t = window.setTimeout(() => seedFromCopy(snap), 0);
    return () => window.clearTimeout(t);
  }, [project.id, sheets.status, sync.online, hasSheets]);

  const days = useMemo(() => [...sheets.rows].sort((a, b) => a.shoot_day - b.shoot_day), [sheets.rows]);
  const picked = useMemo(() => pickDay(sheets.rows, today), [sheets.rows, today]);
  const [dayId, setDayId] = useState<string | null>(null);
  const sheet = days.find((d) => d.id === dayId) ?? picked?.sheet ?? null;
  const when = sheet && picked?.sheet.id === sheet.id ? picked.when : sheet?.shoot_date === today ? 'today' : null;

  const dayLog = useMemo(() => log.rows.filter((r) => r.call_sheet_id === sheet?.id), [log.rows, sheet?.id]);
  const clock = useMemo(() => dayClock(dayLog), [dayLog]);
  const status = dayStatus(clock, now, localDateTime(sheet?.shoot_date ?? null, sheet?.estimated_wrap ?? null));
  const myCall = calls.rows.find((c) => c.call_sheet_id === sheet?.id && c.crew_user_id === userId);

  const dayScenes = useMemo(
    () => scenes.rows.filter((sc) => sheet && sc.shoot_day === sheet.shoot_day).sort((a, b) => a.scene_number - b.scene_number),
    [scenes.rows, sheet],
  );
  const progress = dayProgress(dayScenes, shots.rows);

  if (sheets.status === 'ready' && !days.length) {
    return (
      <EmptyState
        icon={<Clapperboard size={26} />}
        title="No shoot days yet"
        subtitle="Put scenes on shoot days and date them in the schedule — on the day, this is where the crew stamp the clock, tick off shots and log continuity."
        action={<button type="button" className={s.btnPrimary} onClick={() => onNavigate({ kind: 'studio', tab: 'production', view: 'schedule' })}>Open the schedule</button>}
      />
    );
  }
  if (!sheet) return <p className={s.hint}>Loading the schedule…</p>;

  const stamp = async (kind: ClockKind) => {
    const entry = { id: crypto.randomUUID(), project_id: project.id, kind, call_sheet_id: sheet.id, at: new Date().toISOString() };
    log.upsertLocal(draftLogRow(entry, userId));
    try { await sync.run({ kind: 'log-add', entry }, async () => { log.upsertLocal(await studio.addSetLog(entry)); }); }
    catch (e) { log.removeLocal(entry.id); toast(e instanceof Error ? e.message : 'Could not stamp the time', 'error'); }
  };

  return (
    <div className={o.wrap}>
      <SyncBanner sync={sync} fromCopy={fromCopy} />
      <div className={s.chips} role="group" aria-label="Shoot days">
        {days.map((d) => (
          <button key={d.id} type="button" className={cx(s.chip, d.id === sheet.id && s.chipOn)} aria-pressed={d.id === sheet.id} onClick={() => setDayId(d.id)}>
            Day {d.shoot_day}{d.shoot_date ? ` · ${fmtDate(d.shoot_date)}` : ''}{d.shoot_date === today ? ' · today' : ''}
          </button>
        ))}
      </div>

      <section className={o.day} aria-labelledby="onset-day">
        <div className={o.dayHead}>
          <div>
            <p className={o.eyebrow}>{when === 'today' ? 'Today' : when === 'next' ? 'Next shoot day' : when === 'last' ? 'Last shoot day' : sheet.shoot_date ? fmtDate(sheet.shoot_date) : 'Not dated yet'}</p>
            <h3 id="onset-day" className={o.dayTitle}>Day {sheet.shoot_day}{sheet.shoot_date ? ` — ${fmtDate(sheet.shoot_date)}` : ''}</h3>
            <p className={o.meta}>
              {sheet.location_address && <span><MapPin size={11} aria-hidden /> {sheet.location_address}</span>}
              {sheet.weather && <span>{sheet.weather}</span>}
              {sheet.general_call && <span>Call {fmtClock(sheet.general_call)}</span>}
              {sheet.shooting_call && <span>Shooting {fmtClock(sheet.shooting_call)}</span>}
              {sheet.estimated_wrap && <span>Wrap by {fmtClock(sheet.estimated_wrap)}</span>}
            </p>
          </div>
          {myCall?.call_time && <div className={o.myCall}><span>Your call</span><strong>{fmtClock(myCall.call_time)}</strong>{myCall.remarks && <em>{myCall.remarks}</em>}</div>}
        </div>

        <div className={o.clock} role="group" aria-label="The day’s clock">
          {CLOCK.map((c) => (
            <ClockButton key={c.kind} label={c.label} at={clock[c.kind]} entry={dayLog.filter((r) => r.kind === c.kind).at(-1)}
              canEdit={(r) => r.created_by === userId || isOwner}
              onStamp={() => void stamp(c.kind)}
              onCorrect={async (row, at) => {
                log.upsertLocal({ ...row, at });
                try { await sync.run({ kind: 'log-update', id: row.id, patch: { at } }, async () => { log.upsertLocal(await studio.updateSetLog(row.id, { at })); }); }
                catch (e) { log.upsertLocal(row); toast(e instanceof Error ? e.message : 'Could not correct the time', 'error'); }
              }} />
          ))}
        </div>
        <p className={o.status} aria-live="polite">
          <strong>{PHASE_TEXT[status.phase]}</strong>
          {status.onSetMinutes > 0 && <> · on set {formatMinutes(status.onSetMinutes)}</>}
          {status.overtimeMinutes > 0 && <span className={o.over}> · {formatMinutes(status.overtimeMinutes)} past the planned wrap</span>}
          {status.toWrapMinutes != null && status.phase !== 'before' && <> · {formatMinutes(status.toWrapMinutes)} to wrap</>}
        </p>

        <div className={o.progress} aria-label="The day’s progress">
          <Meter label="Scenes" done={progress.scenesDone} total={progress.scenes} />
          <Meter label="Pages" done={progress.eighthsDone} total={progress.eighths} format={pages} />
          <Meter label="Shots" done={progress.shotsDone} total={progress.shots - progress.shotsOmitted} note={progress.shotsOmitted ? `${progress.shotsOmitted} dropped` : undefined} />
        </div>
      </section>

      {dayScenes.length === 0 ? (
        <p className={s.hint}>No scenes on day {sheet.shoot_day} yet — put some on it in the schedule.</p>
      ) : (
        <div className={o.scenes}>
          {dayScenes.map((sc) => (
            <SceneOnSet key={sc.id} sync={sync} scene={sc} shots={shots.rows.filter((sh) => sh.scene_id === sc.id)}
              continuity={log.rows.filter((r) => r.kind === 'continuity' && r.scene_id === sc.id)}
              onLog={(row) => log.upsertLocal(row)} onUnlog={(id) => log.removeLocal(id)}
              onOpenScript={() => openInScript(sc)} />
          ))}
        </div>
      )}

      <DayNotes sync={sync} sheetId={sheet.id} rows={dayLog} onLog={(row) => log.upsertLocal(row)} onUnlog={(id) => log.removeLocal(id)} />
    </div>
  );
}

/** What the connection means for the day: nothing when all is sent. */
function SyncBanner({ sync, fromCopy }: { sync: OnSetSync; fromCopy: string | null }) {
  let text: React.ReactNode = null;
  if (!sync.online) {
    text = <><CloudOff size={13} aria-hidden /> <strong>No signal.</strong> Keep working — changes stay on this device and are sent when you’re back online.
      {sync.pending > 0 && <> {changes(sync.pending)} waiting.</>}{fromCopy && <> Showing the day as of {fmtTime(fromCopy)}.</>}</>;
  } else if (sync.syncing) {
    text = <><RefreshCw size={13} aria-hidden /> Back online — sending {changes(sync.pending)}…</>;
  } else if (sync.pending > 0) {
    text = <><RefreshCw size={13} aria-hidden /> {changes(sync.pending)} waiting to send.</>;
  } else if (sync.justSent > 0) {
    text = <><Check size={13} aria-hidden /> Back online — {changes(sync.justSent)} sent.</>;
  }
  return <p className={cx(o.sync, !sync.online && o.syncOff)} role="status">{text}</p>;
}

function Meter({ label, done, total, format = String, note }: { label: string; done: number; total: number; format?: (n: number) => string; note?: string }) {
  const pct = total ? Math.min(100, (done / total) * 100) : 0;
  return (
    <div className={o.meter}>
      <div className={o.meterHead}><span>{label}</span><span>{format(done)} / {format(total)}{note ? ` · ${note}` : ''}</span></div>
      <div className={o.bar} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}><div style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

function ClockButton({ label, at, entry, canEdit, onStamp, onCorrect }: {
  label: string; at: string | null; entry: SetLogRow | undefined;
  canEdit: (row: SetLogRow) => boolean; onStamp: () => void; onCorrect: (row: SetLogRow, at: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  if (!at || !entry) {
    return (
      <button type="button" className={o.clockBtn} onClick={onStamp} aria-label={`${label}: stamp now`}>
        <span className={o.clockLabel}>{label}</span><span className={o.clockTap}>Tap now</span>
      </button>
    );
  }
  if (editing) {
    return (
      <form className={cx(o.clockBtn, o.clockOn)} onSubmit={async (e) => {
        e.preventDefault();
        const [h, m] = value.split(':').map(Number);
        if (Number.isNaN(h) || Number.isNaN(m)) return;
        const d = new Date(at); d.setHours(h, m, 0, 0);
        await onCorrect(entry, d.toISOString());
        setEditing(false);
      }}>
        <label className={o.clockLabel} htmlFor={`fix-${entry.id}`}>{label}</label>
        <input id={`fix-${entry.id}`} type="time" className={o.clockInput} value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
        <span className={o.clockActions}>
          <button type="submit" aria-label={`Save ${label} time`}><Check size={12} /></button>
          <button type="button" aria-label="Cancel" onClick={() => setEditing(false)}><X size={12} /></button>
        </span>
      </form>
    );
  }
  const time = new Date(at);
  return (
    <button type="button" className={cx(o.clockBtn, o.clockOn)} disabled={!canEdit(entry)}
      aria-label={`${label} at ${fmtTime(at)}${canEdit(entry) ? ' — correct the time' : ''}`}
      onClick={() => { setValue(`${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`); setEditing(true); }}>
      <span className={o.clockLabel}>{label}</span><span className={o.clockTime}>{fmtTime(at)}</span>
    </button>
  );
}

function SceneOnSet({ sync, scene, shots, continuity, onLog, onUnlog, onOpenScript }: {
  sync: OnSetSync; scene: SceneRow; shots: Shot[]; continuity: SetLogRow[];
  onLog: (row: SetLogRow) => void; onUnlog: (id: string) => void; onOpenScript: () => void;
}) {
  const { project, userId, isOwner, scenes, shots: liveShots, media } = useStudio();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const wrapped = scene.status === 'wrapped';
  const ordered = [...shots].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  const got = shots.filter((sh) => sh.status === 'shot').length;

  const setShot = async (sh: Shot, next: 'planned' | 'shot' | 'omitted') => {
    // The first shot got starts the scene.
    const start = next === 'shot' && (scene.status ?? 'planned') === 'planned';
    liveShots.upsertLocal({ ...sh, status: next });
    if (start) scenes.upsertLocal({ ...scene, status: 'shot' });
    try {
      await sync.run({ kind: 'shot', id: sh.id, status: next }, async () => { liveShots.upsertLocal(await studio.updateShot(sh.id, { status: next })); });
      if (start) await sync.run({ kind: 'scene', id: scene.id, status: 'shot' }, async () => { scenes.upsertLocal(await studio.updateScene(scene.id, { status: 'shot' })); });
    } catch (e) {
      liveShots.upsertLocal(sh);
      if (start) scenes.upsertLocal(scene);
      toast(e instanceof Error ? e.message : 'Could not update the shot', 'error');
    }
  };
  const setWrapped = async (w: boolean) => {
    const status = w ? 'wrapped' : 'shot';
    scenes.upsertLocal({ ...scene, status });
    try { await sync.run({ kind: 'scene', id: scene.id, status }, async () => { scenes.upsertLocal(await studio.updateScene(scene.id, { status })); }); }
    catch (e) { scenes.upsertLocal(scene); toast(e instanceof Error ? e.message : 'Could not update the scene', 'error'); }
  };

  const photos = useSignedUrls(continuity.map((r) => (r.media_id ? media.rows.find((m) => m.id === r.media_id)?.storage_path : null)));
  const mediaPath = (id: string | null) => (id ? media.rows.find((m) => m.id === id)?.storage_path ?? null : null);

  return (
    <article className={cx(o.scene, wrapped && o.sceneWrapped)} aria-label={`Scene ${scene.scene_number}: ${scene.heading ?? scene.title}`}>
      <header className={o.sceneHead}>
        <div style={{ minWidth: 0 }}>
          <h4 className={o.sceneTitle}><span className={o.num}>{scene.scene_number}</span> {scene.heading ?? scene.title}</h4>
          <p className={o.meta}>
            <span>{pages(eighthsOf(scene.est_duration) || 1)} pg</span>
            {scene.cast_list && <span>{scene.cast_list}</span>}
            <span>{got}/{shots.filter((sh) => sh.status !== 'omitted').length} shots</span>
          </p>
        </div>
        <div className={o.sceneActions}>
          {scene.script_id && <button type="button" className={cx(s.btnGhost, s.small)} onClick={onOpenScript}><FileText size={11} /> Script</button>}
          <button type="button" className={cx(wrapped ? s.btnGhost : s.btnPrimary, s.small)} aria-pressed={wrapped} onClick={() => void setWrapped(!wrapped)}>
            {wrapped ? <><RotateCcw size={11} /> Reopen</> : <><Check size={11} /> Wrap scene</>}
          </button>
        </div>
      </header>

      {ordered.length === 0 ? (
        <p className={s.hint}>No shots planned for this scene — it can still be wrapped.</p>
      ) : (
        <ul className={o.shots} aria-label={`Shots in scene ${scene.scene_number}`}>
          {ordered.map((sh) => (
            <li key={sh.id} className={cx(o.shot, sh.status === 'shot' && o.shotGot, sh.status === 'omitted' && o.shotDropped)}>
              <span className={o.shotNum}>{sh.shot_number}</span>
              <span className={o.shotWhat}>{[sh.shot_size, sh.angle, sh.movement, sh.lens].filter(Boolean).join(' · ') || 'Shot'}{sh.description ? ` — ${sh.description}` : ''}</span>
              <button type="button" className={o.got} aria-pressed={sh.status === 'shot'} aria-label={`Shot ${sh.shot_number}: ${sh.status === 'shot' ? 'got it — undo' : 'mark got'}`}
                onClick={() => void setShot(sh, sh.status === 'shot' ? 'planned' : 'shot')}><Check size={14} /> Got</button>
              <button type="button" className={o.drop} aria-pressed={sh.status === 'omitted'} aria-label={`Shot ${sh.shot_number}: ${sh.status === 'omitted' ? 'dropped — undo' : 'drop'}`}
                onClick={() => void setShot(sh, sh.status === 'omitted' ? 'planned' : 'omitted')}><Minus size={14} /> Drop</button>
            </li>
          ))}
        </ul>
      )}

      <button type="button" className={o.contToggle} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        Continuity · {continuity.length}
      </button>
      {open && (
        <div className={o.cont}>
          {continuity.length > 0 && (
            <ul className={o.contList}>
              {continuity.map((r) => {
                const path = mediaPath(r.media_id);
                const sh = r.shot_id ? shots.find((x) => x.id === r.shot_id) : null;
                return (
                  <li key={r.id} className={o.contItem}>
                    {path && photos[path] && (
                      // eslint-disable-next-line @next/next/no-img-element -- signed storage URL, also opened offline on set (the optimizer route needs the network)
                      <a href={photos[path]} target="_blank" rel="noopener noreferrer"><img src={photos[path]} alt={`Continuity photo${sh ? `, shot ${sh.shot_number}` : ''}`} className={o.contPhoto} /></a>
                    )}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p className={o.contMeta}>{fmtDate(r.at.slice(0, 10))} · {fmtTime(r.at)}{sh ? ` · shot ${sh.shot_number}` : ''}{r.take ? ` · take ${r.take}` : ''}</p>
                      {r.body && <p className={o.contBody}>{r.body}</p>}
                    </div>
                    {(r.created_by === userId || isOwner) && (
                      <button type="button" className={s.refRemoveInline} aria-label="Remove this continuity note" onClick={async () => {
                        if (!await confirm('Remove this continuity note?')) return;
                        onUnlog(r.id);
                        try { await sync.run({ kind: 'log-delete', id: r.id }, () => studio.deleteSetLog(r.id)); }
                        catch (e) { onLog(r); toast(e instanceof Error ? e.message : 'Could not remove it', 'error'); }
                      }}><Trash2 size={12} /></button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <ContinuityComposer sync={sync} projectId={project.id} userId={userId} scene={scene} shots={ordered} onLog={onLog} onUnlog={onUnlog} onMedia={(m) => media.upsertLocal(m)} />
        </div>
      )}
    </article>
  );
}

function ContinuityComposer({ sync, projectId, userId, scene, shots, onLog, onUnlog, onMedia }: {
  sync: OnSetSync; projectId: string; userId: string; scene: SceneRow; shots: Shot[];
  onLog: (row: SetLogRow) => void; onUnlog: (id: string) => void; onMedia: (m: Awaited<ReturnType<typeof studio.uploadFile>>) => void;
}) {
  const { toast } = useToast();
  const [body, setBody] = useState('');
  const [shotId, setShotId] = useState('');
  const [take, setTake] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const id = `cont-${scene.id}`;

  const save = async () => {
    if ((!body.trim() && !photo) || busy) return;
    // A photo is a file upload: it needs the connection. Notes don't.
    if (photo && !sync.online) { toast('Photos need a connection — log the note now and add the photo when you’re back online', 'error'); return; }
    setBusy(true);
    let entry: (SetLogEntry & { id: string }) | null = null;
    try {
      let mediaId: string | null = null;
      if (photo) {
        const m = await studio.uploadFile(projectId, userId, photo, { title: `Continuity · Sc ${scene.scene_number}`, board: 'Continuity' });
        onMedia(m);
        mediaId = m.id;
      }
      const n = Number(take);
      const e: SetLogEntry & { id: string } = {
        id: crypto.randomUUID(), project_id: projectId, kind: 'continuity', scene_id: scene.id, shot_id: shotId || null,
        take: Number.isInteger(n) && n >= 1 && n <= 999 ? n : null, body: body.trim() || null, media_id: mediaId, at: new Date().toISOString(),
      };
      entry = e;
      // Shown at once; the form is ready for the next note.
      onLog(draftLogRow(e, userId));
      setBody(''); setTake(''); setPhoto(null);
      if (file.current) file.current.value = '';
      await sync.run({ kind: 'log-add', entry: e }, async () => { onLog(await studio.addSetLog(e)); });
    } catch (err) {
      if (entry) { onUnlog(entry.id); setBody(entry.body ?? ''); setTake(entry.take ? String(entry.take) : ''); }
      toast(err instanceof Error ? err.message : 'Could not save the note', 'error');
    }
    finally { setBusy(false); }
  };

  return (
    <div className={o.composer}>
      <label className={s.srOnly} htmlFor={`${id}-body`}>Continuity note for scene {scene.scene_number}</label>
      <textarea id={`${id}-body`} className={s.textarea} rows={2} maxLength={2000} placeholder="What to match — hair, props, eyelines, what’s in whose hand…"
        value={body} onChange={(e) => setBody(e.target.value)} />
      <div className={o.composerRow}>
        {shots.length > 0 && (
          <select className={s.select} aria-label="Shot" value={shotId} onChange={(e) => setShotId(e.target.value)}>
            <option value="">Whole scene</option>
            {shots.map((sh) => <option key={sh.id} value={sh.id}>Shot {sh.shot_number}</option>)}
          </select>
        )}
        <label className={s.srOnly} htmlFor={`${id}-take`}>Take</label>
        <input id={`${id}-take`} className={cx(s.input, s.mono)} style={{ width: 72 }} inputMode="numeric" placeholder="Take" value={take} onChange={(e) => setTake(e.target.value.replace(/\D/g, '').slice(0, 3))} />
        <input ref={file} id={`${id}-photo`} type="file" accept="image/*" capture="environment" className={s.srOnly} onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
        <label htmlFor={`${id}-photo`} className={cx(s.btnGhost, s.small)} style={{ cursor: 'pointer' }}><Camera size={11} /> {photo ? 'Photo ready' : 'Photo'}</label>
        <button type="button" className={cx(s.btnPrimary, s.small)} onClick={() => void save()} disabled={busy || (!body.trim() && !photo)}><Plus size={11} /> {busy ? 'Saving…' : 'Log'}</button>
      </div>
    </div>
  );
}

function DayNotes({ sync, sheetId, rows, onLog, onUnlog }: { sync: OnSetSync; sheetId: string; rows: SetLogRow[]; onLog: (r: SetLogRow) => void; onUnlog: (id: string) => void }) {
  const { project, userId, isOwner } = useStudio();
  const { toast } = useToast();
  const [body, setBody] = useState('');
  const add = async () => {
    const text = body.trim();
    if (!text) return;
    const entry = { id: crypto.randomUUID(), project_id: project.id, kind: 'note', call_sheet_id: sheetId, body: text, at: new Date().toISOString() };
    onLog(draftLogRow(entry, userId));
    setBody('');
    try { await sync.run({ kind: 'log-add', entry }, async () => { onLog(await studio.addSetLog(entry)); }); }
    catch (e) { onUnlog(entry.id); setBody(text); toast(e instanceof Error ? e.message : 'Could not add the note', 'error'); }
  };
  const label = (r: SetLogRow) => CLOCK.find((c) => c.kind === r.kind)?.label ?? 'Note';
  return (
    <section className={o.log} aria-labelledby="onset-log">
      <h3 id="onset-log" className={o.eyebrow}>The day’s log</h3>
      {rows.length === 0 ? <p className={s.hint}>Nothing logged yet today.</p> : (
        <ol className={o.logList}>
          {rows.map((r) => (
            <li key={r.id} className={o.logItem}>
              <span className={o.logTime}>{fmtTime(r.at)}</span>
              <span className={o.logKind}>{label(r)}</span>
              {r.body && <span className={o.logBody}>{r.body}</span>}
              {r.kind === 'note' && (r.created_by === userId || isOwner) && (
                <button type="button" className={s.refRemoveInline} aria-label="Remove this note" onClick={async () => {
                  onUnlog(r.id);
                  try { await sync.run({ kind: 'log-delete', id: r.id }, () => studio.deleteSetLog(r.id)); }
                  catch (e) { onLog(r); toast(e instanceof Error ? e.message : 'Could not remove it', 'error'); }
                }}><Trash2 size={11} /></button>
              )}
            </li>
          ))}
        </ol>
      )}
      <div className={o.composerRow}>
        <label className={s.srOnly} htmlFor="onset-note">Note for the day</label>
        <input id="onset-note" className={s.input} style={{ flex: 1 }} maxLength={2000} placeholder="Note for the day — a delay, a change, a win…" value={body}
          onChange={(e) => setBody(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void add(); }} />
        <button type="button" className={cx(s.btn, s.small)} onClick={() => void add()} disabled={!body.trim()}><Plus size={11} /> Note</button>
      </div>
    </section>
  );
}
