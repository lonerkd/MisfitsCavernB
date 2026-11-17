'use client';

import React, { useMemo, useState } from 'react';
import { Clapperboard, Plus, Trash2 } from 'lucide-react';
import { useSettingsList } from './useSettingsList';
import { SceneLinkField, useRecordTargets } from './RecordLinks';
import { sceneChip } from '@/lib/studio/record-links';
import { useStudio } from '../StudioContext';
import { ChangeImpactPanel } from './ChangeImpactPanel';
import { ToolHeader } from '../ToolHeader';
import s from '../studio.module.css';

type NoteEntry = { id: string; scene_ids?: string[]; character_id?: string | null; scene: string; title: string; notes: string; reference: string; createdAt: string; change?: boolean; notified_at?: string | null; notified_count?: number | null };

export function DirectorNotebookView() {
  const { project } = useStudio();
  const { items, shown, save, remove } = useSettingsList('directorNotes');
  const t = useRecordTargets();
  const [draft, setDraft] = useState<Omit<NoteEntry, 'id' | 'createdAt'>>({
    scene: '',
    title: '',
    notes: '',
    reference: '',
    change: false,
  });
  const [filter, setFilter] = useState('');

  const filtered = useMemo(
    () => (filter ? shown.filter((i) => i.scene.toLowerCase().includes(filter.toLowerCase()) || i.title.toLowerCase().includes(filter.toLowerCase())) : shown),
    [shown, filter],
  );

  const add = async () => {
    if (!draft.title.trim()) return;
    if (!(await save([...items, { ...draft, id: `dn-${Date.now()}`, createdAt: new Date().toISOString() }]))) return;
    setDraft({ scene: '', title: '', notes: '', reference: '', change: false });
  };

  const sorted = [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className={s.stack} style={{ gap: 24, maxWidth: 900 }}>
      <ToolHeader icon={<Clapperboard size={16} />} eyebrow="Story & planning" title="Director notebook" purpose="The director’s notes, by scene." accent={project.accent_color} summary={<>{items.length} notes</>} actions={<><input
          className={s.input}
          style={{ width: 180, fontSize: 12 }}
          placeholder="Filter by scene/title…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        /></>} />

      <div className={s.panel} style={{ padding: 12 }}>
        <div className={s.row} style={{ gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <SceneLinkField scenes={t.scenes} sceneById={t.sceneById} ids={draft.scene_ids ?? []} text={draft.scene} onChange={(n) => setDraft({ ...draft, scene: n.text, scene_ids: n.ids })} placeholder="12" />
          <label className={s.field} style={{ flex: '1 1 200px' }}>
            <span className={s.label}>Title</span>
            <input className={s.input} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Vision note" />
          </label>
          <label className={s.field} style={{ flex: '1 1 200px' }}>
            <span className={s.label}>Reference (URL)</span>
            <input className={s.input} value={draft.reference} onChange={(e) => setDraft({ ...draft, reference: e.target.value })} placeholder="image/link" />
          </label>
          <label className={s.row} style={{ gap: 4, alignItems: 'center', paddingBottom: 6 }} title="Mark a note that changes the plan, so you can tell the departments it touches">
            <input type="checkbox" checked={!!draft.change} onChange={(e) => setDraft({ ...draft, change: e.target.checked })} />
            <span className={s.label}>Changes the plan</span>
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

      {items.length > 0 && shown.length === 0 && <p className={s.hint}>No records match your search.</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {sorted.map((n) => (
          <li key={n.id} className={s.panel} style={{ padding: 12 }}>
            <div className={s.row} style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              {sceneChip(n, t.sceneById) && <span className={s.chip}>Sc {sceneChip(n, t.sceneById)}</span>}
              <span style={{ fontWeight: 600, flex: 1, minWidth: 0 }}>{n.title}</span>
              <span className={s.hint} style={{ fontSize: 11 }}>{new Date(n.createdAt).toLocaleDateString()}</span>
              <button className={s.btn} onClick={() => remove(n.id)} title="Delete">
                <Trash2 size={12} />
              </button>
            </div>
            {n.notes && <p className={s.hint} style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{n.notes}</p>}
            {n.change && (n.scene_ids?.length ?? 0) > 0 && (
              <ChangeImpactPanel
                note={n}
                onSent={async (count) => { await save(items.map((i) => (i.id === n.id ? { ...i, notified_at: new Date().toISOString(), notified_count: count } : i))); }}
              />
            )}
            {n.change && (n.scene_ids?.length ?? 0) === 0 && <p className={s.hint} style={{ marginTop: 4 }}>This note changes the plan. Link it to a scene to see who it touches.</p>}
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
