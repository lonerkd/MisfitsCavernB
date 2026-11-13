'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';
import Avatar from '@/components/ui/Avatar';
import { getCastingsForProject, setCasting, removeCasting, listCastingNotes, listAllCastingNotes, addCastingNote, deleteCastingNote, listAuditions, scheduleAudition, cancelAudition, listCastingHistory, type Casting, type CastingNote, type CastingAudition, type CastingHistoryEntry } from '@/lib/supabase/casting';
import { exportCastingSheet } from '@/lib/casting/export';
import { logActivity } from '@/lib/supabase/activity';
import { useCharacterMedia, useCharacters, useSceneCharacters, useSignedUrls, mediaSrc, type Media } from '@/lib/studio';
import { castByScene, castOfScene } from '@/lib/film/cast';
import { List as Users } from 'lucide-react';
import { useStudio } from './StudioContext';
import { useScriptCharacters } from './production/useScriptCharacters';
import { MediaThumbVisual } from './media/MediaThumb';
import { readable } from '@/lib/util/color';
import { useOnChange } from '@/lib/hooks/useOnChange';

type CrewRow = { id: string; user_id: string; role: string; craft?: string | null; profiles?: { username?: string | null; avatar_url?: string | null } | null };

/**
 * A casting call on Jobs, written from the script: accepting someone there
 * casts them as the character and adds them to the crew.
 */
function castingCallHref(projectTitle: string, character: string, fp: { sceneNums: number[]; days: number[] }) {
  const where = fp.sceneNums.length
    ? `${fp.sceneNums.length} scene${fp.sceneNums.length === 1 ? '' : 's'} over ${fp.days.length} shoot day${fp.days.length === 1 ? '' : 's'}`
    : 'scenes to be scheduled';
  const description = `Casting ${character} in ${projectTitle} — ${where}. Tell us about your experience and send a reel or self-tape.`;
  return `/jobs?${new URLSearchParams({ title: `Casting: ${character}`, role: 'Actor', character, description }).toString()}`;
}

