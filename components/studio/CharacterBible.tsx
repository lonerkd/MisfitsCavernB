'use client';

import React, { useMemo, useState } from 'react';
import { Pencil, Plus, Users, X } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { studio, useCharacterMedia, useSignedUrls, mediaSrc, characterMediaKey, type Media } from '@/lib/studio';
import { useStudio } from './StudioContext';
import { useScriptCharacters, type ScriptCharacter } from './production/useScriptCharacters';
import { MediaThumbVisual } from './media/MediaThumb';
import { MediaPicker } from './media/MediaPicker';
import { MediaDetail } from './media/MediaDetail';
import { cx } from './ui';
import s from './studio.module.css';

type Draft = { full_name: string; age: string; arc: string; description: string };

/** Character bible for the selected script, with a look-board per character. */
export function CharacterBible() {
  const { project, userId, scriptId, media, mediaById } = useStudio();
  const { toast } = useToast();
  const { chars, status, ensureRow, save } = useScriptCharacters(scriptId, userId);
  const looks = useCharacterMedia(project.id);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pickFor, setPickFor] = useState<ScriptCharacter | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const looksByChar = useMemo(() => {
    const m = new Map<string, Media[]>();
    for (const l of looks.rows) {
      const item = mediaById.get(l.media_id);
      if (item) m.set(l.character_id, [...(m.get(l.character_id) ?? []), item]);
    }
    return m;
  }, [looks.rows, mediaById]);
  const signed = useSignedUrls(looks.rows.map((l) => mediaById.get(l.media_id)?.storage_path));

  const startEdit = (c: ScriptCharacter) => {
    setEditing(c.name);
    setDraft({ full_name: c.row?.full_name ?? '', age: c.row?.age ?? '', arc: c.row?.arc ?? '', description: c.row?.description ?? '' });
  };

  const commit = async (c: ScriptCharacter) => {
    if (!draft) return;
    try {
      await save(c, { full_name: draft.full_name || null, age: draft.age || null, arc: draft.arc || null, description: draft.description || null });
      toast('Character saved', 'success');
      setEditing(null);
      setDraft(null);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not save', 'error');
    }
  };

  const unlink = async (characterId: string, mediaId: string) => {
    try {
      await studio.unlinkCharacterMedia(characterId, mediaId);
      looks.removeLocal(characterMediaKey({ character_id: characterId, media_id: mediaId }));
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not unlink', 'error');
    }
  };

  return (
    <div className={s.panel}>
      <div className={s.panelTitle}><Users size={14} /> Character bible · {chars.length} <span className={s.dim} style={{ letterSpacing: 0.5, textTransform: 'none' }}>from the screenplay</span></div>
      {status === 'loading' && <p className={s.hint}>Loading…</p>}
      {status === 'error' && <p className={s.hint}>Couldn’t read the script’s characters.</p>}
      {status === 'ready' && chars.length === 0 && <p className={s.hint}>Characters appear here once they speak in the screenplay.</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
        {chars.map((c) => {
          const isEditing = editing === c.name && draft;
          const charLooks = c.row ? looksByChar.get(c.row.id) ?? [] : [];
          return (
            <div key={c.name} style={{ background: 'rgba(0,0,0,0.22)', border: `1px solid ${c.color}33`, borderLeft: `3px solid ${c.color}`, borderRadius: 10, padding: 14 }}>
              <div className={s.row} style={{ justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'var(--display)', fontSize: '1.05rem', letterSpacing: 1, color: c.color }}>{c.name}</span>
                {!isEditing && <button type="button" className={s.iconBtn} onClick={() => startEdit(c)} aria-label={`Edit ${c.name}`}><Pencil size={12} /></button>}
              </div>
              {isEditing && draft ? (
                <div className={s.stack} style={{ gap: 6, marginTop: 8 }}>
                  {(['full_name', 'age', 'arc'] as const).map((k) => (
                    <input key={k} className={s.input} style={{ padding: '6px 8px', fontSize: 11 }} aria-label={k.replace('_', ' ')} placeholder={{ full_name: 'Full name', age: 'Age', arc: 'Arc' }[k]} value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} />
                  ))}
                  <textarea className={s.textarea} style={{ fontSize: 11 }} aria-label="Description" placeholder="Description" rows={3} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
                  <div className={s.row}>
                    <button type="button" className={cx(s.btnPrimary, s.small)} onClick={() => void commit(c)}>Save</button>
                    <button type="button" className={cx(s.btnGhost, s.small)} onClick={() => { setEditing(null); setDraft(null); }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className={s.mono} style={{ marginTop: 6, fontSize: 10, color: 'var(--fg-muted)', lineHeight: 1.7 }}>
                  {c.row?.full_name && <div><span className={s.dim}>Name:</span> {c.row.full_name}</div>}
                  {c.row?.age && <div><span className={s.dim}>Age:</span> {c.row.age}</div>}
                  {c.row?.arc && <div><span className={s.dim}>Arc:</span> {c.row.arc}</div>}
                  {c.row?.description && <div style={{ marginTop: 4, color: 'var(--fg)' }}>{c.row.description}</div>}
                  {!c.row?.full_name && !c.row?.age && !c.row?.arc && !c.row?.description && <div className={s.dim}>No bio yet.</div>}
                </div>
              )}
              <div className={s.refs} style={{ marginTop: 10 }}>
                {charLooks.map((m) => (
                  <div key={m.id} className={s.ref} style={{ width: 64 }}>
                    <button type="button" className={s.refOpen} onClick={() => setOpenId(m.id)} aria-label={`Open ${m.title || 'look'}`}>
                      <MediaThumbVisual media={m} src={mediaSrc(m, signed)} />
                    </button>
                    <button type="button" className={s.refRemove} onClick={() => void unlink(c.row!.id, m.id)} aria-label={`Unlink ${m.title || 'look'}`}><X size={10} /></button>
                  </div>
                ))}
                <button type="button" className={s.addRef} style={{ width: 64 }} onClick={() => setPickFor(c)}><Plus size={12} /> Look</button>
              </div>
            </div>
          );
        })}
      </div>

      {pickFor && (
        <MediaPicker
          title={`Looks for ${pickFor.name}`}
          projectId={project.id}
          userId={userId}
          media={media}
          excludeIds={new Set(pickFor.row ? (looksByChar.get(pickFor.row.id) ?? []).map((m) => m.id) : [])}
          onPick={async (ids) => {
            const row = await ensureRow(pickFor);
            for (const id of ids) await studio.linkCharacterMedia(project.id, userId, row.id, id);
            await looks.reload();
          }}
          onClose={() => setPickFor(null)}
        />
      )}
      {openId && <MediaDetail mediaId={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}
