'use client';

import React, { useState } from 'react';
import { CalendarDays, Plus, Trash2 } from 'lucide-react';
import { useSettingsList } from './useSettingsList';
import { SceneLinkField, useRecordTargets } from './RecordLinks';
import { sceneChip } from '@/lib/studio/record-links';
import { useStudio } from '../StudioContext';
import { ToolHeader } from '../ToolHeader';
import s from '../studio.module.css';

type RehearsalEntry = { id: string; scene_ids?: string[]; character_id?: string | null; date: string; time: string; location: string; participants: string; scenes: string; notes: string };

export function RehearsalView() {
  const { project } = useStudio();
  const { items, save, remove } = useSettingsList('rehearsals');
  const t = useRecordTargets();
  const [draft, setDraft] = useState<Omit<RehearsalEntry, 'id'>>({
    date: new Date().toISOString().slice(0, 10),
    time: '10:00',
    location: '',
    participants: '',
    scenes: '',
    notes: '',
  });

  const add = async () => {
    if (!draft.date) return;
    if (!(await save([...items, { ...draft, id: `r-${Date.now()}` }]))) return;
    setDraft({ date: new Date().toISOString().slice(0, 10), time: '10:00', location: '', participants: '', scenes: '', notes: '' });
  };

  const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  return (
    <div className={s.stack} style={{ gap: 24, maxWidth: 900 }}>
      <ToolHeader icon={<CalendarDays size={16} />} eyebrow="Story & planning" title="Rehearsals" purpose="Rehearsals: dates, who is called and the notes." accent={project.accent_color} summary={<>{items.length} scheduled</>} />

      <div className={s.panel} style={{ padding: 12 }}>
        <div className={s.row} style={{ gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label className={s.field} style={{ flex: '0 0 120px' }}>
            <span className={s.label}>Date</span>
            <input type="date" className={s.input} value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
          </label>
          <label className={s.field} style={{ flex: '0 0 90px' }}>
            <span className={s.label}>Time</span>
            <input type="time" className={s.input} value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} />
          </label>
          <label className={s.field} style={{ flex: '1 1 160px' }}>
            <span className={s.label}>Location</span>
            <input className={s.input} value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} placeholder="Rehearsal room" />
          </label>
          <label className={s.field} style={{ flex: '1 1 160px' }}>
            <span className={s.label}>Participants</span>
            <input className={s.input} value={draft.participants} onChange={(e) => setDraft({ ...draft, participants: e.target.value })} placeholder="Cast names" />
          </label>
          <SceneLinkField label="Scenes" scenes={t.scenes} sceneById={t.sceneById} ids={draft.scene_ids ?? []} text={draft.scenes} onChange={(n) => setDraft({ ...draft, scenes: n.text, scene_ids: n.ids })} placeholder="1, 4, 7" />
          <button className={s.btnPrimary} onClick={add}>
            <Plus size={12} /> Schedule
          </button>
        </div>
        <label className={s.field} style={{ marginTop: 8 }}>
          <span className={s.label}>Notes</span>
          <textarea className={s.textarea} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} rows={2} />
        </label>
      </div>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {sorted.map((r) => (
          <li key={r.id} className={s.panel} style={{ padding: 12 }}>
            <div className={s.row} style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontWeight: 600 }}>{r.date}</span>
              <span className={s.chip}>{r.time}</span>
              {r.location && <span className={s.hint}>{r.location}</span>}
              <button className={s.btn} onClick={() => remove(r.id)} title="Delete" style={{ marginLeft: 'auto' }}>
                <Trash2 size={12} />
              </button>
            </div>
            {r.participants && <p className={s.hint} style={{ marginTop: 4 }}><b>Cast:</b> {r.participants}</p>}
            {sceneChip(r, t.sceneById) && <p className={s.hint} style={{ marginTop: 2 }}><b>Scenes:</b> {sceneChip(r, t.sceneById)}</p>}
            {r.notes && <p className={s.hint} style={{ marginTop: 2, whiteSpace: 'pre-wrap' }}>{r.notes}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
