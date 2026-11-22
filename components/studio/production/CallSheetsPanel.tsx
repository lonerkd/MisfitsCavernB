'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, ExternalLink, Printer, Send } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useCanShape } from '@/lib/brief';
import { dayConflicts, describeRange, useProjectAvailability } from '@/lib/availability';
import { placeResolver } from '@/lib/film/places';
import {
  EMERGENCY_FIELDS, callTextBody, issueState, locationKey, smsHref, studio, toSnapshot, useCallSheetAcks, useCastings, useCallSheets, useCallSheetCalls, useProjectLocations, useShootDays,
  type CallSheet, type CallSheetAck, type CallSheetCall, type CallSheetPatch, type CallTarget, type IssueState, type SceneRow,
} from '@/lib/studio';
import { lightLine, lightNoteText, type FilmDay } from '@/lib/film/days';
import { lightNoteBrief } from '@/lib/film/sky';
import { buildSides } from '@/lib/film/sides';
import { lookChangeText, lookChanges, lookChangesOnDay } from '@/lib/film/continuity';
import { useCharacters, useSceneStates } from '@/lib/studio';
import { sidesHtml } from '@/lib/film/sides-print';
import { callSheetDoc } from '@/lib/studio/call-sheet-print';
import { printDocument, printHtmlString } from '@/lib/print/print';
import { buildBoard, stripKind, type StripKind } from '@/lib/studio/stripboard';
import { Sky } from '@/components/film/Sky';
import { Stamp } from '@/components/film/Stamp';
import { Paper, PaperHead } from '@/components/film/Paper';
import { TimeBox, TimeBoxes } from '@/components/film/TimeBox';
import { deviceZone, filmDays } from '@/lib/film/studio';
import { useStudio } from '../StudioContext';
import { cx } from '../ui';
import s from '../studio.module.css';
import c from './callsheet.module.css';

type CrewMember = { user_id: string; role: string; username?: string };

const hhmm = (t: string | null | undefined) => (t ? t.slice(0, 5) : '');

function dayFacts(scenes: SceneRow[], day: number, castOf: (sc: SceneRow) => string[], placeOf: (sc: SceneRow) => string, doubtfulOrdinals?: Set<number>) {
  const dayScenes = scenes.filter((sc) => (sc.shoot_day ?? 1) === day).sort((a, b) => a.scene_number - b.scene_number);
  const locations = Array.from(new Set(dayScenes.map(placeOf).filter(Boolean)));
  const cast = Array.from(new Set(dayScenes.flatMap(castOf)));
  const eighths = dayScenes.reduce((t, sc) => { const m = String(sc.est_duration || '').match(/(\d+)\/8/); return t + (m ? Number(m[1]) : 0); }, 0);
  const doubtful = doubtfulOrdinals ? dayScenes.filter((sc) => sc.ordinal != null && doubtfulOrdinals.has(sc.ordinal)).length : 0;
  return { dayScenes, locations, cast, pages: eighths ? (eighths / 8).toFixed(1) : null, doubtful };
}

/**
 * Call sheets per shoot day. Scenes, locations and cast come from the
 * schedule; date, call times, address, weather, notes and each person's call
 * are saved (call_sheets / call_sheet_calls) and shared live with the crew.
 */
