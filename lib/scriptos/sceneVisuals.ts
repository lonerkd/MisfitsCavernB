import type { ScriptLine } from '@/types/screenplay';

export const CARD_COLORS = ['#d7340b', '#0099ff', '#00cc66', '#ff6b9d', '#ffd43b', '#a855f7', '#f97316', '#06b6d4'];

export function getSceneType(scene: ScriptLine) {
  const u = scene.text.toUpperCase();
  return {
    isInt:   u.startsWith('INT'),
    isExt:   u.startsWith('EXT'),
    isDay:   u.includes('DAY')   || u.includes('MORNING') || u.includes('AFTERNOON'),
    isNight: u.includes('NIGHT') || u.includes('DUSK')    || u.includes('DAWN'),
  };
}

export function sceneTypeColor(scene: ScriptLine): string {
  const { isInt, isExt, isDay, isNight } = getSceneType(scene);
  if (isInt  && isDay)   return '#6366f1';
  if (isInt  && isNight) return '#4338ca';
  if (isExt  && isDay)   return '#d97706';
  if (isExt  && isNight) return '#92400e';
  if (isInt)             return '#7c3aed';
  if (isExt)             return '#b45309';
  return '#4b5563';
}
