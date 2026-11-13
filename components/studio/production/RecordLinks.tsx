'use client';

// The scene and character fields of the role tools. A record links to real scenes and characters of the project (chosen from
// the project's own, so a renumbered scene or a renamed character follows); "Other…" lets a person name a scene that is not
// written yet, which stays a label with no link (shoot notes often come before the script).
import React, { useCallback, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useProjectScenes, useCharacters } from '@/lib/studio';
import { characterName, sceneLabelFor, sceneOption, scenesWithoutCharacter, type LinkableScene } from '@/lib/studio/record-links';
import { useStudio } from '../StudioContext';
import s from '../studio.module.css';

const OTHER = '__other__';

/** The project's scenes and characters, keyed by id, for a view to resolve its records' links. */
export function useRecordTargets() {
  const { project, castOf } = useStudio();
  const scenes = useProjectScenes(project.id);
  const characters = useCharacters(project.id);
  const sceneById = useMemo(() => new Map<string, LinkableScene>(scenes.rows.map((r) => [r.id, r])), [scenes.rows]);
  const characterById = useMemo(() => new Map(characters.rows.map((c) => [c.id, c])), [characters.rows]);
  /** Who is in a scene (upper-case names, from the film graph); empty when nothing says yet. */
  const castFor = useCallback((sceneId: string) => {
    const scene = scenes.rows.find((r) => r.id === sceneId);
    return scene && castOf ? castOf(scene) : [];
  }, [scenes.rows, castOf]);
  return { scenes: scenes.rows, sceneById, characters: characters.rows, characterById, castFor };
}

type Targets = ReturnType<typeof useRecordTargets>;

/** A look planned for a scene its character is not in: a note under the record (a report, never a change). */
export function NotInSceneNote({ record, t }: { record: { scene_ids?: string[]; character_id?: string | null; character?: string }; t: Targets }) {
  const off = scenesWithoutCharacter(record, t.sceneById, t.characterById, t.castFor);
  if (off.length === 0) return null;
  const who = characterName(record, t.characterById);
  return (
    <p className={s.hint} role="note" style={{ marginTop: 4, color: 'var(--warn)' }}>
      {who} is not in scene{off.length > 1 ? 's' : ''} {off.join(', ')}. Check the look is for the right scene.
    </p>
  );
}

interface SceneFieldProps {
  label?: string;
  scenes: LinkableScene[];
  sceneById: ReadonlyMap<string, LinkableScene>;
  ids: string[];
  text: string;
  onChange: (next: { ids: string[]; text: string }) => void;
  placeholder?: string;
}

export function SceneLinkField({ label = 'Scene', scenes, sceneById, ids, text, onChange, placeholder = '12' }: SceneFieldProps) {
  const [other, setOther] = useState(false);
  const free = other || (ids.length === 0 && text.trim() !== '');
  const available = scenes.filter((sc) => !ids.includes(sc.id));
  const link = (next: string[]) => onChange({ ids: next, text: sceneLabelFor(next, sceneById) });

  return (
    <div className={s.field} style={{ flex: '1 1 160px' }}>
      <span className={s.label}>{label}</span>
      {ids.length > 0 && (
        <div className={s.chips} style={{ marginBottom: 4 }}>
          {ids.map((id) => {
            const sc = sceneById.get(id);
            return (
              <span key={id} className={s.chip}>
                Sc {sc ? sc.scene_number : '?'}
                <button type="button" className={s.iconBtn} aria-label={`Unlink scene ${sc ? sc.scene_number : ''}`} onClick={() => link(ids.filter((x) => x !== id))} style={{ marginLeft: 4 }}>
                  <X size={10} />
                </button>
              </span>
            );
          })}
        </div>
      )}
      {!free && (
        <select
          className={s.input}
          aria-label={`${label}: add a scene`}
          value=""
          onChange={(e) => {
            if (e.target.value === OTHER) { setOther(true); onChange({ ids: [], text: '' }); return; }
            if (e.target.value) link([...ids, e.target.value]);
          }}
        >
          <option value="">{ids.length ? 'Add another scene…' : 'Choose a scene…'}</option>
          {available.map((sc) => <option key={sc.id} value={sc.id}>{sceneOption(sc)}</option>)}
          {ids.length === 0 && <option value={OTHER}>Other (not written yet)…</option>}
        </select>
      )}
      {free && (
        <div className={s.row} style={{ gap: 6 }}>
          <input className={s.input} aria-label={`${label} (typed)`} value={text} onChange={(e) => onChange({ ids: [], text: e.target.value })} placeholder={placeholder} />
          <button type="button" className={s.btn} onClick={() => { setOther(false); onChange({ ids: [], text: '' }); }}>Pick</button>
        </div>
      )}
    </div>
  );
}

interface CharacterFieldProps {
  characters: Array<{ id: string; name: string }>;
  id: string | null | undefined;
  text: string;
  onChange: (next: { id: string | null; text: string }) => void;
  placeholder?: string;
}

export function CharacterLinkField({ characters, id, text, onChange, placeholder = 'Lead actress' }: CharacterFieldProps) {
  const [other, setOther] = useState(false);
  const free = other || (!id && text.trim() !== '') || characters.length === 0;
  if (free) {
    return (
      <label className={s.field} style={{ flex: '1 1 160px' }}>
        <span className={s.label}>Character</span>
        <div className={s.row} style={{ gap: 6 }}>
          <input className={s.input} value={text} onChange={(e) => onChange({ id: null, text: e.target.value })} placeholder={placeholder} />
          {characters.length > 0 && <button type="button" className={s.btn} onClick={() => { setOther(false); onChange({ id: null, text: '' }); }}>Pick</button>}
        </div>
      </label>
    );
  }
  return (
    <label className={s.field} style={{ flex: '1 1 160px' }}>
      <span className={s.label}>Character</span>
      <select
        className={s.input}
        value={id ?? ''}
        onChange={(e) => {
          if (e.target.value === OTHER) { setOther(true); onChange({ id: null, text: '' }); return; }
          const c = characters.find((x) => x.id === e.target.value);
          onChange({ id: c?.id ?? null, text: c?.name ?? '' });
        }}
      >
        <option value="">Choose a character…</option>
        {characters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        <option value={OTHER}>Other…</option>
      </select>
    </label>
  );
}
