'use client';

import React, { useMemo, useState } from 'react';
import { Shirt, Plus, Trash2 } from 'lucide-react';
import { useSettingsList } from './useSettingsList';
import { CharacterLinkField, SceneLinkField, useRecordTargets } from './RecordLinks';
import { characterName, sceneChip } from '@/lib/studio/record-links';
import s from '../studio.module.css';

type CostumeEntry = { id: string; scene_ids?: string[]; character_id?: string | null; character: string; scene: string; change: string; status: 'fitting' | 'ready' | 'on-set' | 'cleaning' | 'returned' };

const STATUSES: CostumeEntry['status'][] = ['fitting', 'ready', 'on-set', 'cleaning', 'returned'];

export function CostumeView() {
  const { items, save, remove } = useSettingsList('costumes');
  const t = useRecordTargets();
  const [draft, setDraft] = useState<Omit<CostumeEntry, 'id'>>({
    character: '',
    scene: '',
    change: '',
    status: 'fitting',
  });
  const [filter, setFilter] = useState<'all' | CostumeEntry['status']>('all');

  const filtered = useMemo(() => (filter === 'all' ? items : items.filter((i) => i.status === filter)), [items, filter]);

  const add = async () => {
    if (!draft.character.trim()) return;
    if (!(await save([...items, { ...draft, id: `cos-${Date.now()}` }]))) return;
    setDraft({ character: '', scene: '', change: '', status: 'fitting' });
  };

  const updateStatus = async (id: string, status: CostumeEntry['status']) => {
    await save(items.map((i) => (i.id === id ? { ...i, status } : i)));
  };

  return (
    <div className={s.stack} style={{ gap: 24, maxWidth: 900 }}>
      <div className={s.toolbar}>
        <div className={s.panelTitle} style={{ marginBottom: 0 }}>
          <Shirt size={14} /> Costumes / wardrobe
          <span className={s.hint}> · {items.length} items · {items.filter((i) => i.status === 'ready').length} ready</span>
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
          <CharacterLinkField characters={t.characters} id={draft.character_id} text={draft.character} onChange={(n) => setDraft({ ...draft, character: n.text, character_id: n.id })} />
          <SceneLinkField scenes={t.scenes} sceneById={t.sceneById} ids={draft.scene_ids ?? []} text={draft.scene} onChange={(n) => setDraft({ ...draft, scene: n.text, scene_ids: n.ids })} placeholder="12" />
          <label className={s.field} style={{ flex: '1 1 200px' }}>
            <span className={s.label}>Costume change</span>
            <input className={s.input} value={draft.change} onChange={(e) => setDraft({ ...draft, change: e.target.value })} placeholder="Blue dress, boots" />
          </label>
          <button className={s.btnPrimary} onClick={add} disabled={!draft.character.trim()}>
            <Plus size={12} /> Add
          </button>
        </div>
      </div>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtered.map((c) => (
          <li key={c.id} className={s.panel} style={{ padding: 12 }}>
            <div className={s.row} style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, flex: 1, minWidth: 0 }}>{characterName(c, t.characterById)}</span>
              {sceneChip(c, t.sceneById) && <span className={s.chip}>Sc {sceneChip(c, t.sceneById)}</span>}
              {c.change && <span className={s.hint}>{c.change}</span>}
              <select
                className={s.input}
                style={{ width: 100, fontSize: 12 }}
                value={c.status}
                onChange={(e) => updateStatus(c.id, e.target.value as CostumeEntry['status'])}
              >
                {STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}
              </select>
              <button className={s.btn} onClick={() => remove(c.id)} title="Delete">
                <Trash2 size={12} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
