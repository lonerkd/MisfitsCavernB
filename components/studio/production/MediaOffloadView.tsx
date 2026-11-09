'use client';

import React, { useMemo, useState } from 'react';
import { HardDrive, Plus, Trash2 } from 'lucide-react';
import { useSettingsList } from './useSettingsList';
import { useStudio } from '../StudioContext';
import { ToolHeader } from '../ToolHeader';
import s from '../studio.module.css';

type MediaEntry = { id: string; card: string; camera: string; size: string; checksum: string; destination: string; status: 'pending' | 'verified' | 'archived' };

const STATUSES: MediaEntry['status'][] = ['pending', 'verified', 'archived'];

export function MediaOffloadView() {
  const { project } = useStudio();
  const { items, save, remove } = useSettingsList('mediaOffloads');
  const [draft, setDraft] = useState<Omit<MediaEntry, 'id'>>({
    card: '',
    camera: '',
    size: '',
    checksum: '',
    destination: '',
    status: 'pending',
  });
  const [filter, setFilter] = useState<'all' | MediaEntry['status']>('all');

  const filtered = useMemo(() => (filter === 'all' ? items : items.filter((i) => i.status === filter)), [items, filter]);

  const add = async () => {
    if (!draft.card.trim()) return;
    if (!(await save([...items, { ...draft, id: `mo-${Date.now()}` }]))) return;
    setDraft({ card: '', camera: '', size: '', checksum: '', destination: '', status: 'pending' });
  };

  const updateStatus = async (id: string, status: MediaEntry['status']) => {
    await save(items.map((i) => (i.id === id ? { ...i, status } : i)));
  };

  return (
    <div className={s.stack} style={{ gap: 24, maxWidth: 900 }}>
      <ToolHeader icon={<HardDrive size={16} />} eyebrow="Reports & logs" title="Media offload log" purpose="Cards offloaded, checksums verified and backups made." accent={project.accent_color} summary={<>{items.length} cards · {items.filter((i) => i.status === 'verified').length} verified</>} actions={<><div className={s.row} style={{ gap: 6 }}>
          {(['all', ...STATUSES] as const).map((st) => (
            <button key={st} className={s.btn} onClick={() => setFilter(st)} style={filter === st ? { background: 'var(--accent)', color: 'var(--on-accent)' } : {}}>
              {st}
            </button>
          ))}
        </div></>} />

      <div className={s.panel} style={{ padding: 12 }}>
        <div className={s.row} style={{ gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label className={s.field} style={{ flex: '0 0 100px' }}>
            <span className={s.label}>Card</span>
            <input className={s.input} value={draft.card} onChange={(e) => setDraft({ ...draft, card: e.target.value })} placeholder="Card 3" />
          </label>
          <label className={s.field} style={{ flex: '0 0 120px' }}>
            <span className={s.label}>Camera</span>
            <input className={s.input} value={draft.camera} onChange={(e) => setDraft({ ...draft, camera: e.target.value })} placeholder="A-cam" />
          </label>
          <label className={s.field} style={{ flex: '0 0 90px' }}>
            <span className={s.label}>Size (GB)</span>
            <input className={s.input} value={draft.size} onChange={(e) => setDraft({ ...draft, size: e.target.value })} placeholder="128" />
          </label>
          <label className={s.field} style={{ flex: '1 1 160px' }}>
            <span className={s.label}>Checksum</span>
            <input className={s.input} value={draft.checksum} onChange={(e) => setDraft({ ...draft, checksum: e.target.value })} placeholder="md5…" />
          </label>
          <label className={s.field} style={{ flex: '1 1 160px' }}>
            <span className={s.label}>Destination</span>
            <input className={s.input} value={draft.destination} onChange={(e) => setDraft({ ...draft, destination: e.target.value })} placeholder="RAID 1" />
          </label>
          <button className={s.btnPrimary} onClick={add} disabled={!draft.card.trim()}>
            <Plus size={12} /> Log
          </button>
        </div>
      </div>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtered.map((m) => (
          <li key={m.id} className={s.panel} style={{ padding: 12 }}>
            <div className={s.row} style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontWeight: 600 }}>{m.card}</span>
              {m.camera && <span className={s.hint}>{m.camera}</span>}
              {m.size && <span className={s.chip}>{m.size} GB</span>}
              {m.destination && <span className={s.hint}>{m.destination}</span>}
              <select
                className={s.input}
                style={{ width: 100, fontSize: 12 }}
                value={m.status}
                onChange={(e) => updateStatus(m.id, e.target.value as MediaEntry['status'])}
              >
                {STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}
              </select>
              <button className={s.btn} onClick={() => remove(m.id)} title="Delete">
                <Trash2 size={12} />
              </button>
            </div>
            {m.checksum && <p className={s.hint} style={{ marginTop: 4, fontSize: 11, fontFamily: 'monospace' }}>{m.checksum}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
