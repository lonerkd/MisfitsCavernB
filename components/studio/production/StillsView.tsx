'use client';

import React, { useState } from 'react';
import { Images, Plus, Trash2 } from 'lucide-react';
import { useSettingsList } from './useSettingsList';
import { SceneLinkField, useRecordTargets } from './RecordLinks';
import { sceneChip } from '@/lib/studio/record-links';
import s from '../studio.module.css';

type StillEntry = { id: string; scene_ids?: string[]; scene: string; frames: string; photographer: string; subject: string; status: 'shot' | 'selected' | 'delivered'; notes: string };
const STATUSES: StillEntry['status'][] = ['shot', 'selected', 'delivered'];
const EMPTY: Omit<StillEntry, 'id'> = { scene: '', frames: '', photographer: '', subject: '', status: 'shot', notes: '' };

/** The unit photographer's log: which frames were taken in which scene, what is selected, what has gone to the client. */
export function StillsView() {
  const { items, save, remove } = useSettingsList('stills');
  const t = useRecordTargets();
  const [draft, setDraft] = useState<Omit<StillEntry, 'id'>>(EMPTY);

  const add = async () => {
    if (!draft.subject.trim()) return;
    if (!(await save([...items, { ...draft, id: `st-${Date.now()}` }]))) return;
    setDraft(EMPTY);
  };
  const setStatus = async (id: string, status: StillEntry['status']) => { await save(items.map((i) => (i.id === id ? { ...i, status } : i))); };

  return (
    <div className={s.stack} style={{ gap: 24, maxWidth: 900 }}>
      <div className={s.toolbar}>
        <div className={s.panelTitle} style={{ marginBottom: 0 }}>
          <Images size={14} /> Stills log
          <span className={s.hint}> · {items.length} entries · {items.filter((i) => i.status === 'delivered').length} delivered</span>
        </div>
      </div>

      <div className={s.panel} style={{ padding: 12 }}>
        <div className={s.row} style={{ gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <SceneLinkField scenes={t.scenes} sceneById={t.sceneById} ids={draft.scene_ids ?? []} text={draft.scene} onChange={(n) => setDraft({ ...draft, scene: n.text, scene_ids: n.ids })} placeholder="12" />
          <label className={s.field} style={{ flex: '1 1 180px' }}>
            <span className={s.label}>Subject</span>
            <input className={s.input} value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} placeholder="Maya at the window" />
          </label>
          <label className={s.field} style={{ flex: '0 0 110px' }}>
            <span className={s.label}>Frames</span>
            <input className={s.input} value={draft.frames} onChange={(e) => setDraft({ ...draft, frames: e.target.value })} placeholder="0412–0440" />
          </label>
          <label className={s.field} style={{ flex: '1 1 140px' }}>
            <span className={s.label}>Photographer</span>
            <input className={s.input} value={draft.photographer} onChange={(e) => setDraft({ ...draft, photographer: e.target.value })} placeholder="Name" />
          </label>
          <button className={s.btnPrimary} onClick={add} disabled={!draft.subject.trim()}>
            <Plus size={12} /> Log
          </button>
        </div>
        <label className={s.field} style={{ marginTop: 8 }}>
          <span className={s.label}>Notes</span>
          <textarea className={s.textarea} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} rows={2} />
        </label>
      </div>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((m) => (
          <li key={m.id} className={s.panel} style={{ padding: 12 }}>
            <div className={s.row} style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, flex: 1, minWidth: 0 }}>{m.subject}</span>
              {sceneChip(m, t.sceneById) && <span className={s.chip}>Sc {sceneChip(m, t.sceneById)}</span>}
              {m.frames && <span className={s.hint}>{m.frames}</span>}
              {m.photographer && <span className={s.hint}>{m.photographer}</span>}
              <select className={s.input} style={{ width: 110, fontSize: 12 }} aria-label={`Status of ${m.subject}`} value={m.status} onChange={(e) => void setStatus(m.id, e.target.value as StillEntry['status'])}>
                {STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}
              </select>
              <button className={s.btn} onClick={() => remove(m.id)} title="Delete"><Trash2 size={12} /></button>
            </div>
            {m.notes && <p className={s.hint} style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{m.notes}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
