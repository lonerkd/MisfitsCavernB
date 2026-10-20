// How the script's findings are put to a person. The reading itself —
// scanScript, wordPattern and the evidence extractors — lives in ./parsers;
// the names are re-exported here so existing imports keep working.

export { scanScript, wordPattern, type Detect, type Evidence } from './parsers';

/** "scene 3", "scenes 3 and 7", "scenes 2, 5, 9 and 4 more". */
export function sceneList(scenes: number[]): string {
  if (scenes.length === 1) return `scene ${scenes[0]}`;
  const shown = scenes.slice(0, 3);
  const more = scenes.length - shown.length;
  if (more > 0) return `scenes ${shown.join(', ')} and ${more} more`;
  return `scenes ${shown.slice(0, -1).join(', ')} and ${shown[shown.length - 1]}`;
}
