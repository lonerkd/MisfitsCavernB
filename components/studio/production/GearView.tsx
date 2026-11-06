'use client';

import React, { useMemo, useState } from 'react';
import { Wrench, Plus, Trash2 } from 'lucide-react';
import { useStudio } from '../StudioContext';
import { patchProjectSettings } from '@/lib/supabase/progress';
import s from '../studio.module.css';

type GearEntry = { id: string; item: string; category: string; owner: string; status: 'needed' | 'packed' | 'on-set' | 'returned' };

const STATUSES: GearEntry['status'][] = ['needed', 'packed', 'on-set', 'returned'];

export function GearView() {
  const { project } = useStudio();
  const items: GearEntry[] = useMemo(() => (project.settings as any)?.gear ?? [], [project.settings]);
  const [draft, setDraft] = useState<Omit<GearEntry, 'id'>>({ item: '', category: 'camera', owner: '', status: 'needed' });
  const [filter, setFilter] = useState<'all' | GearEntry['status']>('all');

  const filtered = useMemo(() => (filter === 'all' ? items : items.filter((i) => i.status === filter)), [items, filter]);

  const save = async (next: GearEntry[]) => {
    await patchProjectSettings(project.id, { gear: next } as any);
  };

  const add = async () => {
    if (!draft.item.trim()) return;
    await save([...items, { ...draft, id: `g-${Date.now()}` }]);
    setDraft({ item: '', category: 'camera', owner: '', status: 'needed' });
  };

  const updateStatus = async (id: string, status: GearEntry['status']) => {
    await save(items.map((i) => (i.id === id ? { ...i, status } : i)));
  };

  const remove = async (id: string) => {
    await save(items.filter((i) => i.id !== id));
  };

    const counts = STATUSES.reduce((acc, st) => ({ ...acc, [st]: items.filter((i) => i.status === st).length }), {} as Record<string, number>);

  return (
    <div className={s.stack} style={{ gap: 24, maxWidth: 900 }}>
      <div className={s.toolbar}>
        <div className={s.panelTitle} style={{ marginBottom: 0 }}>
          <Wrench size={14} /> Equipment / gear
          <span className={s.hint}> · {items.length} items · {counts['needed']} needed · {counts['on-set']} on set</span>
        </div>
        <div className={s.row} style={{ gap: 6 }}>
          {(['all', ...STATUSES] as const).map((st) => (
            <button key={st} className={s.btn} onClick={() => setFilter(st)} style={filter === st ? { background: 'var(--accent)', color: '#fff' } : {}}>
              {st}
            </button>
          ))}
        </div>
      </div>

      <div className={s.panel} style={{ padding: 12 }}>
        <div className={s.row} style={{ gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label className={s.field} style={{ flex: '1 1 200px' }}>
            <span className={s.label}>Item</span>
            <input className={s.input} value={draft.item} onChange={(e) => setDraft({ ...draft, item: e.target.value })} placeholder="Camera body, light kit…" />
          </label>
          <label className={s.field} style={{ flex: '0 0 120px' }}>
            <span className={s.label}>Category</span>
            <input className={s.input} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder="camera" />
          </label>
          <label className={s.field} style={{ flex: '0 0 140px' }}>
            <span className={s.label}>Owner</span>
            <input className={s.input} value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} placeholder="Rental house" />
          </label>
          <button className={s.btnPrimary} onClick={add} disabled={!draft.item.trim()}>
            <Plus size={12} /> Add
          </button>
        </div>
      </div>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtered.map((g) => (
          <li key={g.id} className={s.panel} style={{ padding: 12 }}>
            <div className={s.row} style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, flex: 1, minWidth: 0 }}>{g.item}</span>
              <span className={s.chip}>{g.category}</span>
              {g.owner && <span className={s.hint}>{g.owner}</span>}
              <select
                className={s.input}
                style={{ width: 100, fontSize: 12 }}
                value={g.status}
                onChange={(e) => updateStatus(g.id, e.target.value as GearEntry['status'])}
              >
                {STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}
              </select>
              <button className={s.btn} onClick={() => remove(g.id)} title="Delete">
                <Trash2 size={12} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
