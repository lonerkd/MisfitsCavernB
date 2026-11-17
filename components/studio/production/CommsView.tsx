'use client';

import React, { useEffect, useId, useMemo, useState } from 'react';
import { MessageCircle, Plus, Trash2 } from 'lucide-react';
import { cx } from '../ui';
import { getProjectCrew } from '@/lib/supabase/crew-management';
import { daysWaiting, localIsoDate } from '@/lib/studio/comms-wait';
import { useSettingsList } from './useSettingsList';
import { useStudio } from '../StudioContext';
import { ToolHeader } from '../ToolHeader';
import s from '../studio.module.css';

type CommEntry = { id: string; date: string; to: string; channel: 'call' | 'email' | 'text' | 'in-person'; subject: string; notes: string; status: 'sent' | 'replied' | 'pending' };

const CHANNELS: CommEntry['channel'][] = ['call', 'email', 'text', 'in-person'];
const STATUSES: CommEntry['status'][] = ['pending', 'sent', 'replied'];

export function CommsView() {
  const { project } = useStudio();
  const { items, shown, save, remove } = useSettingsList('comms');
  const [draft, setDraft] = useState<Omit<CommEntry, 'id'>>({
    date: new Date().toISOString().slice(0, 10),
    to: '',
    channel: 'email',
    subject: '',
    notes: '',
    status: 'pending',
  });
  const [filter, setFilter] = useState<'all' | CommEntry['status']>('all');
  const [names, setNames] = useState<string[]>([]);
  const namesListId = useId();

  // Crew usernames on this project, so a "to" names a real person. A failed read leaves the field free-text.
  useEffect(() => {
    let live = true;
    getProjectCrew(project.id).then(
      (rows) => {
        if (!live) return;
        setNames(Array.from(new Set(rows.map((r) => r.username?.trim()).filter((n): n is string => Boolean(n)))));
      },
      () => { if (live) setNames([]); },
    );
    return () => { live = false; };
  }, [project.id]);

  const filtered = useMemo(
    () => (filter === 'all' ? shown : shown.filter((i) => i.status === filter)),
    [shown, filter],
  );

  const today = localIsoDate();

  const add = async () => {
    if (!draft.to.trim() || !draft.subject.trim()) return;
    const entry: CommEntry = { ...draft, id: `c-${Date.now()}` };
    if (!(await save([...items, entry]))) return;
    setDraft({ date: new Date().toISOString().slice(0, 10), to: '', channel: 'email', subject: '', notes: '', status: 'pending' });
  };

  const updateStatus = async (id: string, status: CommEntry['status']) => {
    await save(items.map((i) => (i.id === id ? { ...i, status } : i)));
  };

  return (
    <div className={s.stack} style={{ gap: 24, maxWidth: 900 }}>
      <ToolHeader icon={<MessageCircle size={16} />} eyebrow="People" title="Communications" purpose="Communications logged with cast, crew and vendors." accent={project.accent_color} summary={<>{items.length} logged · {items.filter((i) => i.status === 'pending').length} pending</>} actions={<><div className={s.row} style={{ gap: 6 }}>
          {(['all', ...STATUSES] as const).map((st) => (
            <button key={st} className={cx(s.btn, filter === st && s.btnPrimary)} onClick={() => setFilter(st)}>
              {st}
            </button>
          ))}
        </div></>} />

      <div className={s.panel} style={{ padding: 12 }}>
        <div className={s.row} style={{ gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label className={s.field} style={{ flex: '0 0 120px' }}>
            <span className={s.label}>Date</span>
            <input type="date" className={s.input} value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
          </label>
          <label className={s.field} style={{ flex: '1 1 160px' }}>
            <span className={s.label}>To</span>
            <input className={s.input} list={namesListId} value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} placeholder="Crew member" />
            <datalist id={namesListId}>
              {names.map((n) => <option key={n} value={n} />)}
            </datalist>
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

      {items.length > 0 && shown.length === 0 && <p className={s.hint}>No records match your search.</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtered.map((c) => {
          const waited = daysWaiting(c, today);
          return (
            <li key={c.id} className={s.panel} style={{ padding: 12 }}>
              <div className={s.row} style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <span className={s.hint} style={{ fontSize: 11 }}>{c.date}</span>
                <span style={{ fontWeight: 600 }}>{c.to}</span>
                <span className={s.chip}>{c.channel}</span>
                <span style={{ flex: 1, minWidth: 0 }}>{c.subject}</span>
                {waited !== null && (
                  <span style={{ color: 'var(--warn)', fontSize: 12, fontWeight: 600 }}>waiting {waited} days</span>
                )}
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
          );
        })}
      </ul>
    </div>
  );
}
