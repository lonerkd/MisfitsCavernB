'use client';

import React, { useState } from 'react';
import { ShieldAlert, Plus, Trash2 } from 'lucide-react';
import { useSettingsList } from './useSettingsList';
import s from '../studio.module.css';

type Entry = { id: string; incident: string; date: string; policy: string; amount: string; status: 'filed' | 'in review' | 'paid' | 'denied'; notes: string };
const STATUSES: Entry['status'][] = ['filed', 'in review', 'paid', 'denied'];
const EMPTY: Omit<Entry, 'id'> = { incident: '', date: '', policy: '', amount: '', status: 'filed', notes: '' };

/** Insurance claims: what happened, when, under which policy, for how much, and where the claim stands. */
export function ClaimsView() {
  const { items, save, remove } = useSettingsList('claims');
  const [draft, setDraft] = useState<Omit<Entry, 'id'>>(EMPTY);

  const add = async () => {
    if (!draft.incident.trim()) return;
    if (!(await save([...items, { ...draft, id: `cl-${Date.now()}` }]))) return;
    setDraft(EMPTY);
  };
  const setStatus = async (id: string, status: Entry['status']) => { await save(items.map((i) => (i.id === id ? { ...i, status } : i))); };

  return (
    <div className={s.stack} style={{ gap: 24, maxWidth: 900 }}>
      <div className={s.toolbar}>
        <div className={s.panelTitle} style={{ marginBottom: 0 }}>
          <ShieldAlert size={14} /> Insurance claims
          <span className={s.hint}> · {items.length} claims · {items.filter((i) => i.status === 'filed' || i.status === 'in review').length} open</span>
        </div>
      </div>
      <div className={s.panel} style={{ padding: 12 }}>
        <div className={s.row} style={{ gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label className={s.field} style={{ flex: '1 1 200px' }}>
            <span className={s.label}>Incident</span>
            <input className={s.input} value={draft.incident} onChange={(e) => setDraft({ ...draft, incident: e.target.value })} placeholder="Camera dropped on location" />
          </label>
          <label className={s.field} style={{ flex: '0 0 140px' }}>
            <span className={s.label}>Date</span>
            <input className={s.input} type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
          </label>
          <label className={s.field} style={{ flex: '1 1 130px' }}>
            <span className={s.label}>Policy</span>
            <input className={s.input} value={draft.policy} onChange={(e) => setDraft({ ...draft, policy: e.target.value })} placeholder="Equipment" />
          </label>
          <label className={s.field} style={{ flex: '0 0 110px' }}>
            <span className={s.label}>Amount</span>
            <input className={s.input} value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} placeholder="2400" />
          </label>
          <button className={s.btnPrimary} onClick={add} disabled={!draft.incident.trim()}><Plus size={12} /> Log claim</button>
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
              <span style={{ fontWeight: 600, flex: 1, minWidth: 0 }}>{m.incident}</span>
              {m.date && <span className={s.hint}>{m.date}</span>}
              {m.policy && <span className={s.hint}>{m.policy}</span>}
              {m.amount && <span className={s.chip}>{m.amount}</span>}
              <select className={s.input} style={{ width: 120, fontSize: 12 }} aria-label={`Status of ${m.incident}`} value={m.status} onChange={(e) => void setStatus(m.id, e.target.value as Entry['status'])}>
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
