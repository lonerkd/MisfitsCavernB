'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';
import { useEffect } from 'react';
import { parseScript } from '@/lib/scriptos/parser';
import { List as Users } from 'lucide-react';

export function CharacterBible({ projectId, userId, concepts }: { projectId: string; userId: string | null; concepts: any[] }) {
  const { toast } = useToast();
  type Bio = { id?: string; name: string; full_name: string; age: string; arc: string; description: string; color?: string };
  type Ref = { id: string; concept_asset_id: string; image_url: string; title: string | null };
  const [bios, setBios] = useState<Bio[]>([]);
  const [scriptId, setScriptId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string | null>(null);
  const [draft, setDraft] = useState<Bio | null>(null);
  const [loading, setLoading] = useState(false);
  const [refs, setRefs] = useState<Record<string, Ref[]>>({});
  const [lookFor, setLookFor] = useState<string | null>(null);

  const loadRefs = async () => {
    const { data } = await supabase.from('character_references').select('id,character_id,concept_assets(image_url,title)').eq('project_id', projectId);
    const map: Record<string, Ref[]> = {};
    (data || []).forEach((r: any) => { (map[r.character_id] ||= []).push({ id: r.id, concept_asset_id: r.concept_asset_id, image_url: r.concept_assets?.image_url, title: r.concept_assets?.title }); });
    setRefs(map);
  };
  useEffect(() => { loadRefs(); }, [projectId, bios.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const ensureRow = async (b: Bio): Promise<string | null> => {
    if (b.id) return b.id;
    if (!scriptId) return null;
    const { data } = await supabase.from('script_characters').insert({ script_id: scriptId, name: b.name, color: b.color, updated_by: userId }).select('id').single();
    if (data?.id) { setBios(prev => prev.map(x => x.name === b.name ? { ...x, id: data.id } : x)); return data.id; }
    return null;
  };
  const linkLook = async (b: Bio, conceptId: string) => {
    const cid = await ensureRow(b);
    if (!cid) { toast('Could not link look', 'error'); return; }
    const { error } = await supabase.from('character_references').insert({ project_id: projectId, character_id: cid, concept_asset_id: conceptId, created_by: userId });
    if (error) { toast(error.message || 'Could not link look', 'error'); return; }
    setLookFor(null); loadRefs();
  };
  const unlinkLook = async (refId: string) => { await supabase.from('character_references').delete().eq('id', refId); loadRefs(); };

  const palette = ['#d7340b', '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#0099ff', '#a855f7'];

  const load = async () => {
    setLoading(true);
    try {
      const { data: scripts } = await supabase.from('scripts').select('id,content').eq('project_id', projectId).order('updated_at', { ascending: false });
      const withContent = (scripts || []).find((s: any) => s.content && s.content.trim().length > 0) || (scripts || [])[0];
      if (!withContent) { setBios([]); setScriptId(null); return; }
      setScriptId(withContent.id);
      const parsedNames: string[] = withContent.content ? parseScript(withContent.content).characters.map((c: any) => c.name).filter(Boolean) : [];
      const { data: saved } = await supabase.from('script_characters').select('*').eq('script_id', withContent.id);
      const savedByName = new Map((saved || []).map((r: any) => [r.name, r]));
      const names = Array.from(new Set([...parsedNames, ...(saved || []).map((r: any) => r.name)]));
      setBios(names.map((name, i) => {
        const r: any = savedByName.get(name);
        return { id: r?.id, name, full_name: r?.full_name || '', age: r?.age || '', arc: r?.arc || '', description: r?.description || '', color: r?.color || palette[i % palette.length] };
      }));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const startEdit = (b: Bio) => { setEditName(b.name); setDraft({ ...b }); };
  const save = async () => {
    if (!draft || !scriptId) return;
    const payload: any = { script_id: scriptId, name: draft.name, full_name: draft.full_name || null, age: draft.age || null, arc: draft.arc || null, description: draft.description || null, color: draft.color, updated_by: userId, updated_at: new Date().toISOString() };
    const { error } = draft.id
      ? await supabase.from('script_characters').update(payload).eq('id', draft.id)
      : await supabase.from('script_characters').insert(payload);
    if (error) { toast(error.message || 'Could not save character', 'error'); return; }
    toast('Character saved', 'success');
    setEditName(null); setDraft(null);
    load();
  };

  return (
    <div style={{ marginTop: 24, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
        <Users size={16} /> Character Bible <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--fg-dim)', fontWeight: 400 }}>· from ScriptOS · {bios.length}</span>
      </div>
      {loading && <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--fg-dim)' }}>Loading…</div>}
      {!loading && bios.length === 0 && <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--fg-dim)' }}>Write characters in ScriptOS to build the bible.</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
        {bios.map(b => {
          const editing = editName === b.name;
          return (
            <div key={b.name} style={{ background: 'rgba(0,0,0,0.25)', border: `1px solid ${b.color}33`, borderLeft: `3px solid ${b.color}`, borderRadius: 10, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--display)', fontSize: '1rem', letterSpacing: 1, color: b.color }}>{b.name}</span>
                {!editing && <button onClick={() => startEdit(b)} aria-label="edit" style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 11 }}>✎</button>}
              </div>
              {editing && draft ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                  <input value={draft.full_name} onChange={e => setDraft({ ...draft, full_name: e.target.value })} placeholder="Full name" style={inputMini} />
                  <input value={draft.age} onChange={e => setDraft({ ...draft, age: e.target.value })} placeholder="Age" style={inputMini} />
                  <input value={draft.arc} onChange={e => setDraft({ ...draft, arc: e.target.value })} placeholder="Character arc" style={inputMini} />
                  <textarea value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} placeholder="Description" rows={3} style={{ ...inputMini, resize: 'vertical' }} />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={save} style={{ flex: 1, background: 'rgba(16,185,129,0.18)', border: '1px solid rgba(16,185,129,0.4)', color: '#10b981', borderRadius: 6, padding: '5px', cursor: 'pointer', fontSize: 10 }}>Save</button>
                    <button onClick={() => { setEditName(null); setDraft(null); }} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: '#888', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 10 }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 6, fontFamily: 'var(--mono)', fontSize: 9.5, color: '#aaa', lineHeight: 1.7 }}>
                  {b.full_name && <div><span style={{ color: '#666' }}>Name:</span> {b.full_name}</div>}
                  {b.age && <div><span style={{ color: '#666' }}>Age:</span> {b.age}</div>}
                  {b.arc && <div><span style={{ color: '#666' }}>Arc:</span> {b.arc}</div>}
                  {b.description && <div style={{ marginTop: 4, color: '#ccc' }}>{b.description}</div>}
                  {!b.full_name && !b.age && !b.arc && !b.description && <div style={{ color: '#555' }}>No bio yet — click ✎ to develop.</div>}
                </div>
              )}
              {(() => {
                const cRefs = b.id ? (refs[b.id] || []) : [];
                const linkedIds = new Set(cRefs.map(r => r.concept_asset_id));
                const avail = concepts.filter((c: any) => !linkedIds.has(c.id));
                const picking = lookFor === b.name;
                return (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {cRefs.map(r => (
                        <div key={r.id} style={{ position: 'relative', width: 38, height: 38, borderRadius: '50%', overflow: 'hidden', border: `1px solid ${b.color}55` }} title={r.title || 'look'}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={r.image_url} alt={r.title || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button onClick={() => unlinkLook(r.id)} aria-label="unlink" style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', fontSize: 8, lineHeight: 1, cursor: 'pointer', padding: '1px 3px' }}>✕</button>
                        </div>
                      ))}
                      {concepts.length > 0 && (
                        <button onClick={() => setLookFor(picking ? null : b.name)} style={{ fontFamily: 'var(--mono)', fontSize: 8, color: b.color, background: `${b.color}14`, border: `1px solid ${b.color}33`, borderRadius: 99, padding: '4px 8px', cursor: 'pointer' }}>{picking ? 'close' : '+ look'}</button>
                      )}
                    </div>
                    {picking && (
                      <div style={{ marginTop: 6, padding: 6, background: 'rgba(0,0,0,0.3)', borderRadius: 8, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {avail.length === 0 ? <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--fg-dim)' }}>All concept images linked.</span> : avail.map((c: any) => (
                          <button key={c.id} onClick={() => linkLook(b, c.id)} title={c.title || 'link'} style={{ width: 44, height: 30, borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer', padding: 0, background: 'none' }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={c.image_url} alt={c.title || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>
    </div>
  );
}
const inputMini: React.CSSProperties = { width: '100%', padding: '6px 8px', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', fontSize: 10, fontFamily: 'var(--mono)', outline: 'none' };
