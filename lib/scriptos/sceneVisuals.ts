import type { ScriptLine } from '@/types/screenplay';

// Board card colors (cycle through a palette) — shared by the Board, Outline,
// and Stats views so scene tags/colors stay visually consistent across tabs.
export const CARD_COLORS = ['#ff3c00', '#0099ff', '#00cc66', '#ff6b9d', '#ffd43b', '#a855f7', '#f97316', '#06b6d4'];

// Scene type classifier — encodes the actual spatial/temporal context of a scene
export function getSceneType(scene: ScriptLine) {
  const u = scene.text.toUpperCase();
  return {
    isInt:   u.startsWith('INT'),
    isExt:   u.startsWith('EXT'),
    isDay:   u.includes('DAY')   || u.includes('MORNING') || u.includes('AFTERNOON'),
    isNight: u.includes('NIGHT') || u.includes('DUSK')    || u.includes('DAWN'),
  };
}

// Scene type → visual color
export function sceneTypeColor(scene: ScriptLine): string {
  const { isInt, isExt, isDay, isNight } = getSceneType(scene);
  if (isInt  && isDay)   return '#6366f1';   // INT/DAY  — indigo
  if (isInt  && isNight) return '#4338ca';   // INT/NIGHT — deep indigo
  if (isExt  && isDay)   return '#d97706';   // EXT/DAY  — amber
  if (isExt  && isNight) return '#92400e';   // EXT/NIGHT — dark amber
  if (isInt)             return '#7c3aed';   // INT/? — violet
  if (isExt)             return '#b45309';   // EXT/? — warm brown
  return '#4b5563';                           // unknown  — slate
}