/** Who plays whom: characters from the selected script, cast from the crew. */
export function CastingBoard({ crew }: { crew: CrewRow[] }) {
  const { project, userId, scriptId, scriptFormat, scenes, mediaById } = useStudio();
  const projectId = project.id;
  const { toast } = useToast();
  const { chars: scriptChars, status } = useScriptCharacters(scriptId, userId, scriptFormat);
  const chars = scriptChars.map((c) => ({ id: c.row?.id, name: c.name, color: c.color }));
  const loading = status === 'loading';
  const [castings, setCastings] = useState<Record<string, Casting>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [notes, setNotes] = useState<CastingNote[]>([]);
  const [noteDraft, setNoteDraft] = useState('');
  const [auditions, setAuditions] = useState<CastingAudition[]>([]);
  const [auditionUser, setAuditionUser] = useState('');
  const [auditionAt, setAuditionAt] = useState('');
  const [history, setHistory] = useState<CastingHistoryEntry[]>([]);
  const [compare, setCompare] = useState<string[]>([]);
  const characterLooks = useCharacterMedia(projectId);
  const storyCharacters = useCharacters(projectId);
  const sceneLinks = useSceneCharacters(projectId);
  const castByScn = useMemo(() => castByScene(sceneLinks.rows, storyCharacters.rows), [sceneLinks.rows, storyCharacters.rows]);
  const looks = useMemo(() => {
    const m: Record<string, Media[]> = {};
    for (const l of characterLooks.rows) {
      const item = mediaById.get(l.media_id);
      if (item) (m[l.character_id] ||= []).push(item);
    }
    return m;
  }, [characterLooks.rows, mediaById]);
  const signed = useSignedUrls(characterLooks.rows.map((l) => mediaById.get(l.media_id)?.storage_path));

  const loadCastings = useCallback(() => getCastingsForProject(projectId).then(setCastings, () => { /* shown as open roles */ }), [projectId]);
  useEffect(() => { void loadCastings(); }, [loadCastings]);
  useEffect(() => {
    void listCastingHistory(projectId).then(setHistory, () => setHistory([]));
  }, [projectId, castings]);
  useEffect(() => {
    if (!selected) return;
    let active = true;
    void listCastingNotes(projectId, selected).then(
      (n) => { if (active) setNotes(n); },
      () => { if (active) setNotes([]); },
    );
    void listAuditions(projectId, selected).then(
      (a) => { if (active) setAuditions(a); },
      () => { if (active) setAuditions([]); },
    );
    return () => { active = false; };
  }, [projectId, selected, castings]);
  // The script's characters changed: keep the selection if it's still one of them.
  useOnChange(scriptChars, () => setSelected((prev) => (prev && chars.some((c) => c.name === prev) ? prev : chars[0]?.name ?? null)));

  const footprint = (name: string) => {
    const up = name.toUpperCase();
    const inScenes = scenes.rows.filter((sc) => castOfScene(sc, castByScn).includes(up));
    const days = Array.from(new Set(inScenes.map((sc) => sc.shoot_day || 1))).sort((a, b) => a - b);
    return { sceneNums: inScenes.map((sc) => sc.scene_number).sort((a, b) => a - b), days };
  };

  const assign = async (crewUserId: string) => {
    if (!selected) return;
    try {
      await setCasting(projectId, selected, crewUserId, userId);
      logActivity(`cast a performer as ${selected}`, 'project', projectId);
      await loadCastings();
      setAssigning(false);
      toast(`Cast ${selected}`, 'success');
    } catch (e) { toast(e instanceof Error ? e.message : 'Could not cast', 'error'); }
  };
  const clearCasting = async (name: string) => {
    try { await removeCasting(projectId, name, userId); logActivity(`reopened casting for ${name}`, 'project', projectId); await loadCastings(); toast(`${name} reopened`, 'info'); }
    catch (e) { toast(e instanceof Error ? e.message : 'Could not update', 'error'); }
  };
  const addNote = async () => {
    if (!selected || !noteDraft.trim()) return;
    try { await addCastingNote(projectId, selected, noteDraft.trim(), userId); setNoteDraft(''); await loadCastings(); }
    catch (e) { toast(e instanceof Error ? e.message : 'Could not add note', 'error'); }
  };
  const removeNote = async (id: string) => {
    try { await deleteCastingNote(id); setNotes((n) => n.filter((x) => x.id !== id)); }
    catch (e) { toast(e instanceof Error ? e.message : 'Could not remove note', 'error'); }
  };
  const exportSheet = async () => {
    const all = await listAllCastingNotes(projectId).catch(() => []);
    const rows = chars.map((c) => ({ character: c.name, cast: castings[c.name.toUpperCase()] ?? null, notes: all.filter((n) => n.character_name === c.name.toUpperCase()) }));
    exportCastingSheet(project.title, rows);
  };
  const schedule = async () => {
    if (!selected || !auditionUser || !auditionAt) return;
    try {
      await scheduleAudition(projectId, selected, auditionUser, new Date(auditionAt).toISOString(), userId);
      setAuditionAt(''); setAuditionUser('');
      await loadCastings();
      toast('Audition scheduled', 'success');
    } catch (e) { toast(e instanceof Error ? e.message : 'Could not schedule', 'error'); }
  };
  const cancelAud = async (id: string) => {
    try { await cancelAudition(id); setAuditions((a) => a.filter((x) => x.id !== id)); }
    catch (e) { toast(e instanceof Error ? e.message : 'Could not cancel', 'error'); }
  };

  const sel = chars.find(c => c.name === selected) || null;
  const castCount = chars.filter(c => castings[c.name.toUpperCase()]).length;

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, fontSize: 13, fontWeight: 700, textTransform: 'var(--caps)', letterSpacing: 'var(--caps-track)' }}>
        <Users size={16} /> Casting Board
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-dim)', fontWeight: 400 }}>· {castCount}/{chars.length} cast · from ScriptOS</span>
        <button type="button" onClick={() => void exportSheet()} style={{ marginLeft: 'auto', padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'none', color: 'var(--fg-muted)', cursor: 'pointer', fontSize: 11, fontFamily: 'var(--mono)' }}>Export sheet</button>
      </div>
      {loading && <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-dim)' }}>Loading…</div>}
      {!loading && chars.length === 0 && <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-dim)' }}>Write characters in ScriptOS to populate the casting board.</div>}
      {chars.length > 0 && (
        <div className="mc-collapse" style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {chars.map(c => {
              const cast = castings[c.name.toUpperCase()];
              const active = selected === c.name;
              return (
                <button key={c.name} onClick={() => { setSelected(c.name); setAssigning(false); }} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', textAlign: 'left',
                  background: active ? `${c.color}18` : 'rgba(var(--ink-rgb), 0.02)',
                  border: `1px solid ${active ? `${c.color}55` : 'rgba(var(--ink-rgb), 0.06)'}`,
                  borderLeft: `3px solid ${c.color}`, borderRadius: 8, cursor: 'pointer',
                }}>
                  <span style={{ flex: 1, fontFamily: 'var(--display)', fontSize: '1rem', letterSpacing: '-0.02em', color: active ? readable(c.color) : 'var(--fg)' }}>{c.name}</span>
                  {cast ? (
                    <span title={`Cast: ${cast.username || 'crew'}`} style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', flexShrink: 0 }} />
                  ) : (
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)', textTransform: 'var(--caps)', letterSpacing: 'var(--caps-track)' }}>open</span>
                  )}
                </button>
              );
            })}
          </div>

          {sel && (() => {
            const cast = castings[sel.name.toUpperCase()];
            const looksFor = sel.id ? (looks[sel.id] || []) : [];
            const fp = footprint(sel.name);
            return (
              <div
                onDragOver={(e) => { if (e.dataTransfer.types.includes('text/cast-crew')) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } }}
                onDrop={(e) => {
                  const crewId = e.dataTransfer.getData('text/cast-crew');
                  if (crewId) { e.preventDefault(); void assign(crewId); }
                }}
                style={{ background: 'rgba(var(--ink-rgb), 0.02)', border: `1px solid ${sel.color}33`, borderRadius: 14, padding: 24 }}
              >
                <div style={{ fontFamily: 'var(--display)', fontSize: '1.8rem', letterSpacing: '-0.02em', color: sel.color, marginBottom: 20 }}>{sel.name}</div>

                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'var(--caps)', letterSpacing: 'var(--caps-track)', color: 'var(--fg-muted)', marginBottom: 10 }}>Casting</div>
                {cast ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'color-mix(in srgb, var(--ok) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--ok) 25%, transparent)', borderRadius: 8, marginBottom: 24 }}>
                    <Avatar src={cast.avatar_url} name={cast.username || 'Crew'} size={38} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{cast.username || 'Crew member'}</div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ok)', textTransform: 'var(--caps)', letterSpacing: 'var(--caps-track)' }}>Cast</div>
                    </div>
                    <button onClick={() => setAssigning(a => !a)} style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-muted)', background: 'rgba(var(--ink-rgb), 0.05)', border: '1px solid rgba(var(--ink-rgb), 0.1)', borderRadius: 8, padding: '5px 10px', cursor: 'pointer' }}>Recast</button>
                    <button onClick={() => clearCasting(sel.name)} style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--danger)', background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '5px 10px', cursor: 'pointer' }}>Remove</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, background: 'rgba(var(--ink-rgb), 0.02)', border: '1px dashed rgba(var(--ink-rgb), 0.14)', borderRadius: 8, marginBottom: assigning ? 12 : 24 }}>
                    <span style={{ flex: 1, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-muted)' }}>Open — not yet cast</span>
                    <button onClick={() => setAssigning(a => !a)} style={{ fontFamily: 'var(--mono)', fontSize: 11, color: readable(sel.color), background: `${sel.color}14`, border: `1px solid ${sel.color}44`, borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}>Assign crew</button>
                    <Link href={castingCallHref(project.title, sel.name, fp)} style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--jobs-text)', background: 'color-mix(in srgb, var(--accent) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)', borderRadius: 8, padding: '6px 12px', textDecoration: 'none' }}>Post a casting call →</Link>
                  </div>
                )}

                {assigning && (
                  <div style={{ marginBottom: 24, padding: 12, background: 'var(--sunken)', borderRadius: 8 }}>
                    {crew.length === 0 ? (
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-dim)' }}>No crew recruited yet — recruit talent in the Crew tab or post the role to Jobs.</span>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {crew.map((m) => {
                          const on = compare.includes(m.user_id);
                          return (
                            <div key={m.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <button draggable onDragStart={(e) => { e.dataTransfer.setData('text/cast-crew', m.user_id); e.dataTransfer.effectAllowed = 'copy'; }} onClick={() => assign(m.user_id)} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'rgba(var(--ink-rgb), 0.03)', border: '1px solid rgba(var(--ink-rgb), 0.07)', borderRadius: 8, cursor: 'grab', textAlign: 'left' }}>
                                <Avatar src={m.profiles?.avatar_url} name={m.profiles?.username || 'Crew'} size={28} />
                                <span style={{ flex: 1, fontSize: 12 }}>{m.profiles?.username || 'Unknown'}</span>
                                <span style={{ fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)', textTransform: 'var(--caps)' }}>{m.craft || (m.role === 'lead' ? 'Lead' : 'Crew')}</span>
                              </button>
                              <button type="button" onClick={() => setCompare((c) => (on ? c.filter((x) => x !== m.user_id) : c.length >= 3 ? c : [...c, m.user_id]))} aria-pressed={on} title="Compare" style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid var(--border)', background: on ? 'rgba(var(--ink-rgb), 0.1)' : 'none', color: on ? 'var(--fg-strong)' : 'var(--fg-muted)', cursor: 'pointer', fontSize: 11 }}>⇄</button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {compare.length >= 2 && (
                      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${compare.length}, 1fr)`, gap: 8, marginTop: 10 }}>
                        {compare.map((id) => {
                          const m = crew.find((x) => x.user_id === id);
                          if (!m) return null;
                          return (
                            <div key={id} style={{ padding: 12, background: 'rgba(var(--ink-rgb), 0.04)', border: '1px solid rgba(var(--ink-rgb), 0.1)', borderRadius: 8, display: 'grid', gap: 6, justifyItems: 'center' }}>
                              <Avatar src={m.profiles?.avatar_url} name={m.profiles?.username || 'Crew'} size={44} />
                              <div style={{ fontSize: 13, fontWeight: 600 }}>{m.profiles?.username || 'Unknown'}</div>
                              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-dim)', textTransform: 'var(--caps)' }}>{m.craft || (m.role === 'lead' ? 'Lead' : 'Crew')}</div>
                              <button type="button" onClick={() => assign(id)} style={{ padding: '5px 10px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: 'var(--on-accent)', cursor: 'pointer', fontSize: 11 }}>Cast</button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-dim)', marginTop: 8 }}>Drag a person onto the role, or click to cast.</div>
                  </div>
                )}

                {crew.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
                    <select value={auditionUser} onChange={(e) => setAuditionUser(e.target.value)} aria-label="Candidate" style={{ flex: 1, background: 'var(--bg)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px', fontSize: 12 }}>
                      <option value="">Candidate…</option>
                      {crew.map((m) => <option key={m.id} value={m.user_id}>{m.profiles?.username || 'Crew'}</option>)}
                    </select>
                    <input type="datetime-local" value={auditionAt} onChange={(e) => setAuditionAt(e.target.value)} aria-label="Audition time" style={{ background: 'var(--bg)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px', fontSize: 12 }} />
                    <button type="button" onClick={() => void schedule()} disabled={!auditionUser || !auditionAt} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: 'var(--on-accent)', cursor: 'pointer', fontSize: 12 }}>Schedule</button>
                  </div>
                )}

                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'var(--caps)', letterSpacing: 'var(--caps-track)', color: 'var(--fg-muted)', marginBottom: 10 }}>Auditions</div>
                <div style={{ display: 'grid', gap: 6, marginBottom: 24 }}>
                  {auditions.length === 0 && <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-dim)' }}>None scheduled.</div>}
                  {auditions.map((a) => (
                    <div key={a.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 8, background: 'rgba(var(--ink-rgb), 0.02)', border: '1px solid rgba(var(--ink-rgb), 0.07)', borderRadius: 8 }}>
                      <span style={{ flex: 1, fontSize: 12 }}>{new Date(a.scheduled_at).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      <button type="button" onClick={() => void cancelAud(a.id)} aria-label="Cancel audition" style={{ background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer' }}>×</button>
                    </div>
                  ))}
                </div>

                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'var(--caps)', letterSpacing: 'var(--caps-track)', color: 'var(--fg-muted)', marginBottom: 10 }}>History</div>
                <div style={{ display: 'grid', gap: 4, marginBottom: 24 }}>
                  {history.length === 0 && <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-dim)' }}>No decisions yet.</div>}
                  {history.slice(0, 8).map((h) => (
                    <div key={h.id} style={{ display: 'flex', gap: 8, fontSize: 12 }}>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-dim)' }}>{h.created_at ? new Date(h.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}</span>
                      <span><strong>{h.character_name}</strong> {h.action}</span>
                    </div>
                  ))}
                </div>

                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'var(--caps)', letterSpacing: 'var(--caps-track)', color: 'var(--fg-muted)', marginBottom: 10 }}>Look-board</div>
                {looksFor.length > 0 ? (
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
                    {looksFor.map(l => (
                      <div key={l.id} style={{ width: 80, height: 80, borderRadius: 8, overflow: 'hidden', border: `1px solid ${sel.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--sunken)' }} title={l.title || 'look'}>
                        <MediaThumbVisual media={l} src={mediaSrc(l, signed)} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-dim)', marginBottom: 24 }}>No looks yet — add them to this character in the Character Bible (Story).</div>
                )}

                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'var(--caps)', letterSpacing: 'var(--caps-track)', color: 'var(--fg-muted)', marginBottom: 10 }}>Notes</div>
                <div style={{ display: 'grid', gap: 6, marginBottom: 24 }}>
                  {notes.length === 0 && <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-dim)' }}>No notes yet.</div>}
                  {notes.map((n) => (
                    <div key={n.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: 8, background: 'rgba(var(--ink-rgb), 0.02)', border: '1px solid rgba(var(--ink-rgb), 0.07)', borderRadius: 8 }}>
                      <span style={{ flex: 1, fontSize: 12 }}>{n.note}</span>
                      <button onClick={() => void removeNote(n.id)} aria-label="Remove note" style={{ background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer' }}>×</button>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} placeholder="Add a note…" style={{ flex: 1, background: 'rgba(var(--ink-rgb), 0.04)', border: '1px solid rgba(var(--ink-rgb), 0.1)', borderRadius: 8, padding: '6px 10px', color: 'var(--fg)', fontSize: 12 }} />
                    <button onClick={() => void addNote()} disabled={!noteDraft.trim()} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: 'var(--on-accent)', cursor: 'pointer', fontSize: 12 }}>Add</button>
                  </div>
                </div>

                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'var(--caps)', letterSpacing: 'var(--caps-track)', color: 'var(--fg-muted)', marginBottom: 10 }}>Footprint</div>
                {fp.sceneNums.length > 0 ? (
                  <div>
                    <div style={{ display: 'flex', gap: 20, marginBottom: 10, fontFamily: 'var(--mono)', fontSize: 12 }}>
                      <span><span style={{ color: sel.color, fontSize: 18, fontWeight: 700 }}>{fp.sceneNums.length}</span> <span style={{ color: 'var(--fg-dim)' }}>scenes</span></span>
                      <span><span style={{ color: sel.color, fontSize: 18, fontWeight: 700 }}>{fp.days.length}</span> <span style={{ color: 'var(--fg-dim)' }}>shoot day{fp.days.length === 1 ? '' : 's'}</span></span>
                    </div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {fp.sceneNums.map(n => (
                        <span key={n} style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-muted)', background: 'rgba(var(--ink-rgb), 0.04)', border: '1px solid rgba(var(--ink-rgb), 0.08)', borderRadius: 4, padding: '2px 7px' }}>#{n}</span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-dim)' }}>Not tagged into any scene yet — add this character to scene cast lists in the schedule.</div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
