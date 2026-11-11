'use client';

import React, { useMemo, useState } from 'react';
import { Clapperboard, Plus, Trash2 } from 'lucide-react';
import { useSettingsList } from './useSettingsList';
import { ScenePicker } from './SceneCharacterPickers';
import { useStudio } from '../StudioContext';
import s from '../studio.module.css';

type NoteEntry = { id: string; scene: string; scene_id?: string; title: string; notes: string; reference: string; createdAt: string };

export function DirectorNotebookView() {
  const { scenes } = useStudio();
  const { items, save, remove } = useSettingsList('directorNotes');
  const [draft, setDraft] = useState<Omit<NoteEntry, 'id' | 'createdAt'>>({
    scene: '',
    scene_id: undefined,
    title: '',
    notes: '',
    reference: '',
  });
  const [filter, setFilter] = useState('');

  const filtered = useMemo(
    () => (filter ? items.filter((i) => i.scene.toLowerCase().includes(filter.toLowerCase()) || i.title.toLowerCase().includes(filter.toLowerCase())) : items),
    [items, filter],
  );

  const add = async () => {
    if (!draft.title.trim()) return;
    if (!(await save([...items, { ...draft, id: `dn-${Date.now()}`, createdAt: new Date().toISOString() }]))) return;
    setDraft({ scene: '', scene_id: undefined, title: '', notes: '', reference: '' });
  };

  const sorted = [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className={s.stack} style={{ gap: 24, maxWidth: 900 }}>
      <div className={s.toolbar}>
        <div className={s.panelTitle} style={{ marginBottom: 0 }}>
          <Clapperboard size={14} /> Director notebook
          <span className={s.hint}> · {items.length} notes</span>
        </div>
        <input
          className={s.input}
          style={{ width: 180, fontSize: 12 }}
          placeholder="Filter by scene/title…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <div className={s.panel} style={{ padding: 12 }}>
        <div className={s.row} style={{ gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <ScenePicker
            scenes={scenes.rows}
            value={draft.scene_id ?? null}
            fallbackText={draft.scene}
            onChange={(id, num) => setDraft({ ...draft, scene_id: id ?? undefined, scene: num != null ? String(num) : '' })}
          />
          <label className={s.field} style={{ flex: '1 1 200px' }}>
            <span className={s.label}>Title</span>
            <input className={s.input} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Vision note" />
          </label>
          <label className={s.field} style={{ flex: '1 1 200px' }}>
            <span className={s.label}>Reference (URL)</span>
            <input className={s.input} value={draft.reference} onChange={(e) => setDraft({ ...draft, reference: e.target.value })} placeholder="image/link" />
          </label>
          <button className={s.btnPrimary} onClick={add} disabled={!draft.title.trim()}>
            <Plus size={12} /> Add
          </button>
        </div>
        <label className={s.field} style={{ marginTop: 8 }}>
          <span className={s.label}>Notes / blocking / intent</span>
          <textarea className={s.textarea} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} rows={3} />
        </label>
      </div>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {sorted.map((n) => (
          <li key={n.id} className={s.panel} style={{ padding: 12 }}>
            <div className={s.row} style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              {n.scene && <span className={s.chip}>Sc {n.scene}</span>}
              <span style={{ fontWeight: 600, flex: 1, minWidth: 0 }}>{n.title}</span>
              <span className={s.hint} style={{ fontSize: 11 }}>{new Date(n.createdAt).toLocaleDateString()}</span>
              <button className={s.btn} onClick={() => remove(n.id)} title="Delete">
                <Trash2 size={12} />
              </button>
            </div>
            {n.notes && <p className={s.hint} style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{n.notes}</p>}
            {n.reference && (
              <p className={s.hint} style={{ marginTop: 4, fontSize: 11 }}>
                {/^https?:\/\//i.test(n.reference) ? <a href={n.reference} target="_blank" rel="noreferrer">{n.reference}</a> : n.reference}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
