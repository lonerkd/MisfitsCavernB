'use client';

import React, { useMemo, useState } from 'react';
import { Receipt, Plus, Trash2 } from 'lucide-react';
import { useSettingsList } from './useSettingsList';
import s from '../studio.module.css';

type PoEntry = { id: string; poNumber: string; vendor: string; department: string; amount: string; status: 'draft' | 'approved' | 'paid' };

const STATUSES: PoEntry['status'][] = ['draft', 'approved', 'paid'];

export function PoView() {
  const { items, save, remove } = useSettingsList('purchaseOrders');
  const [draft, setDraft] = useState<Omit<PoEntry, 'id'>>({
    poNumber: '',
    vendor: '',
    department: '',
    amount: '',
    status: 'draft',
  });
  const [filter, setFilter] = useState<'all' | PoEntry['status']>('all');

  const filtered = useMemo(() => (filter === 'all' ? items : items.filter((i) => i.status === filter)), [items, filter]);

  const add = async () => {
    if (!draft.vendor.trim()) return;
    if (!(await save([...items, { ...draft, id: `po-${Date.now()}` }]))) return;
    setDraft({ poNumber: '', vendor: '', department: '', amount: '', status: 'draft' });
  };

  const updateStatus = async (id: string, status: PoEntry['status']) => {
    await save(items.map((i) => (i.id === id ? { ...i, status } : i)));
  };

    const total = items.reduce((a, b) => a + (parseFloat(b.amount) || 0), 0);

  return (
    <div className={s.stack} style={{ gap: 24, maxWidth: 900 }}>
      <div className={s.toolbar}>
        <div className={s.panelTitle} style={{ marginBottom: 0 }}>
          <Receipt size={14} /> Purchase orders
          <span className={s.hint}> · {items.length} POs · ${total.toFixed(2)} total</span>
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
          <label className={s.field} style={{ flex: '0 0 100px' }}>
            <span className={s.label}>PO #</span>
            <input className={s.input} value={draft.poNumber} onChange={(e) => setDraft({ ...draft, poNumber: e.target.value })} placeholder="PO-001" />
          </label>
          <label className={s.field} style={{ flex: '1 1 160px' }}>
            <span className={s.label}>Vendor</span>
            <input className={s.input} value={draft.vendor} onChange={(e) => setDraft({ ...draft, vendor: e.target.value })} placeholder="Rental house" />
          </label>
          <label className={s.field} style={{ flex: '1 1 140px' }}>
            <span className={s.label}>Department</span>
            <input className={s.input} value={draft.department} onChange={(e) => setDraft({ ...draft, department: e.target.value })} placeholder="Camera" />
          </label>
          <label className={s.field} style={{ flex: '0 0 100px' }}>
            <span className={s.label}>Amount</span>
            <input className={s.input} value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} placeholder="1500" />
          </label>
          <button className={s.btnPrimary} onClick={add} disabled={!draft.vendor.trim()}>
            <Plus size={12} /> Add
          </button>
        </div>
      </div>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtered.map((p) => (
          <li key={p.id} className={s.panel} style={{ padding: 12 }}>
            <div className={s.row} style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              {p.poNumber && <span className={s.chip}>{p.poNumber}</span>}
              <span style={{ fontWeight: 600, flex: 1, minWidth: 0 }}>{p.vendor}</span>
              {p.department && <span className={s.hint}>{p.department}</span>}
              <span className={s.hint}>${parseFloat(p.amount || '0').toFixed(2)}</span>
              <select
                className={s.input}
                style={{ width: 100, fontSize: 12 }}
                value={p.status}
                onChange={(e) => updateStatus(p.id, e.target.value as PoEntry['status'])}
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
