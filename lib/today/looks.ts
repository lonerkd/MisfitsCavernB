// The wardrobe and make-up person's day at a glance (BACKLOG 3.18, graph step 6): for the next shoot day, each scene's characters with the
// look noted for them, the looks nobody has written down yet, and the look changes inside a story day that touch the day. Pure: the loader
// supplies the rows it read (through RLS); the card and the tests read the same function. It only reports what the suite holds.

import { daysUntil } from './core';
import { lookChangeText, lookChanges, lookChangesOnDay } from '@/lib/film/continuity';

/** Crafts whose working day is the looks: they see this card on Your day. */
export const LOOK_CRAFTS = ['Costume designer', 'Wardrobe assistant', 'Hair stylist', 'Makeup artist'] as const;
export const isLookCraft = (craft: string | null | undefined): boolean => (LOOK_CRAFTS as readonly string[]).includes(craft ?? '');

export interface LookScene { id: string; scene_number: number; title: string; story_day: number | null; shoot_day: number | null }
export interface LookDayInput {
  today: string;
  day: { day_number: number; shoot_date: string | null };
  /** Every scene of the project (the changes are read across the whole story, not just this day). */
  scenes: LookScene[];
  characters: Array<{ id: string; name: string }>;
  sceneCharacters: Array<{ scene_id: string; character_id: string }>;
  states: Array<{ scene_id: string; character_id: string; look: string }>;
}

export interface LookDayScene { id: string; scene_number: number; title: string; looks: Array<{ character: string; look: string }> }
export interface LookDay {
  day: number;
  date: string | null;
  inDays: number | null;
  scenes: LookDayScene[];
  /** What needs the wardrobe and make-up team before the day, most urgent first. Empty when nothing does. */
  attention: string[];
}

export function lookDay(i: LookDayInput): LookDay {
  const nameOf = new Map(i.characters.map((c) => [c.id, c.name]));
  const looks = new Map(i.states.map((s) => [`${s.scene_id}:${s.character_id}`, s.look.trim()]));
  const dayScenes = i.scenes.filter((s) => (s.shoot_day ?? 1) === i.day.day_number).sort((a, b) => a.scene_number - b.scene_number);
  const scenes: LookDayScene[] = dayScenes.map((s) => ({
    id: s.id, scene_number: s.scene_number, title: s.title,
    looks: i.sceneCharacters.filter((l) => l.scene_id === s.id).map((l) => ({ character: nameOf.get(l.character_id) ?? 'Someone', look: looks.get(`${s.id}:${l.character_id}`) ?? '' }))
      .sort((a, b) => a.character.localeCompare(b.character)),
  }));
  const inDays = i.day.shoot_date ? daysUntil(i.day.shoot_date, i.today) : null;
  const attention: string[] = [];
  if (scenes.length === 0) attention.push('Nothing is scheduled on this day yet');
  const missing = scenes.reduce((n, s) => n + s.looks.filter((l) => !l.look).length, 0);
  if (missing) attention.push(`${missing} ${missing === 1 ? 'look is' : 'looks are'} not written down yet`);
  const changes = lookChangesOnDay(lookChanges(i.scenes, i.states), dayScenes);
  for (const c of changes) attention.push(`Look change: ${lookChangeText(nameOf.get(c.character_id) ?? 'Someone', c)}`);
  return { day: i.day.day_number, date: i.day.shoot_date, inDays, scenes, attention };
}
