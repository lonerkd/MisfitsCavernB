'use client';

import React, { useState } from 'react';
import { ClipboardCheck, Plus, Trash2 } from 'lucide-react';
import { useSettingsList } from './useSettingsList';
import s from '../studio.module.css';

type WrapEntry = { id: string; date: string; dayNumber: number; shotsGot: number; pages: string; incidents: string; notes: string };

export function WrapView() {
  const { items, save, remove } = useSettingsList('wraps');
  const [draft, setDraft] = useState<Omit<WrapEntry, 'id'>>({
    date: new Date().toISOString().slice(0, 10),
    dayNumber: 1,
    shotsGot: 0,
    pages: '',
    incidents: '',
    notes: '',
  });

  const add = async () => {
    if (!(await save([...items, { ...draft, id: `w-${Date.now()}` }]))) return;
    setDraft({ date: new Date().toISOString().slice(0, 10), dayNumber: items.length + 2, shotsGot: 0, pages: '', incidents: '', notes: '' });
  };

  const sorted = [...items].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className={s.stack} style={{ gap: 24, maxWidth: 900 }}>
      <div className={s.toolbar}>
        <div className={s.panelTitle} style={{ marginBottom: 0 }}>
          <ClipboardCheck size={14} /> Wrap reports
          <span className={s.hint}> · {items.length} reports · {items.reduce((a, b) => a + b.shotsGot, 0)} shots got</span>
        </div>
      </div>

      <div className={s.panel} style={{ padding: 12 }}>
        <div className={s.row} style={{ gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label className={s.field} style={{ flex: '0 0 120px' }}>
            <span className={s.label}>Date</span>
            <input type="date" className={s.input} value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
          </label>
          <label className={s.field} style={{ flex: '0 0 80px' }}>
            <span className={s.label}>Day #</span>
            <input type="number" className={s.input} value={draft.dayNumber} onChange={(e) => setDraft({ ...draft, dayNumber: Number(e.target.value) })} />
          </label>
          <label className={s.field} style={{ flex: '0 0 90px' }}>
            <span className={s.label}>Shots got</span>
            <input type="number" className={s.input} value={draft.shotsGot} onChange={(e) => setDraft({ ...draft, shotsGot: Number(e.target.value) })} />
          </label>
          <label className={s.field} style={{ flex: '1 1 140px' }}>
            <span className={s.label}>Pages</span>
            <input className={s.input} value={draft.pages} onChange={(e) => setDraft({ ...draft, pages: e.target.value })} placeholder="e.g. 4 3/8" />
          </label>
          <button className={s.btnPrimary} onClick={add}>
            <Plus size={12} /> Log wrap
          </button>
        </div>
        <label className={s.field} style={{ marginTop: 8 }}>
          <span className={s.label}>Incidents</span>
          <textarea className={s.textarea} value={draft.incidents} onChange={(e) => setDraft({ ...draft, incidents: e.target.value })} rows={2} />
        </label>
        <label className={s.field} style={{ marginTop: 8 }}>
          <span className={s.label}>Notes</span>
          <textarea className={s.textarea} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} rows={2} />
        </label>
      </div>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {sorted.map((w) => (
          <li key={w.id} className={s.panel} style={{ padding: 12 }}>
            <div className={s.row} style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontWeight: 600 }}>Day {w.dayNumber}</span>
              <span className={s.hint}>{w.date}</span>
              <span className={s.chip}>{w.shotsGot} shots</span>
              {w.pages && <span className={s.chip}>{w.pages} pp</span>}
              <button className={s.btn} onClick={() => remove(w.id)} title="Delete" style={{ marginLeft: 'auto' }}>
                <Trash2 size={12} />
              </button>
            </div>
            {w.incidents && <p className={s.hint} style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}><b>Incidents:</b> {w.incidents}</p>}
            {w.notes && <p className={s.hint} style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{w.notes}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
