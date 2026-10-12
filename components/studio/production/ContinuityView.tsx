'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Eye, PenLine, Wand2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import EmptyState from '@/components/ui/EmptyState';
import { studio, useCharacters, useSceneStates, type SceneRow, type SceneState } from '@/lib/studio';
import { byStoryDay, lookChangeText, lookChanges } from '@/lib/film/continuity';
import { storyChanges, storyLabel, type StoryScene } from '@/lib/film/story';
import { useStudio } from '../StudioContext';
import { cx } from '../ui';
import s from '../studio.module.css';

const PARTS = ['dawn', 'morning', 'day', 'afternoon', 'evening', 'dusk', 'night'];
const castOf = (sc: SceneRow) => (sc.cast_list ?? '').split(',').map((n) => n.trim().toUpperCase()).filter(Boolean);

/**
 * The film in story order: which day of the story each scene is on, and how
 * each character looks in it. The story day and time are read from the script
 * (NEXT MORNING, LATER, a night then a morning) and offered, never forced; what a
 * person sets is kept. A look that changes inside one story day is flagged.
 */
export function ContinuityView() {
  const { project, scenes, scriptId } = useStudio();
  const characters = useCharacters(project.id);
  const states = useSceneStates(project.id);
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const idOf = useMemo(() => new Map(characters.rows.map((c) => [c.name, c.id])), [characters.rows]);
  const nameOf = useMemo(() => new Map(characters.rows.map((c) => [c.id, c.name])), [characters.rows]);
  const stateOf = useMemo(() => new Map(states.rows.map((r) => [`${r.scene_id}:${r.character_id}`, r])), [states.rows]);
  const ordered = useMemo(() => [...scenes.rows].sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0)), [scenes.rows]);
  const guesses = useMemo(() => storyChanges(ordered as StoryScene[] & SceneRow[]), [ordered]);
  const groups = useMemo(() => byStoryDay(ordered), [ordered]);
  const warnings = useMemo(() => lookChanges(ordered, states.rows), [ordered, states.rows]);

  const saveStory = async (sc: SceneRow, story: { story_day: number | null; story_time: string | null }, confirmed: boolean) => {
    try {
      scenes.upsertLocal(await studio.setSceneStory(sc.id, story, confirmed));
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not save the story time', 'error');
    }
  };
  const applyGuesses = async () => {
    setBusy(true);
    try {
      for (const g of guesses) {
        const sc = ordered.find((x) => x.id === g.id)!;
        scenes.upsertLocal(await studio.setSceneStory(sc.id, { story_day: g.story_day, story_time: g.story_time }, false));
      }
      toast(`Story time set on ${guesses.length} ${guesses.length === 1 ? 'scene' : 'scenes'}`, 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not apply the story times', 'error');
    } finally {
      setBusy(false);
    }
  };
  const saveLook = async (sc: SceneRow, characterId: string, look: string, prev: SceneState | undefined) => {
    if ((prev?.look ?? '') === look.trim()) return;
    try {
      states.upsertLocal(await studio.saveSceneState(project.id, sc.id, characterId, { look: look.trim() }));
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not save the look', 'error');
    }
  };

  if (scenes.status !== 'loading' && ordered.length === 0) {
    return (
      <EmptyState icon={<Eye size={26} />} title="No scenes yet" subtitle="Write the script and its scenes appear here in story order."
        action={scriptId ? <Link href={`/editor?script=${scriptId}`} className={s.btnPrimary}><PenLine size={12} /> Open the script</Link> : undefined} />
    );
  }

  return (
    <div className={s.stack}>
      <div className={s.toolbar}>
        <div className={s.panelTitle}>Continuity</div>
        {guesses.length > 0 && (
          <button type="button" className={s.btnPrimary} disabled={busy} onClick={() => void applyGuesses()}>
            <Wand2 size={12} aria-hidden /> Read story time from the script ({guesses.length})
          </button>
        )}
      </div>

      {warnings.length > 0 && (
        <div className={s.panel} role="status">
          <div className={s.panelTitle}>Look changes inside one story day</div>
          {warnings.map((w) => (
            <p key={`${w.character_id}:${w.to.scene}`} className={s.hint} style={{ color: 'var(--limit)' }}>{lookChangeText(nameOf.get(w.character_id) ?? 'Someone', w)}</p>
          ))}
        </div>
      )}

      {groups.map((g) => (
        <section key={g.day ?? 'none'} className={s.panel} aria-label={g.day != null ? `Story day ${g.day}` : 'Scenes with no story day'}>
          <div className={s.panelTitle}>{g.day != null ? `Story day ${g.day}` : 'No story day yet'}</div>
          {g.scenes.map((sc) => (
            <div key={sc.id} className={s.stack} style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 10 }}>
              <div className={s.row}>
                <strong>{sc.scene_number}. {sc.heading ?? sc.title}</strong>
                <span className={s.hint}>{storyLabel(sc.story_day, sc.story_time)}{sc.story_confirmed ? '' : sc.story_day != null ? ' (read from the script)' : ''}</span>
              </div>
              <div className={s.row}>
                <label className={s.stack}>
                  <span className={s.hint}>Story day</span>
                  <input type="number" min={1} className={s.input} style={{ width: 90 }} defaultValue={sc.story_day ?? ''} key={`d${sc.id}${sc.story_day}`}
                    onBlur={(e) => { const v = e.target.value.trim(); const n = v ? Math.max(1, Math.round(Number(v))) : null; if (n !== sc.story_day) void saveStory(sc, { story_day: n, story_time: sc.story_time }, true); }} />
                </label>
                <label className={s.stack}>
                  <span className={s.hint}>Time</span>
                  <select className={cx(s.select)} value={sc.story_time ?? ''} onChange={(e) => void saveStory(sc, { story_day: sc.story_day, story_time: e.target.value || null }, true)}>
                    <option value="">—</option>
                    {PARTS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </label>
              </div>
              {castOf(sc).map((name) => {
                const id = idOf.get(name);
                if (!id) return null;
                const prev = stateOf.get(`${sc.id}:${id}`);
                return (
                  <label key={name} className={s.stack}>
                    <span className={s.hint}>{name}</span>
                    <input className={s.input} placeholder="Look, wardrobe, make-up" maxLength={500} defaultValue={prev?.look ?? ''} key={`${sc.id}${id}${prev?.look ?? ''}`}
                      onBlur={(e) => void saveLook(sc, id, e.target.value, prev)} />
                  </label>
                );
              })}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
