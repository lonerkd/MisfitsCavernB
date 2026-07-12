'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';
import Avatar from '@/components/Avatar';
import { useEffect } from 'react';
import { parseScript } from '@/lib/scriptos/parser';
import { getCastingsForProject, setCasting, removeCasting, type Casting } from '@/lib/supabase/casting';
import { List as Users } from 'lucide-react';

export function CastingBoard({ projectId, userId, concepts, scenes, crew }: { projectId: string; userId: string | null; concepts: any[]; scenes: any[]; crew: any[] }) {
  const { toast } = useToast();
  type Char = { id?: string; name: string; color: string };
  type Look = { id: string; image_url: string; title: string | null };
  const [chars, setChars] = useState<Char[]>([]);
  const [castings, setCastings] = useState<Record<string, Casting>>({});
  const [looks, setLooks] = useState<Record<string, Look[]>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [loading, setLoading] = useState(false);
  const palette = ['#d7340b', '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#0099ff', '#a855f7'];

  const loadCastings = async () => {
    try { setCastings(await getCastingsForProject(projectId)); } catch {  }
  };

  const load = async () => {
    setLoading(true);
    try {
      const { data: scripts } = await supabase.from('scripts').select('id,content').eq('project_id', projectId).order('updated_at', { ascending: false });
      const withContent = (scripts || []).find((s: any) => s.content && s.content.trim().length > 0) || (scripts || [])[0];
      const parsedNames: string[] = withContent?.content ? parseScript(withContent.content).characters.map((c: any) => c.name).filter(Boolean) : [];
      const savedById = new Map<string, any>();
      if (withContent) {
        const { data: saved } = await supabase.from('script_characters').select('id,name,color').eq('script_id', withContent.id);
        (saved || []).forEach((r: any) => savedById.set(r.name, r));
      }
      const names = Array.from(new Set([...parsedNames, ...Array.from(savedById.keys())]));
      const list = names.map((name, i) => { const r = savedById.get(name); return { id: r?.id, name, color: r?.color || palette[i % palette.length] }; });
      setChars(list);
      setSelected(prev => prev && names.includes(prev) ? prev : names[0] || null);

      const { data: refData } = await supabase.from('character_references').select('id,character_id,concept_assets(image_url,title)').eq('project_id', projectId);
      const lookMap: Record<string, Look[]> = {};
      (refData || []).forEach((r: any) => { (lookMap[r.character_id] ||= []).push({ id: r.id, image_url: r.concept_assets?.image_url, title: r.concept_assets?.title }); });
      setLooks(lookMap);
      await loadCastings();
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [projectId, scenes.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const footprint = (name: string) => {
    const up = name.toUpperCase();
    const inScenes = scenes.filter(s => String(s.cast_list || '').toUpperCase().split(',').map((c: string) => c.trim()).includes(up));
    const days = Array.from(new Set(inScenes.map(s => s.shoot_day || 1))).sort((a, b) => a - b);
    return { sceneNums: inScenes.map(s => s.scene_number).sort((a, b) => a - b), days };
  };

  const assign = async (crewUserId: string) => {
    if (!selected || !userId) { toast('Sign in to cast', 'error'); return; }
    try {
      await setCasting(projectId, selected, crewUserId, userId);
      await loadCastings();
      setAssigning(false);
      toast(`Cast ${selected}`, 'success');
    } catch (e: any) { toast(e?.message || 'Could not cast', 'error'); }
  };
  const clearCasting = async (name: string) => {
    try { await removeCasting(projectId, name); await loadCastings(); toast(`${name} reopened`, 'info'); }
    catch (e: any) { toast(e?.message || 'Could not update', 'error'); }
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
                    <Link href="/jobs" style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#8b5cf6', background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 6, padding: '6px 12px', textDecoration: 'none' }}>Post to Jobs →</Link>
                  </div>
                )}

                {assigning && (
                  <div style={{ marginBottom: 24, padding: 12, background: 'rgba(0,0,0,0.3)', borderRadius: 10 }}>
                    {crew.length === 0 ? (
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--fg-dim)' }}>No crew recruited yet — recruit talent in the Crew tab or post the role to Jobs.</span>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {crew.map((m: any) => (
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
                      <div key={l.id} style={{ width: 80, height: 80, borderRadius: 8, overflow: 'hidden', border: `1px solid ${sel.color}44` }} title={l.title || 'look'}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={l.image_url} alt={l.title || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--fg-dim)', marginBottom: 24 }}>No look references yet — link concept images to this character in the Character Bible.</div>
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
