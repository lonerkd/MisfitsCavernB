'use client';

import React, { useMemo, useState } from 'react';
import { Sparkles, Plus, Trash2 } from 'lucide-react';
import { useSettingsList } from './useSettingsList';
import s from '../studio.module.css';

type VfxEntry = { id: string; shot: string; scene: string; vendor: string; plateReq: string; status: 'identified' | 'shot' | 'delivered' | 'approved' };

const STATUSES: VfxEntry['status'][] = ['identified', 'shot', 'delivered', 'approved'];

export function VfxView() {
  const { items, save, remove } = useSettingsList('vfxShots');
  const [draft, setDraft] = useState<Omit<VfxEntry, 'id'>>({
    shot: '',
    scene: '',
    vendor: '',
    plateReq: '',
    status: 'identified',
  });
  const [filter, setFilter] = useState<'all' | VfxEntry['status']>('all');

  const filtered = useMemo(() => (filter === 'all' ? items : items.filter((i) => i.status === filter)), [items, filter]);

  const add = async () => {
    if (!draft.shot.trim()) return;
    if (!(await save([...items, { ...draft, id: `vfx-${Date.now()}` }]))) return;
    setDraft({ shot: '', scene: '', vendor: '', plateReq: '', status: 'identified' });
  };

  const updateStatus = async (id: string, status: VfxEntry['status']) => {
    await save(items.map((i) => (i.id === id ? { ...i, status } : i)));
  };

  return (
    <div className={s.stack} style={{ gap: 24, maxWidth: 900 }}>
      <div className={s.toolbar}>
        <div className={s.panelTitle} style={{ marginBottom: 0 }}>
          <Sparkles size={14} /> VFX shots
          <span className={s.hint}> · {items.length} shots · {items.filter((i) => i.status === 'approved').length} approved</span>
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
            <span className={s.label}>Shot</span>
            <input className={s.input} value={draft.shot} onChange={(e) => setDraft({ ...draft, shot: e.target.value })} placeholder="VFX-001" />
          </label>
          <label className={s.field} style={{ flex: '0 0 80px' }}>
            <span className={s.label}>Scene</span>
            <input className={s.input} value={draft.scene} onChange={(e) => setDraft({ ...draft, scene: e.target.value })} placeholder="12" />
          </label>
          <label className={s.field} style={{ flex: '1 1 160px' }}>
            <span className={s.label}>Vendor</span>
            <input className={s.input} value={draft.vendor} onChange={(e) => setDraft({ ...draft, vendor: e.target.value })} placeholder="Vendor name" />
          </label>
          <label className={s.field} style={{ flex: '1 1 200px' }}>
            <span className={s.label}>Plate requirements</span>
            <input className={s.input} value={draft.plateReq} onChange={(e) => setDraft({ ...draft, plateReq: e.target.value })} placeholder="HDRI, lidar, clean plate" />
          </label>
          <button className={s.btnPrimary} onClick={add} disabled={!draft.shot.trim()}>
            <Plus size={12} /> Add
          </button>
        </div>
      </div>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtered.map((v) => (
          <li key={v.id} className={s.panel} style={{ padding: 12 }}>
            <div className={s.row} style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontWeight: 600 }}>{v.shot}</span>
              {v.scene && <span className={s.chip}>Sc {v.scene}</span>}
              {v.vendor && <span className={s.hint}>{v.vendor}</span>}
              {v.plateReq && <span className={s.hint} style={{ fontSize: 11 }}>{v.plateReq}</span>}
              <select
                className={s.input}
                style={{ width: 110, fontSize: 12 }}
                value={v.status}
                onChange={(e) => updateStatus(v.id, e.target.value as VfxEntry['status'])}
              >
                {STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}
              </select>
              <button className={s.btn} onClick={() => remove(v.id)} title="Delete">
                <Trash2 size={12} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
