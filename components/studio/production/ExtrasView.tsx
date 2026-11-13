'use client';

import React, { useState } from 'react';
import { UsersRound, Plus, Trash2 } from 'lucide-react';
import { useSettingsList } from './useSettingsList';
import { SceneLinkField, useRecordTargets } from './RecordLinks';
import { sceneChip } from '@/lib/studio/record-links';
import { useStudio } from '../StudioContext';
import { ToolHeader } from '../ToolHeader';
import s from '../studio.module.css';

type ExtraEntry = { id: string; scene_ids?: string[]; scene: string; role: string; count: string; wardrobe: string; call: string; status: 'requested' | 'booked' | 'confirmed'; notes: string };
const STATUSES: ExtraEntry['status'][] = ['requested', 'booked', 'confirmed'];
const EMPTY: Omit<ExtraEntry, 'id'> = { scene: '', role: '', count: '', wardrobe: '', call: '', status: 'requested', notes: '' };

/** Background actors: who is needed in which scene, how many, in what wardrobe, and whether they are booked. */
export function ExtrasView() {
  const { project } = useStudio();
  const { items, save, remove } = useSettingsList('extras');
  const t = useRecordTargets();
  const [draft, setDraft] = useState<Omit<ExtraEntry, 'id'>>(EMPTY);

  const add = async () => {
    if (!draft.role.trim()) return;
    if (!(await save([...items, { ...draft, id: `ex-${Date.now()}` }]))) return;
    setDraft(EMPTY);
  };
  const setStatus = async (id: string, status: ExtraEntry['status']) => { await save(items.map((i) => (i.id === id ? { ...i, status } : i))); };

  return (
    <div className={s.stack} style={{ gap: 24, maxWidth: 900 }}>
      <ToolHeader icon={<UsersRound size={16} />} eyebrow="Departments" title="Extras" purpose="Background performers booked for each scene." accent={project.accent_color} summary={<>{items.length} bookings · {items.filter((i) => i.status === 'confirmed').length} confirmed</>} />

      <div className={s.panel} style={{ padding: 12 }}>
        <div className={s.row} style={{ gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <SceneLinkField scenes={t.scenes} sceneById={t.sceneById} ids={draft.scene_ids ?? []} text={draft.scene} onChange={(n) => setDraft({ ...draft, scene: n.text, scene_ids: n.ids })} placeholder="12" />
          <label className={s.field} style={{ flex: '1 1 180px' }}>
            <span className={s.label}>Role</span>
            <input className={s.input} value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} placeholder="Café patrons" />
          </label>
          <label className={s.field} style={{ flex: '0 0 110px' }}>
            <span className={s.label}>How many</span>
            <input className={s.input} value={draft.count} onChange={(e) => setDraft({ ...draft, count: e.target.value })} placeholder="12" />
          </label>
          <label className={s.field} style={{ flex: '1 1 140px' }}>
            <span className={s.label}>Wardrobe</span>
            <input className={s.input} value={draft.wardrobe} onChange={(e) => setDraft({ ...draft, wardrobe: e.target.value })} placeholder="Smart casual" />
          </label>
          <button className={s.btnPrimary} onClick={add} disabled={!draft.role.trim()}>
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
              <span style={{ fontWeight: 600, flex: 1, minWidth: 0 }}>{m.role}</span>
              {sceneChip(m, t.sceneById) && <span className={s.chip}>Sc {sceneChip(m, t.sceneById)}</span>}
              {m.count && <span className={s.hint}>{m.count}</span>}
              {m.wardrobe && <span className={s.hint}>{m.wardrobe}</span>}
              <select className={s.input} style={{ width: 110, fontSize: 12 }} aria-label={`Status of ${m.role}`} value={m.status} onChange={(e) => void setStatus(m.id, e.target.value as ExtraEntry['status'])}>
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
