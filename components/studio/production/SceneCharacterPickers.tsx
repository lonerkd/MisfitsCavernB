'use client';

// The film-graph pickers for the production views that used to take a free-text
// scene or character name. A scene is chosen by its real id (so a camera report
// for "Scene 12" is the same scene as the script's Scene 12), and a character
// by the film graph's character id. The name is kept on the record for display
// and for older entries that predate the link.

import React from 'react';
import type { SceneRow } from '@/lib/studio';
import type { StoryCharacter } from '@/lib/studio/api';
import s from '../studio.module.css';

export interface ScenePickerProps {
  scenes: SceneRow[];
  /** The chosen scene's id, or null. */
  value: string | null;
  onChange: (sceneId: string | null, sceneNumber: number | null) => void;
  /** The current draft's scene text (a number or heading), used to pick the scene when the id is missing. */
  fallbackText?: string;
  label?: string;
  placeholder?: string;
}

/**
 * A scene dropdown: scene number + heading. Picking one sets the id (and the
 * number, for the record's `scene` text). When the draft already has a scene
 * number but no id, the matching scene is offered first.
 */
export function ScenePicker({ scenes, value, onChange, fallbackText, label = 'Scene', placeholder = 'Pick a scene' }: ScenePickerProps) {
  const sorted = [...scenes].sort((a, b) => a.scene_number - b.scene_number);
  const guessed = guessScene(sorted, fallbackText);
  // No scenes yet (a fresh project, or a script with no headings): fall back to
  // the free-text box the view had before, so the first record is still addable.
  if (!sorted.length) {
    return (
      <label className={s.field} style={{ flex: '0 0 120px' }}>
        <span className={s.label}>{label}</span>
        <input className={s.input} value={value ?? fallbackText ?? ''} onChange={(e) => onChange(null, Number(e.target.value) || null)} placeholder="12" />
      </label>
    );
  }
  return (
    <label className={s.field} style={{ flex: '0 0 150px' }}>
      <span className={s.label}>{label}</span>
      <select
        className={s.input}
        value={value ?? (guessed?.id ?? '')}
        onChange={(e) => {
          const sc = sorted.find((x) => x.id === e.target.value) ?? null;
          onChange(sc?.id ?? null, sc?.scene_number ?? null);
        }}
      >
        <option value="">{placeholder}</option>
        {sorted.map((sc) => (
          <option key={sc.id} value={sc.id}>
            {sc.scene_number}. {sc.heading ?? sc.title ?? 'Untitled'}
          </option>
        ))}
      </select>
    </label>
  );
}

/** The scene a draft's free-text `scene` refers to, if one matches. */
function guessScene(scenes: SceneRow[], text?: string): SceneRow | null {
  if (!text) return null;
  const num = Number(text.trim());
  if (Number.isFinite(num)) return scenes.find((sc) => sc.scene_number === num) ?? null;
  const upper = text.trim().toUpperCase();
  return scenes.find((sc) => (sc.heading ?? sc.title ?? '').toUpperCase().includes(upper)) ?? null;
}

export interface CharacterPickerProps {
  characters: StoryCharacter[];
  value: string | null;
  onChange: (characterId: string | null, name: string | null) => void;
  fallbackText?: string;
  label?: string;
  placeholder?: string;
}

/** A character dropdown: the film graph's characters. Same pattern as the scene picker. */
export function CharacterPicker({ characters, value, onChange, fallbackText, label = 'Character', placeholder = 'Pick a character' }: CharacterPickerProps) {
  const sorted = [...characters].sort((a, b) => a.name.localeCompare(b.name));
  const guessed = fallbackText ? sorted.find((c) => c.name.toUpperCase() === fallbackText.trim().toUpperCase()) ?? null : null;
  // No characters yet (a fresh project, or a script with no dialogue): the
  // free-text box, so the first record is still addable.
  if (!sorted.length) {
    return (
      <label className={s.field} style={{ flex: '1 1 160px' }}>
        <span className={s.label}>{label}</span>
        <input className={s.input} value={value ?? fallbackText ?? ''} onChange={(e) => onChange(null, e.target.value)} placeholder="Lead actress" />
      </label>
    );
  }
  return (
    <label className={s.field} style={{ flex: '1 1 160px' }}>
      <span className={s.label}>{label}</span>
      <select
        className={s.input}
        value={value ?? (guessed?.id ?? '')}
        onChange={(e) => {
          const ch = sorted.find((x) => x.id === e.target.value) ?? null;
          onChange(ch?.id ?? null, ch?.name ?? null);
        }}
      >
        <option value="">{placeholder}</option>
        {sorted.map((ch) => (
          <option key={ch.id} value={ch.id}>{ch.name}</option>
        ))}
      </select>
    </label>
  );
}
