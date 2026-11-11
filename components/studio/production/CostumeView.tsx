'use client';

import React, { useMemo, useState } from 'react';
import { Shirt, Plus, Trash2 } from 'lucide-react';
import { useSettingsList } from './useSettingsList';
import { ScenePicker, CharacterPicker } from './SceneCharacterPickers';
import { useStudio } from '../StudioContext';
import { useCharacters } from '@/lib/studio';
import s from '../studio.module.css';

type CostumeEntry = { id: string; character: string; character_id?: string; scene: string; scene_id?: string; change: string; status: 'fitting' | 'ready' | 'on-set' | 'cleaning' | 'returned' };

const STATUSES: CostumeEntry['status'][] = ['fitting', 'ready', 'on-set', 'cleaning', 'returned'];

export function CostumeView() {
  const { project, scenes } = useStudio();
  const characters = useCharacters(project.id);
  const { items, save, remove } = useSettingsList('costumes');
  const [draft, setDraft] = useState<Omit<CostumeEntry, 'id'>>({
    character: '',
    character_id: undefined,
    scene: '',
    scene_id: undefined,
    change: '',
    status: 'fitting',
  });
  const [filter, setFilter] = useState<'all' | CostumeEntry['status']>('all');

  const filtered = useMemo(() => (filter === 'all' ? items : items.filter((i) => i.status === filter)), [items, filter]);

  const add = async () => {
    if (!draft.character.trim()) return;
    if (!(await save([...items, { ...draft, id: `cos-${Date.now()}` }]))) return;
    setDraft({ character: '', character_id: undefined, scene: '', scene_id: undefined, change: '', status: 'fitting' });
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
          <CharacterPicker
            characters={characters.rows}
            value={draft.character_id ?? null}
            fallbackText={draft.character}
            onChange={(id, name) => setDraft({ ...draft, character_id: id ?? undefined, character: name ?? '' })}
          />
          <ScenePicker
            scenes={scenes.rows}
            value={draft.scene_id ?? null}
            fallbackText={draft.scene}
            onChange={(id, num) => setDraft({ ...draft, scene_id: id ?? undefined, scene: num != null ? String(num) : '' })}
          />
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
              <span style={{ fontWeight: 600, flex: 1, minWidth: 0 }}>{c.character}</span>
              {c.scene && <span className={s.chip}>Sc {c.scene}</span>}
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
