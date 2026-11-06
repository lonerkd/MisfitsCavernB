'use client';

import React, { useMemo, useState } from 'react';
import { FileCheck, Plus, Trash2 } from 'lucide-react';
import { useStudio } from '../StudioContext';
import { patchProjectSettings } from '@/lib/supabase/progress';
import s from '../studio.module.css';

type PermitEntry = { id: string; location: string; permitType: string; issuedBy: string; expiry: string; status: 'pending' | 'approved' | 'expired' };

const STATUSES: PermitEntry['status'][] = ['pending', 'approved', 'expired'];

export function PermitView() {
  const { project } = useStudio();
  const items: PermitEntry[] = useMemo(() => (project.settings as any)?.permits ?? [], [project.settings]);
  const [draft, setDraft] = useState<Omit<PermitEntry, 'id'>>({
    location: '',
    permitType: '',
    issuedBy: '',
    expiry: '',
    status: 'pending',
  });
  const [filter, setFilter] = useState<'all' | PermitEntry['status']>('all');

  const filtered = useMemo(() => (filter === 'all' ? items : items.filter((i) => i.status === filter)), [items, filter]);

  const save = async (next: PermitEntry[]) => {
    await patchProjectSettings(project.id, { permits: next } as any);
  };

  const add = async () => {
    if (!draft.location.trim()) return;
    await save([...items, { ...draft, id: `pm-${Date.now()}` }]);
    setDraft({ location: '', permitType: '', issuedBy: '', expiry: '', status: 'pending' });
  };

  const updateStatus = async (id: string, status: PermitEntry['status']) => {
    await save(items.map((i) => (i.id === id ? { ...i, status } : i)));
  };

  const remove = async (id: string) => {
    await save(items.filter((i) => i.id !== id));
  };

    return (
    <div className={s.stack} style={{ gap: 24, maxWidth: 900 }}>
      <div className={s.toolbar}>
        <div className={s.panelTitle} style={{ marginBottom: 0 }}>
          <FileCheck size={14} /> Permits & insurance
          <span className={s.hint}> · {items.length} tracked · {items.filter((i) => i.status === 'approved').length} approved</span>
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
          <label className={s.field} style={{ flex: '1 1 160px' }}>
            <span className={s.label}>Location</span>
            <input className={s.input} value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} placeholder="Warehouse" />
          </label>
          <label className={s.field} style={{ flex: '1 1 160px' }}>
            <span className={s.label}>Permit type</span>
            <input className={s.input} value={draft.permitType} onChange={(e) => setDraft({ ...draft, permitType: e.target.value })} placeholder="Film permit" />
          </label>
          <label className={s.field} style={{ flex: '1 1 160px' }}>
            <span className={s.label}>Issued by</span>
            <input className={s.input} value={draft.issuedBy} onChange={(e) => setDraft({ ...draft, issuedBy: e.target.value })} placeholder="City film office" />
          </label>
          <label className={s.field} style={{ flex: '0 0 130px' }}>
            <span className={s.label}>Expiry</span>
            <input type="date" className={s.input} value={draft.expiry} onChange={(e) => setDraft({ ...draft, expiry: e.target.value })} />
          </label>
          <button className={s.btnPrimary} onClick={add} disabled={!draft.location.trim()}>
            <Plus size={12} /> Add
          </button>
        </div>
      </div>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtered.map((p) => (
          <li key={p.id} className={s.panel} style={{ padding: 12 }}>
            <div className={s.row} style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, flex: 1, minWidth: 0 }}>{p.location}</span>
              <span className={s.chip}>{p.permitType}</span>
              {p.issuedBy && <span className={s.hint}>{p.issuedBy}</span>}
              {p.expiry && <span className={s.hint}>exp {p.expiry}</span>}
              <select
                className={s.input}
                style={{ width: 100, fontSize: 12 }}
                value={p.status}
                onChange={(e) => updateStatus(p.id, e.target.value as PermitEntry['status'])}
              >
                {STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}
              </select>
              <button className={s.btn} onClick={() => remove(p.id)} title="Delete">
                <Trash2 size={12} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
