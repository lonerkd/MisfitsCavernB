'use client';

// The crew's view of a call sheet — where a call sheet notification lands.
// Shows what was issued (the latest version), with the viewer's own call at
// the top and "Got it" to confirm they've seen this version. Read through
// RLS: members of the production only.

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Check, MapPin, Printer } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useOSGate, useProject } from '@/lib/os';
import { useToast } from '@/components/Toast';
import { useCanShape } from '@/lib/brief';
import {
  callFor, hhmm, issueState, snapshotOf, studio, toSnapshot,
  type CallSheet, type CallSheetCall, type CallSheetSnapshot,
} from '@/lib/studio';
import c from './call.module.css';

interface SceneLite { id: string; scene_number: number; heading: string | null; title: string; location: string | null; cast_list: string | null; est_duration: string | null }
interface Person { id: string; username: string; craft: string | null }

const longDate = (d: string | null) => (d ? new Date(`${d}T00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : null);

export default function CallSheetPage() {
  const { user } = useOSGate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { projects, setActiveProject } = useProject();

  const [sheet, setSheet] = useState<CallSheet | null>(null);
  const [calls, setCalls] = useState<CallSheetCall[]>([]);
  const [project, setProject] = useState<{ id: string; title: string; creator_id: string } | null>(null);
  const [scenes, setScenes] = useState<SceneLite[]>([]);
  const [people, setPeople] = useState<Map<string, Person>>(new Map());
  const [castAs, setCastAs] = useState<string[]>([]);
  const [acked, setAcked] = useState<number | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const uid = user?.id;
    if (!uid) return;
    let alive = true;
    const load = async () => {
      const { data: s } = await supabase.from('call_sheets').select('*').eq('id', id).maybeSingle();
      if (!alive) return;
      if (!s) { setState('missing'); return; }
      const [p, cl, sc, crew, cast, ack] = await Promise.all([
        supabase.from('projects').select('id, title, creator_id').eq('id', s.project_id).single(),
        supabase.from('call_sheet_calls').select('*').eq('call_sheet_id', s.id),
        supabase.from('scenes').select('id, scene_number, heading, title, location, cast_list, est_duration')
          .eq('project_id', s.project_id).eq('shoot_day', s.shoot_day).is('removed_at', null).order('scene_number'),
        supabase.from('project_crew').select('user_id, craft, profiles!project_crew_user_id_fkey(username)').eq('project_id', s.project_id),
        supabase.from('character_castings').select('character_name').eq('project_id', s.project_id).eq('crew_user_id', uid),
        supabase.from('call_sheet_acks').select('version').eq('call_sheet_id', s.id).eq('user_id', uid).maybeSingle(),
      ]);
      const map = new Map<string, Person>();
      for (const m of crew.data ?? []) map.set(m.user_id, { id: m.user_id, username: m.profiles?.username ?? 'Crew', craft: m.craft });
      if (p.data && !map.has(p.data.creator_id)) {
        const { data: owner } = await supabase.from('profiles').select('id, username').eq('id', p.data.creator_id).maybeSingle();
        if (owner) map.set(owner.id, { id: owner.id, username: owner.username, craft: 'Producer' });
      }
      if (!alive) return;
      setSheet(s);
      setCalls(cl.data ?? []);
      setProject(p.data ?? null);
      setScenes((sc.data ?? []) as SceneLite[]);
      setPeople(map);
      setCastAs((cast.data ?? []).map((r) => r.character_name));
      setAcked(ack.data?.version ?? null);
      setState('ready');
    };
    void load();
    return () => { alive = false; };
  }, [id, user?.id]);

  const isOwner = !!project && project.creator_id === user?.id;
  const canIssue = useCanShape(project?.id, isOwner);
  // The crew see what was issued; a draft shows as it stands, marked as a draft.
  const snap: CallSheetSnapshot | null = useMemo(
    () => (sheet ? toSnapshot(sheet.issued) ?? snapshotOf(sheet, calls) : null),
    [sheet, calls],
  );
  const status = sheet ? issueState(sheet, calls) : { status: 'draft' as const };
  const mine = snap && user?.id ? callFor(snap, user.id, castAs) : null;

  const confirm = async () => {
    if (!sheet) return;
    setConfirming(true);
    try {
      setAcked(await studio.ackCallSheet(sheet.id));
      toast(`Confirmed — see you on Day ${sheet.shoot_day}`, 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not confirm', 'error');
    } finally {
      setConfirming(false);
    }
  };

  const openInStudio = () => {
    const p = projects.find((x) => x.id === project?.id);
    if (p) setActiveProject(p);
  };

  if (state === 'loading') {
    return <main className={c.page}><div className={c.frame}><div className="skeleton" style={{ height: 180, borderRadius: 14 }} /></div></main>;
  }
  if (state === 'missing' || !sheet || !snap) {
    return (
      <main className={c.page}>
        <div className={c.frame}>
          <h1 className={c.title}>Call sheet not found</h1>
          <p className={c.lead}>It may have been removed, or you’re not on this production. <Link href="/projects">Your projects</Link></p>
        </div>
      </main>
    );
  }

  const version = sheet.version;
  const castCalls = Object.entries(snap.cast_calls).sort(([a], [b]) => a.localeCompare(b));
  const crewCalls = Object.entries(snap.calls)
    .map(([uid, v]) => ({ uid, ...v, person: people.get(uid) }))
    .sort((a, b) => (a.call_time ?? '99').localeCompare(b.call_time ?? '99'));

  return (
    <main className={c.page}>
      <div className={c.frame}>
        <p className={c.eyebrow}>{project?.title} · call sheet{version ? ` · v${version}` : ''}</p>
        <h1 className={c.title}>Day {sheet.shoot_day}</h1>
        {snap.shoot_date && <p className={c.lead}>{longDate(snap.shoot_date)}</p>}

        {version === 0 && (
          <p className={c.banner} role="status">Draft — not issued yet. {canIssue ? 'Issue it from Studio › Schedule when it’s ready.' : 'You’ll be told when it’s issued.'}</p>
        )}
        {version > 0 && canIssue && status.status === 'changed' && (
          <p className={c.banner} role="status">The draft has changed since v{version} ({status.changes.join(', ')}). The crew still see v{version} until you issue a revision.</p>
        )}

        <section className={c.mine} aria-labelledby="my-call">
          <h2 id="my-call" className={c.mineLabel}>Your call</h2>
          <p className={c.mineTime}>{hhmm(mine?.call_time) || hhmm(snap.general_call) || '—'}</p>
          <p className={c.mineHint}>
            {mine?.call_time ? (mine.as ? `As ${mine.as}` : 'Your own call time') : snap.general_call ? 'General call — no call of your own on this sheet' : 'No call time on this sheet yet'}
            {mine?.remarks ? ` · ${mine.remarks}` : ''}
          </p>
          {version > 0 && (
            acked === version ? (
              <p className={c.confirmed} role="status"><Check size={14} aria-hidden /> You confirmed v{version}</p>
            ) : (
              <div className={c.confirmRow}>
                {acked && <span className={c.mineHint}>A revision (v{version}) went out since you confirmed v{acked}.</span>}
                <button type="button" className={c.confirm} onClick={() => void confirm()} disabled={confirming}>
                  <Check size={14} aria-hidden /> {confirming ? 'Confirming…' : 'Got it'}
                </button>
              </div>
            )
          )}
        </section>

        <section className={c.grid} aria-label="The day">
          {[
            ['General call', hhmm(snap.general_call)],
            ['Shooting call', hhmm(snap.shooting_call)],
            ['Est. wrap', hhmm(snap.estimated_wrap)],
            ['Weather', snap.weather],
          ].filter(([, v]) => v).map(([label, v]) => (
            <div key={label as string} className={c.fact}><span className={c.factLabel}>{label}</span><span className={c.factValue}>{v}</span></div>
          ))}
          {snap.location_address && (
            <div className={c.fact} style={{ gridColumn: '1 / -1' }}>
              <span className={c.factLabel}>Location</span>
              <span className={c.factValue}>
                {snap.location_address}{' '}
                <a className={c.map} href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(snap.location_address)}`} target="_blank" rel="noopener noreferrer">
                  <MapPin size={12} aria-hidden /> Map<span className="sr-only"> (opens in a new tab)</span>
                </a>
              </span>
            </div>
          )}
        </section>
        {snap.notes && <section aria-labelledby="notes"><h2 id="notes" className={c.h2}>Notes</h2><p className={c.notes}>{snap.notes}</p></section>}

        <section aria-labelledby="scenes">
          <h2 id="scenes" className={c.h2}>Scenes ({scenes.length})</h2>
          {scenes.length ? (
            <ol className={c.list}>
              {scenes.map((sc) => (
                <li key={sc.id}><span className={c.num}>{sc.scene_number}.</span> {sc.heading ?? sc.title}{sc.cast_list ? <span className={c.dim}> — {sc.cast_list}</span> : null}</li>
              ))}
            </ol>
          ) : <p className={c.dim}>No scenes scheduled on this day yet.</p>}
        </section>

        <section aria-labelledby="calls">
          <h2 id="calls" className={c.h2}>Calls</h2>
          <table className={c.table}>
            <caption className="sr-only">Everyone’s call on Day {sheet.shoot_day}</caption>
            <thead><tr><th scope="col">Who</th><th scope="col">Role</th><th scope="col">Call</th><th scope="col">Remarks</th></tr></thead>
            <tbody>
              {castCalls.map(([name, v]) => (
                <tr key={`c:${name}`}><td>{name}</td><td className={c.dim}>Cast</td><td>{hhmm(v.call_time) || '—'}</td><td>{v.remarks}</td></tr>
              ))}
              {crewCalls.map((r) => (
                <tr key={`u:${r.uid}`} className={r.uid === user?.id ? c.me : undefined}>
                  <td>{r.person?.username ?? 'Crew'}{r.uid === user?.id ? ' (you)' : ''}</td>
                  <td className={c.dim}>{r.person?.craft ?? ''}</td><td>{hhmm(r.call_time) || '—'}</td><td>{r.remarks}</td>
                </tr>
              ))}
              {!castCalls.length && !crewCalls.length && <tr><td colSpan={4} className={c.dim}>No individual calls — everyone’s on the general call.</td></tr>}
            </tbody>
          </table>
        </section>

        <div className={c.actions}>
          <button type="button" className={c.secondary} onClick={() => window.print()}><Printer size={13} aria-hidden /> Print</button>
          {canIssue && <Link href="/studio?tab=production&view=schedule" className={c.secondary} onClick={openInStudio}>Edit in Studio</Link>}
        </div>
      </div>
    </main>
  );
}