export function CallSheetsPanel({ scenes, crew }: { scenes: SceneRow[]; crew: CrewMember[] }) {
  const { project, sceneLines, castOf, doubtfulSceneOrdinals } = useStudio();
  const { toast } = useToast();
  const castings = useCastings(project.id);
  const sheets = useCallSheets(project.id);
  const calls = useCallSheetCalls(project.id);
  const acks = useCallSheetAcks(project.id);
  const locations = useProjectLocations(project.id);
  const shootDays = useShootDays(project.id);
  // Each day's light, from where it shoots and its date (the film graph).
  const film = useMemo(
    () => new Map(filmDays({ scenes, days: shootDays.rows, places: locations.rows, sheets: sheets.rows, viewerZone: deviceZone() }).map((d) => [d.number, d])),
    [scenes, shootDays.rows, locations.rows, sheets.rows],
  );
  const placeOf = useMemo(() => placeResolver(locations.rows), [locations.rows]);
  const addressOf = useMemo(() => new Map(locations.rows.filter((l) => l.address).map((l) => [locationKey(l.name), l.address as string])), [locations.rows]);
  const [openDay, setOpenDay] = useState<number | null>(null);
  // The emergency details a new sheet starts with: the production types them once, and a new day copies the latest sheet's
  // (the sheet at the same address first, since the hospital belongs to the place).
  const safetyDefaults = (address: string | null | undefined): CallSheetPatch => {
    const filled = sheets.rows.filter((x) => EMERGENCY_FIELDS.some((k) => x[k])).sort((a, b) => b.shoot_day - a.shoot_day);
    const from = filled.find((x) => address && x.location_address === address) ?? filled[0];
    return from ? Object.fromEntries(EMERGENCY_FIELDS.filter((k) => from[k]).map((k) => [k, from[k]])) as CallSheetPatch : {};
  };
  const days = useMemo(() => Array.from(new Set(scenes.map((sc) => sc.shoot_day ?? 1))).sort((a, b) => a - b), [scenes]);
  const sheetFor = (day: number) => sheets.rows.find((x) => x.shoot_day === day);
  // Who's away on a dated day — seen by those who plan the production.
  const { isOwner, userId: me } = useStudio();
  const canShape = useCanShape(project.id, isOwner);
  const away = useProjectAvailability(project.id, canShape);
  const conflicts = useMemo(() => dayConflicts(sheets.rows, away), [sheets.rows, away]);
  const nameOf = (userId: string) => (userId === me ? 'You' : crew.find((m) => m.user_id === userId)?.username || 'The owner');

  // Continuity: a look that changes inside one story day, where one of its scenes is shot on that day (wardrobe and make-up read this).
  const sceneStates = useSceneStates(project.id);
  const people = useCharacters(project.id);
  const looksFor = (day: number): string[] => {
    const nameOf = new Map(people.rows.map((p) => [p.id, p.name]));
    const dayRows = scenes.filter((sc) => (sc.shoot_day ?? 1) === day);
    return lookChangesOnDay(lookChanges(scenes, sceneStates.rows), dayRows).map((ch) => lookChangeText(nameOf.get(ch.character_id) ?? 'A character', ch));
  };

  const print = (day: number) => {
    const d = dayFacts(scenes, day, castOf, placeOf, doubtfulSceneOrdinals);
    const sheet = sheetFor(day);
    const mine = calls.rows.filter((c) => c.call_sheet_id === sheet?.id);
    const callOf = (t: CallTarget) => mine.find((c) => ('crew_user_id' in t ? c.crew_user_id === t.crew_user_id : c.character_name === t.character_name));
    const ok = printDocument(callSheetDoc({
      project: project.title,
      accent: project.accent_color, logo: project.logo_url,
      day,
      date: sheet?.shoot_date ? new Date(sheet.shoot_date + 'T00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : null,
      generalCall: hhmm(sheet?.general_call), shootingCall: hhmm(sheet?.shooting_call), wrap: hhmm(sheet?.estimated_wrap),
      location: sheet?.location_address ?? null, weather: sheet?.weather ?? null, light: lightLine(film.get(day)?.light) ?? '',
      planNotes: [...(film.get(day)?.notes ?? []).filter((n) => n.kind !== 'no-date' && n.kind !== 'no-place').map((n) => lightNoteText(n)), ...looksFor(day).map((l) => `Look change: ${l}`)],
      notes: sheet?.notes ?? null,
      emergency: sheet ? { hospitalName: sheet.hospital_name, hospitalAddress: sheet.hospital_address, hospitalPhone: sheet.hospital_phone, policePhone: sheet.police_phone, medic: sheet.medic } : undefined,
      scenes: d.dayScenes.map((sc) => ({ number: sc.scene_number, heading: sc.heading ?? sc.title ?? '' })),
      pages: d.pages, locations: d.locations,
      cast: d.cast.map((name) => { const c = callOf({ character_name: name }); return { name, call: hhmm(c?.call_time), remarks: c?.remarks ?? null }; }),
      crew: crew.map((m) => { const c = callOf({ crew_user_id: m.user_id }); return { name: m.username || 'Crew', role: m.role, call: hhmm(c?.call_time), remarks: c?.remarks ?? null }; }),
      generated: new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }),
    }));
    if (!ok) toast('Could not open the print dialog.', 'error');
  };

  // Each called actor's pages for the day, from the script's saved text.
  const printSides = (day: number) => {
    const d = dayFacts(scenes, day, castOf, placeOf, doubtfulSceneOrdinals);
    const sheet = sheetFor(day);
    const mine = calls.rows.filter((x) => x.call_sheet_id === sheet?.id);
    const sides = buildSides(
      d.dayScenes.map((sc) => ({ heading: sc.heading ?? sc.title ?? '', sceneNumber: sc.scene_number, lines: sceneLines.get(sc.id) ?? [] })),
      d.cast.map((name) => ({
        character: name,
        actor: crew.find((m) => m.user_id === castings.rows.find((k) => k.character_name.toUpperCase() === name.toUpperCase())?.crew_user_id)?.username ?? null,
        call: hhmm(mine.find((x) => x.character_name === name)?.call_time) || null,
      })),
    );
    if (!sides.length) { toast('No one called that day has lines in the script yet.', 'info'); return; }
    const ok = printHtmlString(sidesHtml(sides, { title: project.title, day, date: sheet?.shoot_date ? new Date(sheet.shoot_date + 'T00:00').toDateString() : null, autoprint: false }));
    if (!ok) toast('Could not open the print dialog.', 'error');
  };

  return (
    <div className={s.panel}>
      <div className={s.panelTitle}>Call sheets</div>
      {(sheets.status === 'error' || calls.status === 'error') && <div className={s.hint} style={{ color: 'var(--danger)' }}>{sheets.error || calls.error}</div>}
      <div className={c.list}>
        {days.map((day) => {
          const d = dayFacts(scenes, day, castOf, placeOf, doubtfulSceneOrdinals);
          const sheet = sheetFor(day);
          const open = openDay === day;
          const dayCalls = calls.rows.filter((x) => x.call_sheet_id === sheet?.id);
          const state = issueState(sheet, dayCalls);
          const clash = conflicts.get(day) ?? [];
          return (
            <div key={day} className={c.card}>
              {open ? (
                <DayEditor
                  looksToday={looksFor(day)}
                  day={day} sheet={sheet} facts={d} crew={crew} state={state} film={film.get(day)}
                  addresses={d.locations.map((name) => ({ name, address: addressOf.get(locationKey(name)) })).filter((x): x is { name: string; address: string } => !!x.address)}
                  acks={acks.rows.filter((a) => a.call_sheet_id === sheet?.id)}
                  onIssued={(row) => sheets.upsertLocal(row)}
                  calls={dayCalls}
                  onSheet={(row) => sheets.upsertLocal(row)}
                  onCall={(row, removedId) => { if (row) calls.upsertLocal(row); else if (removedId) calls.removeLocal(removedId); }}
                  defaults={safetyDefaults}
                  onPrint={() => print(day)}
                  onPrintSides={() => printSides(day)}
                  onClose={() => setOpenDay(null)}
                />
              ) : (
                <button type="button" className={c.row} onClick={() => setOpenDay(day)} aria-expanded={false}>
                  <span className={c.rowDay}>Day {day}</span>
                  <span className={c.rowWhen}>{sheet?.shoot_date ? new Date(sheet.shoot_date + 'T00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) : 'No date'}</span>
                  <span className={c.rowMeta}>{d.dayScenes.length} {d.dayScenes.length === 1 ? 'scene' : 'scenes'}{d.pages ? ` · ${d.pages} pg` : ''}{d.doubtful > 0 ? ` · ${d.doubtful} doubtful` : ''}</span>
                  <Stamp tone={state.status === 'issued' ? 'ok' : state.status === 'changed' ? 'limit' : 'quiet'}>
                    {state.status === 'draft' ? 'Draft' : state.status === 'issued' ? `Issued v${state.version}` : 'Changed'}
                  </Stamp>
                </button>
              )}
              {clash.length > 0 && (
                <p className={c.away} role="note">
                  Away that day: {clash.map((a) => `${nameOf(a.user_id)} (${describeRange(a.starts_on, a.ends_on)})`).join(', ')}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Issuing: a draft goes out as v1, later changes as revisions (v2…). Everyone
 * on the production is told their own call (and on a revision what changed),
 * and confirms from the crew view; this shows who has.
 */
function IssueBar({ sheet, state, crew, acks, onIssued }: {
  sheet: CallSheet | undefined; state: IssueState; crew: CrewMember[]; acks: CallSheetAck[]; onIssued: (row: CallSheet) => void;
}) {
  const { project, isOwner } = useStudio();
  const canIssue = useCanShape(project.id, isOwner);
  const { toast } = useToast();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const issue = async () => {
    if (!sheet) return;
    setBusy(true);
    try {
      const row = await studio.issueCallSheet(sheet.id, note);
      onIssued(row);
      setNote('');
      toast(row.version > 1 ? `Revision v${row.version} sent to the crew` : 'Call sheet sent to the crew', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not issue the call sheet', 'error');
    } finally {
      setBusy(false);
    }
  };

  const version = state.status === 'draft' ? 0 : state.version;
  const ackOf = (userId: string) => acks.find((a) => a.user_id === userId);
  const confirmed = crew.filter((m) => ackOf(m.user_id)?.version === version);
  const needsIssue = state.status !== 'issued';
  const dated = !!sheet?.shoot_date;

  return (
    <div className={c.issue}>
      {state.status === 'changed' && <p className={c.status} role="status">Changed since v{state.version} · {state.changes.join(', ') || 'details'}</p>}
      {state.status === 'issued' && sheet?.issued_at && (
        <p className={c.status}>{new Date(sheet.issued_at).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
      )}
      {canIssue && needsIssue && (
        <div className={c.issueRow}>
          <input placeholder="Note to the crew" aria-label="Note to the crew" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
          <button type="button" className={c.solid} onClick={() => void issue()} disabled={busy || !dated || !sheet} title={dated ? undefined : 'Set the date first'}>
            <Send size={12} aria-hidden /> {busy ? 'Sending…' : state.status === 'draft' ? 'Send to crew' : `Send revision v${version + 1}`}
          </button>
        </div>
      )}
      {canIssue && needsIssue && !dated && <p className={c.status}>Set the date first.</p>}
      {version > 0 && crew.length > 0 && (
        <p className={c.seen}>
          <b>Confirmed v{version}: {confirmed.length} of {crew.length}</b>
          {' · '}
          {crew.map((m, i) => {
            const a = ackOf(m.user_id);
            const current = a?.version === version;
            return (
              <span key={m.user_id}>
                {i > 0 && ', '}
                <span style={{ color: current ? 'var(--on-paper)' : undefined, fontWeight: current ? 700 : undefined }}>
                  {current && <Check size={10} aria-hidden style={{ verticalAlign: -1, marginRight: 2 }} />}
                  {m.username || 'Crew'}{a && !current ? ` (saw v${a.version})` : ''}
                </span>
                {current && <span className="sr-only"> (confirmed)</span>}
              </span>
            );
          })}
        </p>
      )}
    </div>
  );
}

const STRIP_COLOR: Record<StripKind, string> = {
  'int-day': 'var(--strip-int-day)', 'ext-day': 'var(--strip-ext-day)', 'int-night': 'var(--strip-int-night)', 'ext-night': 'var(--strip-ext-night)',
};

function DayEditor({ defaults, day, looksToday, sheet, facts, crew, calls, state, acks, addresses, film, onIssued, onSheet, onCall, onPrint, onPrintSides, onClose }: {
  /** The emergency details a brand-new sheet copies (from the latest sheet), given the address it starts with. */
  defaults: (address: string | null | undefined) => CallSheetPatch;
  /** The day as the film graph has it: its light and what in the plan fights it. */
  film: FilmDay | undefined;
  /** Look changes the day touches (Continuity), worded for the sheet. */
  looksToday: string[];
  day: number; sheet: CallSheet | undefined; facts: ReturnType<typeof dayFacts>; crew: CrewMember[]; calls: CallSheetCall[];
  /** The day's locations that have an address on record (Production › Locations). */
  addresses: { name: string; address: string }[];
  state: IssueState; acks: CallSheetAck[]; onIssued: (row: CallSheet) => void;
  onSheet: (row: CallSheet) => void; onCall: (row: CallSheetCall | null, removedId?: string) => void; onPrint: () => void; onPrintSides: () => void; onClose: () => void;
}) {
  const { project, openCard, doubtfulSceneOrdinals } = useStudio();
  const { toast } = useToast();

  const saveSheet = async (patch: CallSheetPatch): Promise<CallSheet | null> => {
    // The first save creates the sheet: it starts with the production's emergency details, unless this save sets them.
    const first = sheet ? patch : { ...defaults(patch.location_address), ...patch };
    try { const row = await studio.saveCallSheet(project.id, day, first); onSheet(row); return row; }
    catch (e) { toast(e instanceof Error ? e.message : 'Could not save the call sheet', 'error'); return null; }
  };

  const autoFill = async () => {
    if (sheet) return;
    const patch: CallSheetPatch = {};
    if (facts.locations.length === 1) patch.location_address = facts.locations[0];
    if (facts.dayScenes.length) patch.notes = facts.dayScenes.map((sc) => `${sc.scene_number}. ${sc.heading ?? sc.title ?? ''}`).join('\n');
    const row = await saveSheet(patch);
    if (row) toast('Call sheet seeded from the schedule', 'success');
  };

  const field = (key: keyof CallSheetPatch, value: string) => {
    const current = (sheet?.[key] ?? '') as string;
    const next = value.trim() || null;
    if ((key.endsWith('call') || key === 'estimated_wrap' ? hhmm(current) : current) === (next ?? '')) return;
    void saveSheet({ [key]: next } as CallSheetPatch);
  };
  const commitTime = (key: 'general_call' | 'shooting_call' | 'estimated_wrap') => (next: string) => field(key, next);

  const saveCall = async (target: CallTarget, fields: { call_time: string | null; remarks: string | null; role_label?: string | null }) => {
    const existing = calls.find((x) => ('crew_user_id' in target ? x.crew_user_id === target.crew_user_id : x.character_name === target.character_name));
    const sh = sheet ?? await saveSheet({});
    if (!sh) return;
    try { onCall(await studio.saveCall(sh, target, existing, fields), existing?.id); }
    catch (e) { toast(e instanceof Error ? e.message : 'Could not save the call', 'error'); }
  };

  // Render helpers (plain functions, not components, so inputs keep focus across re-renders).
  const textField = (k: keyof CallSheetPatch, label: string, type = 'text', multiline = false, placeholder?: string) => {
    const raw = (sheet?.[k] ?? '') as string;
    const value = type === 'time' ? hhmm(raw) : raw;
    return (
      <label className={c.field} key={k}>
        <span>{label}</span>
        {multiline
          ? <textarea rows={2} defaultValue={value} key={`${k}:${value}`} placeholder={placeholder} onBlur={(e) => field(k, e.target.value)} maxLength={5000} />
          : <input type={type} defaultValue={value} key={`${k}:${value}`} placeholder={placeholder} onBlur={(e) => field(k, e.target.value)} maxLength={500} />}
      </label>
    );
  };

  // "Text it": the person's call as it was issued, with the link to the crew's call page, in the phone's own messaging app.
  const issuedSnap = sheet?.version ? toSnapshot(sheet.issued) : null;
  const textBody = (target: CallTarget, as: string | null) => {
    if (!sheet || !issuedSnap) return null;
    const entry = 'crew_user_id' in target ? issuedSnap.calls[target.crew_user_id] : issuedSnap.cast_calls[target.character_name];
    return callTextBody({
      project: project.title, day,
      date: issuedSnap.shoot_date ? new Date(issuedSnap.shoot_date + 'T00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) : null,
      call: hhmm(entry?.call_time) || hhmm(issuedSnap.general_call), as: entry?.call_time ? as : null, location: issuedSnap.location_address,
      url: `${window.location.origin}/call/${sheet.id}`,
    });
  };

  const callRow = (key: string, target: CallTarget, name: string, role?: string) => {
    const x = calls.find((y) => ('crew_user_id' in target ? y.crew_user_id === target.crew_user_id : y.character_name === target.character_name));
    const time = hhmm(x?.call_time);
    const remarks = x?.remarks ?? '';
    return (
      <div className={c.call} key={key}>
        <b>{name}{role ? <small> · {role}</small> : null}</b>
        <input
          type="time" aria-label={`Call time for ${name}`} defaultValue={time} key={`t:${x?.id}:${time}`}
          onBlur={(e) => { if (e.target.value !== time) void saveCall(target, { call_time: e.target.value || null, remarks: remarks || null }); }}
        />
        <input
          placeholder="Remarks" aria-label={`Remarks for ${name}`} defaultValue={remarks} key={`r:${x?.id}:${remarks}`} maxLength={1000}
          onBlur={(e) => { const v = e.target.value.trim(); if (v !== remarks) void saveCall(target, { call_time: time || null, remarks: v || null }); }}
        />
        {(() => {
          const body = textBody(target, 'character_name' in target ? target.character_name : null);
          if (!body) return null;
          return (
            <span className={c.textIt}>
              {/* A computer has no messaging app to open: the message is copied instead. */}
              <a href={smsHref(body)} aria-label={`Text ${name} their call`} className={c.ghost} onClick={() => { if (!navigator.maxTouchPoints) void navigator.clipboard?.writeText(body).then(() => toast('Message copied', 'success')); }}>Text it</a>
            </span>
          );
        })()}
      </div>
    );
  };

  const wrap = hhmm(sheet?.estimated_wrap);
  const late = !!film?.notes.some((n) => n.kind === 'wrap-after-light');
  const lightNotes = film?.notes ?? [];
  const stamp = state.status === 'draft' ? <Stamp onSky role="status">Draft</Stamp>
    : state.status === 'issued' ? <Stamp onSky tone="ok" role="status">Issued v{state.version}</Stamp>
    : <Stamp onSky>Changed</Stamp>;
  const dateText = sheet?.shoot_date ? new Date(sheet.shoot_date + 'T00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) : 'No date yet';

  return (
    <div>
      <Sky light={film?.light} shootFrom={hhmm(sheet?.shooting_call) || null} wrapAt={wrap || null} title={`Day ${day}`} subtitle={dateText} aside={stamp} />
      <Paper underSky>
        <div className={c.toolbar}>
          {state.status !== 'draft' && sheet && <Link href={`/call/${sheet.id}`} className={c.ghost}><ExternalLink size={12} aria-hidden /> Crew view</Link>}
          <button type="button" className={c.ghost} onClick={onPrint}><Printer size={12} aria-hidden /> Print</button>
          <button type="button" className={c.ghost} onClick={onPrintSides}><Printer size={12} aria-hidden /> Sides</button>
          <button type="button" className={c.ghost} onClick={onClose} aria-expanded>Close</button>
        </div>

        {!sheet && facts.dayScenes.length > 0 && (
          <button type="button" className={cx(s.btn, s.small)} onClick={() => void autoFill()} style={{ marginBottom: 8 }}>
            Seed from schedule
          </button>
        )}

        <TimeBoxes>
          <TimeBox label="Call" name="General call" value={hhmm(sheet?.general_call)} onCommit={commitTime('general_call')} />
          <TimeBox label="Shoot" name="Shooting call" value={hhmm(sheet?.shooting_call)} onCommit={commitTime('shooting_call')} />
          <TimeBox label="Wrap" name="Est. wrap" value={wrap} late={late} onCommit={commitTime('estimated_wrap')} />
        </TimeBoxes>

        <div role="group" aria-label={`Day ${day} light`} className={c.limits}>
          {lightLine(film?.light) && <span className="sr-only">{lightLine(film?.light)} · {film?.lightAt?.name}</span>}
          {lightNotes.map((n) => (n.kind === 'no-date' || n.kind === 'no-place' || n.kind === 'polar'
            ? <p key={n.kind} className={c.quiet} title={lightNoteText(n)}>{n.kind === 'no-place'
              ? <Link href="/studio?tab=production&view=locations">{lightNoteBrief(n)}</Link> : lightNoteBrief(n)}</p>
            : <p key={n.kind} className={c.limit} title={lightNoteText(n)}>{lightNoteBrief(n)}</p>))}
        </div>

        <IssueBar sheet={sheet} state={state} crew={crew} acks={acks} onIssued={onIssued} />

        <div className={c.pair}>
          {textField('shoot_date', 'Date', 'date')}
          {textField('location_address', 'Location address')}
        </div>
        {addresses.filter((a) => a.address !== sheet?.location_address).map((a) => (
          <div key={a.name} className={c.suggest}>
            <span>{a.name} is at {a.address}</span>
            <button type="button" onClick={() => void saveSheet({ location_address: a.address })}>Use this address</button>
          </div>
        ))}
        {textField('weather', 'Weather')}
        <PaperHead>Emergency</PaperHead>
        <div className={c.pair}>
          {textField('hospital_name', 'Nearest hospital')}{textField('hospital_phone', 'Hospital phone', 'tel')}
          {textField('hospital_address', 'Hospital address')}{textField('police_phone', 'Police')}
          {textField('medic', 'Set medic')}
        </div>
        {textField('notes', 'Notes', 'text', true, 'Parking, safety, catering')}

        <PaperHead aside={facts.pages ? `${facts.pages} pg` : undefined}>Scenes</PaperHead>
        {facts.dayScenes.length === 0 && <p className={c.none}>Nothing scheduled this day.</p>}
        {facts.dayScenes.map((sc) => (
          <div key={sc.id} className={c.scene} style={{ ['--k' as string]: STRIP_COLOR[stripKind(sc)] }}>
            <u aria-hidden />
            <i>{sc.scene_number}</i>
            <span><button type="button" onClick={() => openCard(sc.id)} title="Open the card" style={{ background: 'none', border: 'none', padding: 0, color: 'inherit', font: 'inherit', textAlign: 'left', cursor: 'pointer', textDecoration: 'underline dotted' }}>{sc.heading ?? sc.title}</button></span>
            <em>{String(sc.est_duration || '').match(/\d+\s*\/\s*8/)?.[0]?.replace(/\s/g, '') ?? ''}</em>
            {doubtfulSceneOrdinals.has(sc.ordinal ?? -1) && <span style={{ color: 'var(--warn)', fontSize: '0.75rem', marginLeft: 4 }}>⚠ review</span>}
          </div>
        ))}

        {looksToday.length > 0 && (
          <>
            <PaperHead>Look changes</PaperHead>
            {looksToday.map((line) => <div key={line} className={c.where}>⚠ {line}</div>)}
          </>
        )}

        {facts.locations.length > 0 && (
          <>
            <PaperHead>Where</PaperHead>
            {facts.locations.map((name) => <div key={name} className={c.where}>{name}<span>{addresses.find((a) => a.name === name)?.address ?? ''}</span></div>)}
          </>
        )}

        <PaperHead>Cast</PaperHead>
        <div className={c.calls}>
          {facts.cast.length ? facts.cast.map((name) => callRow(`c:${name}`, { character_name: name }, name)) : <p className={c.none}>No speaking cast in these scenes.</p>}
        </div>
        <PaperHead>Crew</PaperHead>
        <div className={c.calls}>
          {crew.length ? crew.map((m) => callRow(`u:${m.user_id}`, { crew_user_id: m.user_id }, m.username || 'Crew member', m.role)) : <p className={c.none}>No crew on this project yet.</p>}
        </div>
      </Paper>
    </div>
  );
}
