'use client';

import React, { useState } from 'react';
import { FileText, Plus, Trash2, Star } from 'lucide-react';
import { useSettingsList } from './useSettingsList';
import { SceneLinkField, useRecordTargets } from './RecordLinks';
import { sceneChip } from '@/lib/studio/record-links';
import s from '../studio.module.css';

type ScriptNoteEntry = { id: string; scene_ids?: string[]; character_id?: string | null; scene: string; take: string; slate: string; lens: string; notes: string; circle: boolean };

export function ScriptSupView() {
  const { items, save, remove } = useSettingsList('scriptNotes');
  const t = useRecordTargets();
  const [draft, setDraft] = useState<Omit<ScriptNoteEntry, 'id'>>({
    scene: '',
    take: '',
    slate: '',
    lens: '',
    notes: '',
    circle: false,
  });

  const add = async () => {
    if (!draft.take.trim()) return;
    if (!(await save([...items, { ...draft, id: `ss-${Date.now()}` }]))) return;
    setDraft({ scene: '', take: '', slate: '', lens: '', notes: '', circle: false });
  };

  const toggleCircle = async (id: string) => {
    await save(items.map((i) => (i.id === id ? { ...i, circle: !i.circle } : i)));
  };

  return (
    <div className={s.stack} style={{ gap: 24, maxWidth: 900 }}>
      <div className={s.toolbar}>
        <div className={s.panelTitle} style={{ marginBottom: 0 }}>
          <FileText size={14} /> Script supervisor
          <span className={s.hint}> · {items.length} takes · {items.filter((i) => i.circle).length} circled</span>
        </div>
      </div>

      <div className={s.panel} style={{ padding: 12 }}>
        <div className={s.row} style={{ gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <SceneLinkField scenes={t.scenes} sceneById={t.sceneById} ids={draft.scene_ids ?? []} text={draft.scene} onChange={(n) => setDraft({ ...draft, scene: n.text, scene_ids: n.ids })} placeholder="12" />
          <label className={s.field} style={{ flex: '0 0 100px' }}>
            <span className={s.label}>Take</span>
            <input className={s.input} value={draft.take} onChange={(e) => setDraft({ ...draft, take: e.target.value })} placeholder="1A" />
          </label>
          <label className={s.field} style={{ flex: '1 1 140px' }}>
            <span className={s.label}>Slate</span>
            <input className={s.input} value={draft.slate} onChange={(e) => setDraft({ ...draft, slate: e.target.value })} placeholder="A-1" />
          </label>
          <label className={s.field} style={{ flex: '1 1 120px' }}>
            <span className={s.label}>Lens</span>
            <input className={s.input} value={draft.lens} onChange={(e) => setDraft({ ...draft, lens: e.target.value })} placeholder="35mm" />
          </label>
          <label className={s.row} style={{ gap: 4, alignItems: 'center', paddingBottom: 6 }}>
            <input type="checkbox" checked={draft.circle} onChange={(e) => setDraft({ ...draft, circle: e.target.checked })} />
            <span className={s.label}>Circle</span>
          </label>
          <button className={s.btnPrimary} onClick={add} disabled={!draft.take.trim()}>
            <Plus size={12} /> Log
          </button>
        </div>
        <label className={s.field} style={{ marginTop: 8 }}>
          <span className={s.label}>Notes</span>
          <textarea className={s.textarea} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} rows={2} />
        </label>
      </div>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((n) => (
          <li key={n.id} className={s.panel} style={{ padding: 12 }}>
            <div className={s.row} style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {sceneChip(n, t.sceneById) && <span className={s.chip}>Sc {sceneChip(n, t.sceneById)}</span>}
              <span style={{ fontWeight: 600 }}>{n.take}</span>
              {n.slate && <span className={s.hint}>{n.slate}</span>}
              {n.lens && <span className={s.hint}>{n.lens}</span>}
              <button
                className={s.btn}
                onClick={() => toggleCircle(n.id)}
                title={n.circle ? 'Uncircle' : 'Circle'}
                style={n.circle ? { color: 'var(--warn)' } : {}}
              >
                <Star size={12} fill={n.circle ? 'currentColor' : 'none'} />
              </button>
              <button className={s.btn} onClick={() => remove(n.id)} title="Delete">
                <Trash2 size={12} />
              </button>
            </div>
            {n.notes && <p className={s.hint} style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{n.notes}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
