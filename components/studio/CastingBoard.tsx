'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/Toast';
import Avatar from '@/components/Avatar';
import { getCastingsForProject, setCasting, removeCasting, type Casting } from '@/lib/supabase/casting';
import { logActivity } from '@/lib/supabase/activity';
import { useCharacterMedia, useSignedUrls, mediaSrc, type Media } from '@/lib/studio';
import { List as Users } from 'lucide-react';
import { useStudio } from './StudioContext';
import { useScriptCharacters } from './production/useScriptCharacters';
import { MediaThumbVisual } from './media/MediaThumb';

type CrewRow = { id: string; user_id: string; role: string; profiles?: { username?: string | null; avatar_url?: string | null } | null };

/** Who plays whom: characters from the selected script, cast from the crew. */
export function CastingBoard({ crew }: { crew: CrewRow[] }) {
  const { project, userId, scriptId, scenes, mediaById } = useStudio();
  const projectId = project.id;
  const { toast } = useToast();
  const { chars: scriptChars, status } = useScriptCharacters(scriptId, userId);
  const chars = scriptChars.map((c) => ({ id: c.row?.id, name: c.name, color: c.color }));
  const loading = status === 'loading';
  const [castings, setCastings] = useState<Record<string, Casting>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const characterLooks = useCharacterMedia(projectId);
  const looks = useMemo(() => {
    const m: Record<string, Media[]> = {};
    for (const l of characterLooks.rows) {
      const item = mediaById.get(l.media_id);
      if (item) (m[l.character_id] ||= []).push(item);
    }
    return m;
  }, [characterLooks.rows, mediaById]);
  const signed = useSignedUrls(characterLooks.rows.map((l) => mediaById.get(l.media_id)?.storage_path));

  const loadCastings = async () => {
    try { setCastings(await getCastingsForProject(projectId)); } catch { /* shown as open roles */ }
  };
  useEffect(() => { void loadCastings(); }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setSelected((prev) => (prev && chars.some((c) => c.name === prev) ? prev : chars[0]?.name ?? null));
  }, [scriptChars]); // eslint-disable-line react-hooks/exhaustive-deps

  const footprint = (name: string) => {
    const up = name.toUpperCase();
    const inScenes = scenes.rows.filter((sc) => String(sc.cast_list || '').toUpperCase().split(',').map((c) => c.trim()).includes(up));
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
    try { await removeCasting(projectId, name); logActivity(`reopened casting for ${name}`, 'project', projectId); await loadCastings(); toast(`${name} reopened`, 'info'); }
    catch (e) { toast(e instanceof Error ? e.message : 'Could not update', 'error'); }
  };

  const sel = chars.find(c => c.name === selected) || null;
  const castCount = chars.filter(c => castings[c.name.toUpperCase()]).length;

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
        <Users size={16} /> Casting Board
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-dim)', fontWeight: 400 }}>· {castCount}/{chars.length} cast · from ScriptOS</span>
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
                  background: active ? `${c.color}18` : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${active ? `${c.color}55` : 'rgba(255,255,255,0.06)'}`,
                  borderLeft: `3px solid ${c.color}`, borderRadius: 8, cursor: 'pointer',
                }}>
                  <span style={{ flex: 1, fontFamily: 'var(--display)', fontSize: '1rem', letterSpacing: 1, color: active ? c.color : 'var(--fg)' }}>{c.name}</span>
                  {cast ? (
                    <span title={`Cast: ${cast.username || 'crew'}`} style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
                  ) : (
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--fg-dim)', textTransform: 'uppercase', letterSpacing: 1 }}>open</span>
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
              <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${sel.color}33`, borderRadius: 12, padding: 24 }}>
                <div style={{ fontFamily: 'var(--display)', fontSize: '1.8rem', letterSpacing: 2, color: sel.color, marginBottom: 20 }}>{sel.name}</div>

                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--fg-muted)', marginBottom: 10 }}>Casting</div>
                {cast ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 10, marginBottom: 24 }}>
                    <Avatar src={cast.avatar_url} name={cast.username || 'Crew'} size={38} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{cast.username || 'Crew member'}</div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#34d399', textTransform: 'uppercase', letterSpacing: 1 }}>Cast</div>
                    </div>
                    <button onClick={() => setAssigning(a => !a)} style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--fg-muted)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer' }}>Recast</button>
                    <button onClick={() => clearCasting(sel.name)} style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#ef4444', background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer' }}>Remove</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.14)', borderRadius: 10, marginBottom: assigning ? 12 : 24 }}>
                    <span style={{ flex: 1, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-muted)' }}>Open — not yet cast</span>
                    <button onClick={() => setAssigning(a => !a)} style={{ fontFamily: 'var(--mono)', fontSize: 10, color: sel.color, background: `${sel.color}14`, border: `1px solid ${sel.color}44`, borderRadius: 6, padding: '6px 12px', cursor: 'pointer' }}>Assign crew</button>
                    <Link href={`/jobs?title=${encodeURIComponent(`Cast — ${sel.name}`)}&role=Actor`} style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#8b5cf6', background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 6, padding: '6px 12px', textDecoration: 'none' }}>Post to Jobs →</Link>
                  </div>
                )}

                {assigning && (
                  <div style={{ marginBottom: 24, padding: 12, background: 'rgba(0,0,0,0.3)', borderRadius: 10 }}>
                    {crew.length === 0 ? (
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--fg-dim)' }}>No crew recruited yet — recruit talent in the Crew tab or post the role to Jobs.</span>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {crew.map((m) => (
                          <button key={m.id} onClick={() => assign(m.user_id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, cursor: 'pointer', textAlign: 'left' }}>
                            <Avatar src={m.profiles?.avatar_url} name={m.profiles?.username || 'Crew'} size={28} />
                            <span style={{ flex: 1, fontSize: 12 }}>{m.profiles?.username || 'Unknown'}</span>
                            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--fg-dim)', textTransform: 'uppercase' }}>{m.role}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--fg-muted)', marginBottom: 10 }}>Look-board</div>
                {looksFor.length > 0 ? (
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
                    {looksFor.map(l => (
                      <div key={l.id} style={{ width: 80, height: 80, borderRadius: 8, overflow: 'hidden', border: `1px solid ${sel.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)' }} title={l.title || 'look'}>
                        <MediaThumbVisual media={l} src={mediaSrc(l, signed)} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--fg-dim)', marginBottom: 24 }}>No looks yet — add them to this character in the Character Bible (Story).</div>
                )}

                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--fg-muted)', marginBottom: 10 }}>Footprint</div>
                {fp.sceneNums.length > 0 ? (
                  <div>
                    <div style={{ display: 'flex', gap: 20, marginBottom: 10, fontFamily: 'var(--mono)', fontSize: 12 }}>
                      <span><span style={{ color: sel.color, fontSize: 18, fontWeight: 700 }}>{fp.sceneNums.length}</span> <span style={{ color: 'var(--fg-dim)' }}>scenes</span></span>
                      <span><span style={{ color: sel.color, fontSize: 18, fontWeight: 700 }}>{fp.days.length}</span> <span style={{ color: 'var(--fg-dim)' }}>shoot day{fp.days.length === 1 ? '' : 's'}</span></span>
                    </div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {fp.sceneNums.map(n => (
                        <span key={n} style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--fg-muted)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '2px 7px' }}>#{n}</span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--fg-dim)' }}>Not tagged into any scene yet — add this character to scene cast lists in the schedule.</div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
