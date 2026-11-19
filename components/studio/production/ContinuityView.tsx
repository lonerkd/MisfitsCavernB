'use client';

import React, { useEffect, useMemo, useState } from 'react';
import EmptyState from '@/components/ui/EmptyState';
import Link from 'next/link';
import { Eye, PenLine, Wand2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { castByScene, castOfScene } from '@/lib/film/cast';
import { studio, useCharacters, useProjectMedia, useSceneCharacters, useSceneStates, useSignedUrls, type SceneRow, type SceneState } from '@/lib/studio';
import { useBreakdown } from '@/lib/breakdown';
import { byStoryDay, lookChangeText, lookChanges } from '@/lib/film/continuity';
import { storyChanges, storyLabel, type StoryScene } from '@/lib/film/story';
import { useStudio } from '../StudioContext';
import { cx } from '../ui';
import { PrintButton } from '@/components/ui/PrintButton';
import { continuityDoc, wardrobeDoc } from '@/lib/studio/continuity-print';
import { ToolHeader } from '../ToolHeader';
import s from '../studio.module.css';

const PARTS = ['dawn', 'morning', 'day', 'afternoon', 'evening', 'dusk', 'night'];

/**
 * The film in story order: which day of the story each scene is on, and how
 * each character looks in it. The story day and time are read from the script
 * (NEXT MORNING, LATER, a night then a morning) and offered, never forced; what a
 * person sets is kept. A look that changes inside one story day is flagged.
 */
export function ContinuityView() {
  const { project, scenes, scriptId, doubtfulSceneOrdinals } = useStudio();
  const characters = useCharacters(project.id);
  const states = useSceneStates(project.id);
  const links = useSceneCharacters(project.id);
  const castByScn = useMemo(() => castByScene(links.rows, characters.rows), [links.rows, characters.rows]);
  const castOf = (sc: SceneRow) => castOfScene(sc, castByScn);
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const library = useProjectMedia(project.id);
  const bd = useBreakdown(project.id);
  const photos = useMemo(() => library.rows.filter((m) => m.kind === 'image'), [library.rows]);
  const photoUrls = useSignedUrls(photos.map((m) => m.storage_path));
  // The elements each look is made of (wardrobe, make-up, props): loaded once, kept in step by this view's own changes.
  const [stateElements, setStateElements] = useState<Array<{ state_id: string; element_id: string }>>([]);
  useEffect(() => {
    let alive = true;
    studio.listStateElements(project.id).then((rows) => { if (alive) setStateElements(rows); }, () => undefined);
    return () => { alive = false; };
  }, [project.id]);
  const lookElements = useMemo(() => {
    const keep = new Set(bd.categories.rows.filter((c) => ['wardrobe', 'makeup', 'props'].includes(c.key)).map((c) => c.id));
    return bd.elements.rows.filter((e) => keep.has(e.category_id));
  }, [bd.categories.rows, bd.elements.rows]);

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

  const setPhoto = async (sc: SceneRow, characterId: string, prev: SceneState | undefined, mediaId: string) => {
    try {
      if (!prev) await studio.ensureSceneState(project.id, sc.id, characterId);
      states.upsertLocal(await studio.saveSceneState(project.id, sc.id, characterId, { media_id: mediaId || null }));
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not save the photo', 'error');
    }
  };
  const toggleElement = async (sc: SceneRow, characterId: string, prev: SceneState | undefined, elementId: string, on: boolean) => {
    try {
      const state = prev ?? await studio.ensureSceneState(project.id, sc.id, characterId);
      if (!prev) states.upsertLocal(state);
      await studio.setStateElement(project.id, state.id, elementId, on);
      setStateElements((rows) => on ? [...rows, { state_id: state.id, element_id: elementId }] : rows.filter((r) => !(r.state_id === state.id && r.element_id === elementId)));
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not change the look’s elements', 'error');
    }
  };

  if (scenes.status !== 'loading' && ordered.length === 0) {
    return (
      <EmptyState icon={<Eye size={26} />} title="No scenes yet" subtitle="Write the script and its scenes appear here in story order."
        action={scriptId ? <Link href={`/editor?script=${scriptId}`} className={s.btnPrimary}><PenLine size={12} /> Open the script</Link> : undefined} />
    );
  }

  const loadError = states.error ?? characters.error;
  return (
    <div className={s.stack}>
      {loadError && (
        <div className={s.panel} role="alert">
          <div className={s.panelTitle}>Continuity could not load</div>
          <p className={s.hint}>{loadError}</p>
        </div>
      )}
      <ToolHeader icon={<Eye size={16} />} eyebrow="Story & planning" title="Continuity" purpose="Scenes by story day, with each character's look and the changes to check." accent={project.accent_color}
        progress={null} stats={warnings.length ? [{ label: 'look changes to check', value: warnings.length }] : []}
        actions={<><PrintButton label="the continuity sheet" build={() => continuityDoc({
          project: project.title, accent: project.accent_color, logo: project.logo_url,
          warnings: warnings.map((w) => lookChangeText(nameOf.get(w.character_id) ?? 'Someone', w)),
          days: groups.map((g) => ({
            label: g.day != null ? `Story day ${g.day}` : 'No story day yet',
            scenes: g.scenes.map((sc) => ({
              number: sc.scene_number, heading: sc.heading ?? sc.title ?? '', time: sc.story_time ?? '',
              looks: castOf(sc).map((name) => { const id = idOf.get(name); return { character: name, look: (id ? stateOf.get(`${sc.id}:${id}`)?.look : '') ?? '' }; }),
            })),
          })),
          generated: new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }),
        })} />
        <PrintButton label="the wardrobe and make-up sheet" build={() => wardrobeDoc({
          project: project.title, accent: project.accent_color, logo: project.logo_url,
          characters: characters.rows.map((ch) => ({
            name: ch.name,
            rows: ordered.filter((sc) => castOf(sc).includes(ch.name)).map((sc) => ({
              number: sc.scene_number, heading: sc.heading ?? sc.title ?? '', storyDay: sc.story_day, shootDay: sc.shoot_day ?? null,
              look: stateOf.get(`${sc.id}:${ch.id}`)?.look ?? '',
              elements: stateElements.filter((r) => r.state_id === stateOf.get(`${sc.id}:${ch.id}`)?.id).map((r) => lookElements.find((e) => e.id === r.element_id)?.name).filter((n): n is string => !!n),
            })),
          })),
          generated: new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }),
        })} />
        {guesses.length > 0 && (
          <button type="button" className={s.btnPrimary} disabled={busy} onClick={() => void applyGuesses()}>
            <Wand2 size={12} aria-hidden /> Read story time from the script ({guesses.length})
          </button>
        )}</>} />

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
                                <span className={s.hint}>{sc.shoot_day != null ? `Shoots day ${sc.shoot_day}` : 'Not scheduled'}</span>
                                {doubtfulSceneOrdinals.has(sc.ordinal ?? -1) && <span className={s.hint} style={{ color: 'var(--warn)' }}>⚠ review</span>}
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
                const mine = prev ? stateElements.filter((r) => r.state_id === prev.id).map((r) => lookElements.find((e) => e.id === r.element_id)).filter((e): e is NonNullable<typeof e> => !!e) : [];
                const photo = prev?.media_id ? photos.find((m) => m.id === prev.media_id) : undefined;
                const photoSrc = photo?.storage_path ? photoUrls[photo.storage_path] : photo?.external_url ?? undefined;
                return (
                  <div key={name} className={s.stack}>
                    <label className={s.stack}>
                      <span className={s.hint}>{name}</span>
                      <input className={s.input} placeholder="Look, wardrobe, make-up" maxLength={500} defaultValue={prev?.look ?? ''} key={`${sc.id}${id}${prev?.look ?? ''}`}
                        onBlur={(e) => void saveLook(sc, id, e.target.value, prev)} />
                    </label>
                    <div className={s.row} style={{ alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      {photoSrc && <img src={photoSrc} alt={`Reference for ${name}: ${photo?.title ?? 'photo'}`} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 8 }} />}
                      <label className={s.stack}>
                        <span className="sr-only">Photo for {name} in scene {sc.scene_number}</span>
                        <select className={s.select} value={prev?.media_id ?? ''} onChange={(e) => void setPhoto(sc, id, prev, e.target.value)}>
                          <option value="">No photo</option>
                          {photos.map((m) => <option key={m.id} value={m.id}>{m.title || 'Untitled photo'}</option>)}
                        </select>
                      </label>
                      {mine.map((e) => (
                        <span key={e.id} className={s.chip}>
                          {e.name}
                          <button type="button" aria-label={`Remove ${e.name} from ${name}’s look`} className={s.btnGhost} onClick={() => void toggleElement(sc, id, prev, e.id, false)}>×</button>
                        </span>
                      ))}
                      <label className={s.stack}>
                        <span className="sr-only">Add an element to {name}’s look in scene {sc.scene_number}</span>
                        <select className={s.select} value="" onChange={(e) => { if (e.target.value) void toggleElement(sc, id, prev, e.target.value, true); }}>
                          <option value="">Add wardrobe, make-up or prop…</option>
                          {lookElements.filter((e) => !mine.some((m) => m.id === e.id)).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
