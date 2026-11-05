// Cross-cutting: which scenes in a parsed script carry doubtful reads.
// Used by the editor (DoubtfulReads) and the Studio (scene lists, breakdown,
// shots) to flag scenes whose read the person should look at.

import type { ScriptLine } from './types';

export interface SceneDoubt {
  /** Scene ordinal (0-based, matching the scenes array). */
  ordinal: number;
  /** How many doubtful lines fall in this scene. */
  count: number;
  /** The lowest confidence among them. */
  minConfidence: number;
}

/**
 * Given parsed lines (with confidence + reasoning), return the scenes that
 * contain doubtful reads. A scene is "doubtful" when at least one of its lines
 * is below the confidence threshold.
 */
export function doubtfulScenes(lines: ScriptLine[], below = 75): SceneDoubt[] {
  // First, find which line indices are doubtful.
  const doubtfulIndices = new Set<number>();
  for (const l of lines) {
    if (!/Decoded as/.test(l.reasoning ?? '')) continue;
    if (l.confidence >= below) continue;
    doubtfulIndices.add(l.index);
  }
  if (!doubtfulIndices.size) return [];

  // Walk lines, tracking scene ordinals (a slug starts a new scene).
  const result: SceneDoubt[] = [];
  let ordinal = -1;
  let current: SceneDoubt | null = null;
  for (const l of lines) {
    if (l.type === 'slug') {
      if (current && current.count > 0) result.push(current);
      ordinal++;
      current = { ordinal, count: 0, minConfidence: 100 };
    }
    if (current && doubtfulIndices.has(l.index)) {
      current.count++;
      if (l.confidence < current.minConfidence) current.minConfidence = l.confidence;
    }
  }
  if (current && current.count > 0) result.push(current);
  return result;
}