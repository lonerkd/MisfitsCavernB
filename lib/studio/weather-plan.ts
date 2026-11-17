// What a day's weather can actually touch: only the exterior scenes scheduled on it. A storm on a day shot wholly
// indoors is not a risk, and a fine day with a night exterior still has its own cold and light to plan for.

export interface DayScene { scene_number: number; heading: string | null; shoot_day: number | null }
export interface DayExposure {
  /** Scene numbers shot outside (EXT. and INT./EXT.) on the day. */
  exterior: number[];
  /** Scene numbers shot inside that day: the cover if the weather turns. */
  interior: number[];
  /** Exteriors at night or dusk. */
  night: number[];
}

const isExterior = (h: string) => /^\s*(?:\d+[A-Z]?\s+)?(EXT\.?|I\/E|INT\.?\/EXT\.?)/i.test(h);
const isNight = (h: string) => /\b(NIGHT|DUSK)\b/i.test(h);

export function dayExposure(scenes: readonly DayScene[], dayNumber: number): DayExposure {
  const out: DayExposure = { exterior: [], interior: [], night: [] };
  for (const sc of scenes) {
    if (sc.shoot_day !== dayNumber) continue;
    const h = sc.heading ?? '';
    if (isExterior(h)) { out.exterior.push(sc.scene_number); if (isNight(h)) out.night.push(sc.scene_number); } else out.interior.push(sc.scene_number);
  }
  for (const k of ['exterior', 'interior', 'night'] as const) out[k].sort((a, b) => a - b);
  return out;
}

/** The sentence under a day's forecast: whether bad weather matters on it, and what to do about it. */
export function weatherAdvice(e: DayExposure, bad: boolean): string {
  const list = (n: number[]) => n.join(', ');
  if (e.exterior.length === 0 && e.interior.length === 0) return 'No scenes are scheduled on this day yet, so the forecast has nothing to affect.';
  if (e.exterior.length === 0) return 'An interior day: the weather does not touch the shoot.';
  if (!bad) return `Exterior scene${e.exterior.length === 1 ? '' : 's'} ${list(e.exterior)}${e.night.length ? ` (night: ${list(e.night)})` : ''}.`;
  return e.interior.length
    ? `Exterior scene${e.exterior.length === 1 ? '' : 's'} ${list(e.exterior)} at risk. Cover: shoot ${list(e.interior)} indoors first and hold the exteriors for a window.`
    : `Exterior scene${e.exterior.length === 1 ? '' : 's'} ${list(e.exterior)} at risk and nothing indoors scheduled that day. Choose an interior as cover, or move the day.`;
}
