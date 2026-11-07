'use client';

import React, { useMemo, useState } from 'react';
import { AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { useSettingsList } from './useSettingsList';
import s from '../studio.module.css';

type RiskEntry = { id: string; risk: string; category: string; probability: 'low' | 'medium' | 'high'; impact: 'low' | 'medium' | 'high'; mitigation: string; owner: string; status: 'open' | 'mitigated' | 'closed' };

type Level = 'low' | 'medium' | 'high';
const LEVELS: Level[] = ['low', 'medium', 'high'];
const STATUSES: RiskEntry['status'][] = ['open', 'mitigated', 'closed'];

export function RiskRegisterView() {
  const { items, save, remove } = useSettingsList('risks');
  const [draft, setDraft] = useState<Omit<RiskEntry, 'id'>>({
    risk: '',
    category: 'schedule',
    probability: 'medium',
    impact: 'medium',
    mitigation: '',
    owner: '',
    status: 'open',
  });
  const [filter, setFilter] = useState<'all' | RiskEntry['status']>('all');

  const filtered = useMemo(() => (filter === 'all' ? items : items.filter((i) => i.status === filter)), [items, filter]);

  const add = async () => {
    if (!draft.risk.trim()) return;
    if (!(await save([...items, { ...draft, id: `r-${Date.now()}` }]))) return;
    setDraft({ risk: '', category: 'schedule', probability: 'medium', impact: 'medium', mitigation: '', owner: '', status: 'open' });
  };

  const updateStatus = async (id: string, status: RiskEntry['status']) => {
    await save(items.map((i) => (i.id === id ? { ...i, status } : i)));
  };

  const scoreColor = (p: Level, i: Level) => {
    const v = LEVELS.indexOf(p) + LEVELS.indexOf(i);
    if (v >= 4) return 'var(--danger)';
    if (v >= 2) return 'var(--warn)';
    return 'var(--ok)';
  };

  return (
    <div className={s.stack} style={{ gap: 24, maxWidth: 900 }}>
      <div className={s.toolbar}>
        <div className={s.panelTitle} style={{ marginBottom: 0 }}>
          <AlertTriangle size={14} /> Risk register
          <span className={s.hint}> · {items.length} risks · {items.filter((i) => i.status === 'open').length} open</span>
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
          <label className={s.field} style={{ flex: '1 1 200px' }}>
            <span className={s.label}>Risk</span>
            <input className={s.input} value={draft.risk} onChange={(e) => setDraft({ ...draft, risk: e.target.value })} placeholder="What could go wrong" />
          </label>
          <label className={s.field} style={{ flex: '0 0 110px' }}>
            <span className={s.label}>Category</span>
            <input className={s.input} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder="schedule" />
          </label>
          <label className={s.field} style={{ flex: '0 0 100px' }}>
            <span className={s.label}>Probability</span>
            <select className={s.input} value={draft.probability} onChange={(e) => setDraft({ ...draft, probability: e.target.value as RiskEntry['probability'] })}>
              {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </label>
          <label className={s.field} style={{ flex: '0 0 90px' }}>
            <span className={s.label}>Impact</span>
            <select className={s.input} value={draft.impact} onChange={(e) => setDraft({ ...draft, impact: e.target.value as RiskEntry['impact'] })}>
              {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </label>
          <label className={s.field} style={{ flex: '0 0 130px' }}>
            <span className={s.label}>Owner</span>
            <input className={s.input} value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} placeholder="Name" />
          </label>
          <button className={s.btnPrimary} onClick={add} disabled={!draft.risk.trim()}>
            <Plus size={12} /> Add
          </button>
        </div>
        <label className={s.field} style={{ marginTop: 8 }}>
          <span className={s.label}>Mitigation</span>
          <textarea className={s.textarea} value={draft.mitigation} onChange={(e) => setDraft({ ...draft, mitigation: e.target.value })} rows={2} />
        </label>
      </div>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtered.map((r) => (
          <li key={r.id} className={s.panel} style={{ padding: 12, borderLeft: `4px solid ${scoreColor(r.probability, r.impact)}` }}>
            <div className={s.row} style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, flex: 1, minWidth: 0 }}>{r.risk}</span>
              <span className={s.chip}>{r.category}</span>
              <span className={s.hint}>P:{r.probability} I:{r.impact}</span>
              {r.owner && <span className={s.hint}>{r.owner}</span>}
              <select
                className={s.input}
                style={{ width: 100, fontSize: 12 }}
                value={r.status}
                onChange={(e) => updateStatus(r.id, e.target.value as RiskEntry['status'])}
              >
                {STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}
              </select>
              <button className={s.btn} onClick={() => remove(r.id)} title="Delete">
                <Trash2 size={12} />
              </button>
            </div>
            {r.mitigation && <p className={s.hint} style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}><b>Mitigation:</b> {r.mitigation}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
