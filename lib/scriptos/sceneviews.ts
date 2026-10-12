// The editor's views of its scenes as pure functions: where each heading sits
// in the text, moving a scene, the quick filters, and per-scene counts. The
// editor page passes in its parsed lines and text.

import type { ScriptLine } from './types';

export type SceneFilter = 'all' | 'int' | 'ext' | 'day' | 'night';

/** The character offset of each scene heading in the text, in order; -1 for one that cannot be found. */
export function scenePositions(headings: ScriptLine[], content: string): number[] {
  const upper = content.toUpperCase();
  let cursor = 0;
  const positions: number[] = [];
  for (const s of headings) {
    const idx = upper.indexOf(s.text.toUpperCase(), cursor);
    if (idx < 0) { positions.push(-1); continue; }
    positions.push(idx);
    cursor = idx + s.text.length;
  }
  return positions;
}

/** Move scene `from` to position `to`; null when there is nothing to do or a heading's place is unknown. */
export function reorderScenes(content: string, positions: number[], from: number, to: number): string | null {
  if (from === to || from < 0 || to < 0) return null;
  if (!positions.length || positions.some((p) => p < 0)) return null;
  if (from >= positions.length || to >= positions.length) return null;
  const preamble = content.substring(0, positions[0]);
  const blocks = positions.map((p, k) => content.substring(p, k + 1 < positions.length ? positions[k + 1] : content.length));
  const [moved] = blocks.splice(from, 1);
  blocks.splice(to, 0, moved);
  return preamble + blocks.join('');
}

export function filterScenes<T extends { text: string }>(headings: T[], filter: SceneFilter): T[] {
  if (filter === 'all') return headings;
  const word = { int: 'INT', ext: 'EXT', day: 'DAY', night: 'NIGHT' }[filter];
  return headings.filter((s) => s.text.toUpperCase().includes(word));
}

/** For each heading: the lines up to the next heading. */
function sceneSlices(lines: ScriptLine[], headings: ScriptLine[]): ScriptLine[][] {
  const at = new Map(lines.map((l, i) => [l.id, i]));
  return headings.map((h, i) => {
    const start = at.get(h.id) ?? -1;
    const next = i + 1 < headings.length ? at.get(headings[i + 1].id) ?? -1 : lines.length;
    return lines.slice(start, next);
  });
}

export function sceneWordCounts(lines: ScriptLine[], headings: ScriptLine[]): number[] {
  return sceneSlices(lines, headings).map((slice) => slice.reduce((sum, l) => sum + l.text.split(/\s+/).filter(Boolean).length, 0));
}

/** For each heading: the distinct names that speak in the scene. */
export function sceneCharacters(lines: ScriptLine[], headings: ScriptLine[]): string[][] {
  return sceneSlices(lines, headings).map((slice) => [...new Set(slice.filter((l) => l.type === 'character').map((l) => l.text.trim()))]);
}
