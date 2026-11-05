'use client';

import React, { useMemo, useState } from 'react';
import { MessageCircle, Plus, Trash2, Send, Reply } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { useStudio } from '../StudioContext';
import { patchProjectSettings } from '@/lib/supabase/progress';
import { cx } from '../ui';
import s from '../studio.module.css';

type CommEntry = { id: string; date: string; to: string; channel: 'call' | 'email' | 'text' | 'in-person'; subject: string; notes: string; status: 'sent' | 'replied' | 'pending' };

const CHANNELS: CommEntry['channel'][] = ['call', 'email', 'text', 'in-person'];
const STATUSES: CommEntry['status'][] = ['pending', 'sent', 'replied'];

export function CommsView() {
  const { project } = useStudio();
  const items: CommEntry[] = useMemo(() => (project.settings as any)?.comms ?? [], [project.settings]);
  const [draft, setDraft] = useState<Omit<CommEntry, 'id'>>({
    date: new Date().toISOString().slice(0, 10),
    to: '',
    channel: 'email',
    subject: '',
    notes: '',
    status: 'pending',
  });
  const [filter, setFilter] = useState<'all' | CommEntry['status']>('all');

  const filtered = useMemo(
    () => (filter === 'all' ? items : items.filter((i) => i.status === filter)),
    [items, filter],
  );

  const save = async (next: CommEntry[]) => {
    await patchProjectSettings(project.id, { comms: next } as any);
  };

  const add = async () => {
    if (!draft.to.trim() || !draft.subject.trim()) return;
    const entry: CommEntry = { ...draft, id: `c-${Date.now()}` };
    await save([...items, entry]);
    setDraft({ date: new Date().toISOString().slice(0, 10), to: '', channel: 'email', subject: '', notes: '', status: 'pending' });
  };

  const updateStatus = async (id: string, status: CommEntry['status']) => {
    await save(items.map((i) => (i.id === id ? { ...i, status } : i)));
  };

  const remove = async (id: string) => {
    await save(items.filter((i) => i.id !== id));
  };

  if (items.length === 0 && filter === 'all') {
    return (
      <EmptyState
        icon={<MessageCircle size={26} />}
        title="No communications logged"
        subtitle="Track calls, emails, and confirmations with crew and cast."
      />
    );
  }

  return (
    <div className={s.stack} style={{ gap: 24, maxWidth: 900 }}>
      <div className={s.toolbar}>
        <div className={s.panelTitle} style={{ marginBottom: 0 }}>
          <MessageCircle size={14} /> Communications
          <span className={s.hint}> · {items.length} logged · {items.filter((i) => i.status === 'pending').length} pending</span>
        </div>
        <div className={s.row} style={{ gap: 6 }}>
          {(['all', ...STATUSES] as const).map((st) => (
            <button key={st} className={cx(s.btn, filter === st && s.btnPrimary)} onClick={() => setFilter(st)}>
              {st}
            </button>
          ))}
        </div>
      </div>

      <div className={s.panel} style={{ padding: 12 }}>
        <div className={s.row} style={{ gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label className={s.field} style={{ flex: '0 0 120px' }}>
            <span className={s.label}>Date</span>
            <input type="date" className={s.input} value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
          </label>
          <label className={s.field} style={{ flex: '1 1 160px' }}>
            <span className={s.label}>To</span>
            <input className={s.input} value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} placeholder="Crew member" />
          </label>
          <label className={s.field} style={{ flex: '0 0 110px' }}>
            <span className={s.label}>Channel</span>
            <select className={s.input} value={draft.channel} onChange={(e) => setDraft({ ...draft, channel: e.target.value as CommEntry['channel'] })}>
              {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className={s.field} style={{ flex: '1 1 200px' }}>
            <span className={s.label}>Subject</span>
            <input className={s.input} value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} placeholder="What was communicated" />
          </label>
          <button className={s.btnPrimary} onClick={add} disabled={!draft.to.trim() || !draft.subject.trim()}>
            <Plus size={12} /> Log
          </button>
        </div>
        <label className={s.field} style={{ marginTop: 8 }}>
          <span className={s.label}>Notes</span>
          <textarea className={s.textarea} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} rows={2} />
        </label>
      </div>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtered.map((c) => (
          <li key={c.id} className={s.panel} style={{ padding: 12 }}>
            <div className={s.row} style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <span className={s.hint} style={{ fontSize: 11 }}>{c.date}</span>
              <span style={{ fontWeight: 600 }}>{c.to}</span>
              <span className={s.chip}>{c.channel}</span>
              <span style={{ flex: 1, minWidth: 0 }}>{c.subject}</span>
              <select
                className={s.input}
                style={{ width: 90, fontSize: 12 }}
                value={c.status}
                onChange={(e) => updateStatus(c.id, e.target.value as CommEntry['status'])}
              >
                {STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}
              </select>
              <button className={s.btn} onClick={() => remove(c.id)} title="Delete">
                <Trash2 size={12} />
              </button>
            </div>
            {c.notes && <p className={s.hint} style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{c.notes}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
