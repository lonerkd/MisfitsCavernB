'use client';

import React, { useMemo, useState } from 'react';
import { MapPin, Plus, Trash2 } from 'lucide-react';
import { useSettingsList } from './useSettingsList';
import s from '../studio.module.css';

type ScoutEntry = { id: string; locationName: string; date: string; scout: string; photos: string; notes: string; status: 'scouted' | 'approved' | 'rejected' };

const STATUSES: ScoutEntry['status'][] = ['scouted', 'approved', 'rejected'];

export function ScoutView() {
  const { items, save, remove } = useSettingsList('scouts');
  const [draft, setDraft] = useState<Omit<ScoutEntry, 'id'>>({
    locationName: '',
    date: new Date().toISOString().slice(0, 10),
    scout: '',
    photos: '',
    notes: '',
    status: 'scouted',
  });
  const [filter, setFilter] = useState<'all' | ScoutEntry['status']>('all');

  const filtered = useMemo(() => (filter === 'all' ? items : items.filter((i) => i.status === filter)), [items, filter]);

  const add = async () => {
    if (!draft.locationName.trim()) return;
    if (!(await save([...items, { ...draft, id: `sc-${Date.now()}` }]))) return;
    setDraft({ locationName: '', date: new Date().toISOString().slice(0, 10), scout: '', photos: '', notes: '', status: 'scouted' });
  };

  const updateStatus = async (id: string, status: ScoutEntry['status']) => {
    await save(items.map((i) => (i.id === id ? { ...i, status } : i)));
  };

    return (
    <div className={s.stack} style={{ gap: 24, maxWidth: 900 }}>
      <div className={s.toolbar}>
        <div className={s.panelTitle} style={{ marginBottom: 0 }}>
          <MapPin size={14} /> Location scouts
          <span className={s.hint}> · {items.length} scouted · {items.filter((i) => i.status === 'approved').length} approved</span>
        </div>
        <div className={s.row} style={{ gap: 6 }}>
          {(['all', ...STATUSES] as const).map((st) => (
            <button key={st} className={s.btn} onClick={() => setFilter(st)} style={filter === st ? { background: 'var(--accent)', color: 'var(--on-accent)' } : {}}>
              {st}
            </button>
          ))}
        </div>
      </div>

      <div className={s.panel} style={{ padding: 12 }}>
        <div className={s.row} style={{ gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label className={s.field} style={{ flex: '1 1 160px' }}>
            <span className={s.label}>Location</span>
            <input className={s.input} value={draft.locationName} onChange={(e) => setDraft({ ...draft, locationName: e.target.value })} placeholder="Warehouse, park…" />
          </label>
          <label className={s.field} style={{ flex: '0 0 120px' }}>
            <span className={s.label}>Date</span>
            <input type="date" className={s.input} value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
          </label>
          <label className={s.field} style={{ flex: '0 0 140px' }}>
            <span className={s.label}>Scout</span>
            <input className={s.input} value={draft.scout} onChange={(e) => setDraft({ ...draft, scout: e.target.value })} placeholder="Name" />
          </label>
          <label className={s.field} style={{ flex: '1 1 200px' }}>
            <span className={s.label}>Photos (URLs)</span>
            <input className={s.input} value={draft.photos} onChange={(e) => setDraft({ ...draft, photos: e.target.value })} placeholder="comma-separated" />
          </label>
          <button className={s.btnPrimary} onClick={add} disabled={!draft.locationName.trim()}>
            <Plus size={12} /> Log
          </button>
        </div>
        <label className={s.field} style={{ marginTop: 8 }}>
          <span className={s.label}>Notes</span>
          <textarea className={s.textarea} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} rows={2} />
        </label>
      </div>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtered.map((sc) => (
          <li key={sc.id} className={s.panel} style={{ padding: 12 }}>
            <div className={s.row} style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, flex: 1, minWidth: 0 }}>{sc.locationName}</span>
              <span className={s.hint}>{sc.date}</span>
              {sc.scout && <span className={s.hint}>{sc.scout}</span>}
              <select
                className={s.input}
                style={{ width: 100, fontSize: 12 }}
                value={sc.status}
                onChange={(e) => updateStatus(sc.id, e.target.value as ScoutEntry['status'])}
              >
                {STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}
              </select>
              <button className={s.btn} onClick={() => remove(sc.id)} title="Delete">
                <Trash2 size={12} />
              </button>
            </div>
            {sc.photos && <p className={s.hint} style={{ marginTop: 4, fontSize: 11 }}>{sc.photos}</p>}
            {sc.notes && <p className={s.hint} style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{sc.notes}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
