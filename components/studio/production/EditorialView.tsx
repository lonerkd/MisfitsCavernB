'use client';

import React, { useState } from 'react';
import { Send, Plus, Trash2 } from 'lucide-react';
import { useSettingsList } from './useSettingsList';
import { SceneLinkField, useRecordTargets } from './RecordLinks';
import { sceneChip } from '@/lib/studio/record-links';
import s from '../studio.module.css';

type Entry = { id: string; scene_ids?: string[]; scene: string; item: string; version: string; recipient: string; due: string; status: 'pending' | 'sent' | 'received'; notes: string };
const STATUSES: Entry['status'][] = ['pending', 'sent', 'received'];
const EMPTY: Omit<Entry, 'id'> = { scene: '', item: '', version: '', recipient: '', due: '', status: 'pending', notes: '' };

/** What goes to the editor and when: dailies, audio, notes, the cut. Whether it has been sent and whether it arrived. */
export function EditorialView() {
  const { items, save, remove } = useSettingsList('editorial');
  const t = useRecordTargets();
  const [draft, setDraft] = useState<Omit<Entry, 'id'>>(EMPTY);

  const add = async () => {
    if (!draft.item.trim()) return;
    if (!(await save([...items, { ...draft, id: `ed-${Date.now()}` }]))) return;
    setDraft(EMPTY);
  };
  const setStatus = async (id: string, status: Entry['status']) => { await save(items.map((i) => (i.id === id ? { ...i, status } : i))); };

  return (
    <div className={s.stack} style={{ gap: 24, maxWidth: 900 }}>
      <div className={s.toolbar}>
        <div className={s.panelTitle} style={{ marginBottom: 0 }}>
          <Send size={14} /> Editorial handoff
          <span className={s.hint}> · {items.length} items · {items.filter((i) => i.status === 'received').length} received</span>
        </div>
      </div>
      <div className={s.panel} style={{ padding: 12 }}>
        <div className={s.row} style={{ gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <SceneLinkField scenes={t.scenes} sceneById={t.sceneById} ids={draft.scene_ids ?? []} text={draft.scene} onChange={(n) => setDraft({ ...draft, scene: n.text, scene_ids: n.ids })} placeholder="12" />
          <label className={s.field} style={{ flex: '1 1 180px' }}>
            <span className={s.label}>Item</span>
            <input className={s.input} value={draft.item} onChange={(e) => setDraft({ ...draft, item: e.target.value })} placeholder="Day 3 dailies" />
          </label>
          <label className={s.field} style={{ flex: '0 0 90px' }}>
            <span className={s.label}>Version</span>
            <input className={s.input} value={draft.version} onChange={(e) => setDraft({ ...draft, version: e.target.value })} placeholder="v1" />
          </label>
          <label className={s.field} style={{ flex: '1 1 140px' }}>
            <span className={s.label}>To</span>
            <input className={s.input} value={draft.recipient} onChange={(e) => setDraft({ ...draft, recipient: e.target.value })} placeholder="Editor" />
          </label>
          <label className={s.field} style={{ flex: '0 0 140px' }}>
            <span className={s.label}>Due</span>
            <input className={s.input} type="date" value={draft.due} onChange={(e) => setDraft({ ...draft, due: e.target.value })} />
          </label>
          <button className={s.btnPrimary} onClick={add} disabled={!draft.item.trim()}><Plus size={12} /> Log</button>
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
              <span style={{ fontWeight: 600, flex: 1, minWidth: 0 }}>{m.item}</span>
              {sceneChip(m, t.sceneById) && <span className={s.chip}>Sc {sceneChip(m, t.sceneById)}</span>}
              {m.version && <span className={s.chip}>{m.version}</span>}
              {m.recipient && <span className={s.hint}>to {m.recipient}</span>}
              {m.due && <span className={s.hint}>due {m.due}</span>}
              <select className={s.input} style={{ width: 110, fontSize: 12 }} aria-label={`Status of ${m.item}`} value={m.status} onChange={(e) => void setStatus(m.id, e.target.value as Entry['status'])}>
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
