'use client';

import React, { useState } from 'react';
import { Palette, Plus, Trash2 } from 'lucide-react';
import { useSettingsList } from './useSettingsList';
import { ScenePicker, CharacterPicker } from './SceneCharacterPickers';
import { useStudio } from '../StudioContext';
import { useCharacters } from '@/lib/studio';
import s from '../studio.module.css';

type MakeupEntry = { id: string; character: string; character_id?: string; scene: string; scene_id?: string; look: string; artist: string; notes: string; photo: string };

export function MakeupView() {
  const { project, scenes } = useStudio();
  const characters = useCharacters(project.id);
  const { items, save, remove } = useSettingsList('makeup');
  const [draft, setDraft] = useState<Omit<MakeupEntry, 'id'>>({
    character: '',
    character_id: undefined,
    scene: '',
    scene_id: undefined,
    look: '',
    artist: '',
    notes: '',
    photo: '',
  });

  const add = async () => {
    if (!draft.character.trim()) return;
    if (!(await save([...items, { ...draft, id: `mk-${Date.now()}` }]))) return;
    setDraft({ character: '', character_id: undefined, scene: '', scene_id: undefined, look: '', artist: '', notes: '', photo: '' });
  };

  return (
    <div className={s.stack} style={{ gap: 24, maxWidth: 900 }}>
      <div className={s.toolbar}>
        <div className={s.panelTitle} style={{ marginBottom: 0 }}>
          <Palette size={14} /> Makeup / hair
          <span className={s.hint}> · {items.length} looks</span>
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
          <label className={s.field} style={{ flex: '1 1 160px' }}>
            <span className={s.label}>Look</span>
            <input className={s.input} value={draft.look} onChange={(e) => setDraft({ ...draft, look: e.target.value })} placeholder="Natural, no lipstick" />
          </label>
          <label className={s.field} style={{ flex: '1 1 140px' }}>
            <span className={s.label}>Artist</span>
            <input className={s.input} value={draft.artist} onChange={(e) => setDraft({ ...draft, artist: e.target.value })} placeholder="Name" />
          </label>
          <label className={s.field} style={{ flex: '1 1 160px' }}>
            <span className={s.label}>Photo (URL)</span>
            <input className={s.input} value={draft.photo} onChange={(e) => setDraft({ ...draft, photo: e.target.value })} placeholder="image link" />
          </label>
          <button className={s.btnPrimary} onClick={add} disabled={!draft.character.trim()}>
            <Plus size={12} /> Add
          </button>
        </div>
        <label className={s.field} style={{ marginTop: 8 }}>
          <span className={s.label}>Notes</span>
          <textarea className={s.textarea} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} rows={2} />
        </label>
      </div>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((m) => (
          <li key={m.id} className={s.panel} style={{ padding: 12 }}>
            <div className={s.row} style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, flex: 1, minWidth: 0 }}>{m.character}</span>
              {m.scene && <span className={s.chip}>Sc {m.scene}</span>}
              {m.look && <span className={s.hint}>{m.look}</span>}
              {m.artist && <span className={s.hint}>{m.artist}</span>}
              <button className={s.btn} onClick={() => remove(m.id)} title="Delete">
                <Trash2 size={12} />
              </button>
            </div>
            {m.notes && <p className={s.hint} style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{m.notes}</p>}
            {m.photo && (m.photo.startsWith('http://') || m.photo.startsWith('https://')) && <p className={s.hint} style={{ marginTop: 4, fontSize: 11 }}><a href={m.photo} target="_blank" rel="noreferrer">{m.photo}</a></p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
