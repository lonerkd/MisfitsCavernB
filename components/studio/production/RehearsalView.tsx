'use client';

import React, { useMemo, useState } from 'react';
import { CalendarDays, Plus, Trash2 } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { useStudio } from '../StudioContext';
import { patchProjectSettings } from '@/lib/supabase/progress';
import s from '../studio.module.css';

type RehearsalEntry = { id: string; date: string; time: string; location: string; participants: string; scenes: string; notes: string };

export function RehearsalView() {
  const { project } = useStudio();
  const items: RehearsalEntry[] = useMemo(() => (project.settings as any)?.rehearsals ?? [], [project.settings]);
  const [draft, setDraft] = useState<Omit<RehearsalEntry, 'id'>>({
    date: new Date().toISOString().slice(0, 10),
    time: '10:00',
    location: '',
    participants: '',
    scenes: '',
    notes: '',
  });

  const save = async (next: RehearsalEntry[]) => {
    await patchProjectSettings(project.id, { rehearsals: next } as any);
  };

  const add = async () => {
    if (!draft.date) return;
    await save([...items, { ...draft, id: `r-${Date.now()}` }]);
    setDraft({ date: new Date().toISOString().slice(0, 10), time: '10:00', location: '', participants: '', scenes: '', notes: '' });
  };

  const remove = async (id: string) => {
    await save(items.filter((i) => i.id !== id));
  };

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<CalendarDays size={26} />}
        title="No rehearsals scheduled"
        subtitle="Plan table reads and blocking rehearsals with cast and crew."
      />
    );
  }

  const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  return (
    <div className={s.stack} style={{ gap: 24, maxWidth: 900 }}>
      <div className={s.toolbar}>
        <div className={s.panelTitle} style={{ marginBottom: 0 }}>
          <CalendarDays size={14} /> Rehearsals
          <span className={s.hint}> · {items.length} scheduled</span>
        </div>
      </div>

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
          <label className={s.field} style={{ flex: '1 1 120px' }}>
            <span className={s.label}>Scenes</span>
            <input className={s.input} value={draft.scenes} onChange={(e) => setDraft({ ...draft, scenes: e.target.value })} placeholder="1, 4, 7" />
          </label>
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
            {r.scenes && <p className={s.hint} style={{ marginTop: 2 }}><b>Scenes:</b> {r.scenes}</p>}
            {r.notes && <p className={s.hint} style={{ marginTop: 2, whiteSpace: 'pre-wrap' }}>{r.notes}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
