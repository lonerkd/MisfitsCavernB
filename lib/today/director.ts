// The director's day at a glance: for the next shoot day of a production, which scenes it holds, what is planned for each,
// who has the call sheet, and what still needs the director. Pure: the loader supplies the rows it read (through RLS), and the
// card and the tests read the same function. Nothing here is guessed: a thing the suite does not know is not reported.

import { daysUntil } from './core';

/** Crafts whose working day is the director's: they see the day at a glance on Your day. */
export const DIRECTION_CRAFTS = ['Director', 'First assistant director', 'Second assistant director'] as const;
export const isDirectionCraft = (craft: string | null | undefined): boolean => (DIRECTION_CRAFTS as readonly string[]).includes(craft ?? '');

/** The camera department's day is the same page: the scenes, their places and times of day, the shots planned, what is still missing. */
export const CAMERA_CRAFTS = ['Director of photography', 'Cinematographer', 'Camera operator', 'First assistant camera', 'Second assistant camera', 'Steadicam operator', 'DIT'] as const;
export const isCameraCraft = (craft: string | null | undefined): boolean => (CAMERA_CRAFTS as readonly string[]).includes(craft ?? '');

/** Whose Your day carries "the day at a glance": direction and camera. */
export const seesDayAtAGlance = (craft: string | null | undefined): boolean => isDirectionCraft(craft) || isCameraCraft(craft);

export interface GlanceScene {
  id: string; scene_number: number; title: string; time_of_day: string | null; location: string | null; cast: string[]; status: string | null;
}
export interface GlanceSheet { issued_at: string | null; general_call: string | null; location_address: string | null; weather: string | null }
export interface GlanceInput {
  today: string;
  day: { day_number: number; shoot_date: string | null };
  scenes: GlanceScene[];
  /** How many shots are planned for each scene id. */
  shotsByScene: Record<string, number>;
  sheet: GlanceSheet | null;
  /** Confirmed crew with a call to acknowledge, and how many of them have acknowledged this call sheet. */
  crew: number;
  acked: number;
}

export interface GlanceScene2 extends GlanceScene { shots: number; cast: string[]; flags: string[] }
export interface DayGlance {
  day: number;
  date: string | null;
  /** Whole days from today (0 = today); null when the day has no date. */
  inDays: number | null;
  scenes: GlanceScene2[];
  shots: number;
  /** What needs the director before the day, most urgent first. Empty when nothing does. */
  attention: string[];
  sheet: GlanceSheet | null;
}

export function dayGlance(i: GlanceInput): DayGlance {
  const inDays = i.day.shoot_date ? daysUntil(i.day.shoot_date, i.today) : null;
  const scenes = [...i.scenes].sort((a, b) => a.scene_number - b.scene_number).map((s): GlanceScene2 => {
    const shots = i.shotsByScene[s.id] ?? 0;
    const flags: string[] = [];
    if (shots === 0) flags.push('No shots planned');
    if (!s.location?.trim()) flags.push('No location');
    if (s.cast.length === 0) flags.push('No cast listed');
    return { ...s, shots, flags };
  });
  const attention: string[] = [];
  const soon = inDays !== null && inDays <= 7;
  if (scenes.length === 0) attention.push('Nothing is scheduled on this day yet');
  if (!i.sheet?.issued_at && soon) attention.push(inDays === 0 ? 'The call sheet has not been issued, and today is the day' : 'The call sheet has not been issued');
  const unplanned = scenes.filter((s) => s.shots === 0).length;
  if (unplanned) attention.push(`${unplanned} of ${scenes.length} scene${scenes.length === 1 ? '' : 's'} ${unplanned === 1 ? 'has' : 'have'} no shots planned`);
  if (i.sheet?.issued_at && i.crew > 0 && i.acked < i.crew) attention.push(`${i.crew - i.acked} of ${i.crew} have not acknowledged the call sheet`);
  return {
    day: i.day.day_number, date: i.day.shoot_date, inDays, scenes,
    shots: scenes.reduce((n, s) => n + s.shots, 0), attention, sheet: i.sheet,
  };
}
