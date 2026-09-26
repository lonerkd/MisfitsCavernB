// Keeps a script's scene index (public.scenes) aligned with its text.
//
// Media, notes and schedule data hang off scene ids, so a scene must keep its
// id while the screenplay around it changes: new scenes inserted before it,
// scenes reordered or deleted, its own heading edited. planSceneSync() works
// out that mapping as a pure function; sync_script_scenes() applies it
// atomically on the server (see supabase/migrations/*_studio_media.sql).
//
// Alignment, in order:
//   1. Longest common subsequence on normalised headings — unchanged scenes
//      keep their ids even when others are inserted or removed around them.
//   2. Inside each gap between matched scenes, old and new scenes are paired in
//      order by heading similarity — an edited heading keeps its id.
//   3. Anything still new reuses a previously removed scene with the same
//      heading — cutting a scene and pasting it back restores its links.
//   4. Everything else gets a fresh id; unmatched old scenes are removed
//      (kept on the server with removed_at, never deleted).

import type { Json } from '@/lib/supabase/database.types';

export interface SceneElementsInput {
  props?: string[];
  wardrobe?: string[];
  vehicles?: string[];
  sfx?: string[];
  vfx?: string[];
}

/** The parts of a parsed scene (lib/scriptos/parser) the index stores. */
export interface ParsedSceneInput {
  heading: string;
  location?: string;
  timeOfDay?: string;
  characters?: string[];
  eighths?: number;
  elements?: SceneElementsInput;
}

/** A scene row as read from public.scenes for one script. */
export interface IndexedScene {
  id: string;
  heading: string | null;
  ordinal: number | null;
  removed_at: string | null;
  location?: string | null;
  time_of_day?: string | null;
  cast_list?: string | null;
  est_duration?: string | null;
  elements?: Json;
}

/** One entry of the plan sent to sync_script_scenes, in script order. */
export interface ScenePlanRow {
  id: string;
  heading: string;
  location: string | null;
  time_of_day: string;
  cast_list: string | null;
  est_duration: string;
  elements: SceneElementsInput;
}

export interface ScenePlan {
  /** Active scene ids (by ordinal) the plan was computed from. */
  baseIds: string[];
  scenes: ScenePlanRow[];
  /** False when applying the plan would change nothing — skip the round trip. */
  changed: boolean;
}

const MAX_HEADING = 300;

export function normalizeHeading(heading: string | null | undefined): string {
  return String(heading ?? '')
    .replace(/#[\w.-]+#\s*$/, '')
    .replace(/^\.\s*/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

/** The exact row the server will store for a parsed scene at `index`. */
export function toPlanRow(id: string, scene: ParsedSceneInput, index: number): ScenePlanRow {
  const heading = (scene.heading || '').trim().slice(0, MAX_HEADING) || `Scene ${index + 1}`;
  const tod = (scene.timeOfDay || '').trim();
  const cast = (scene.characters || []).filter(Boolean).join(', ');
  return {
    id,
    heading,
    location: scene.location?.trim() || null,
    time_of_day: tod && tod !== 'UNKNOWN' ? tod : 'DAY',
    cast_list: cast || null,
    est_duration: `${Math.max(1, scene.eighths || 1)}/8 pg`,
    elements: scene.elements ?? {},
  };
}

function tokens(heading: string): Set<string> {
  return new Set(heading.split(/[^A-Z0-9']+/).filter((t) => t.length > 1));
}

/** Dice coefficient over heading words, 0..1. */
export function headingSimilarity(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size === 0 && tb.size === 0) return a === b ? 1 : 0;
  let shared = 0;
  ta.forEach((t) => { if (tb.has(t)) shared++; });
  return (2 * shared) / (ta.size + tb.size);
}

/** Index pairs (i into a, j into b) of a longest common subsequence. */
function lcsPairs(a: string[], b: string[]): Array<[number, number]> {
  const n = a.length;
  const m = b.length;
  const w = m + 1;
  const dp = new Uint32Array((n + 1) * w);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i * w + j] = a[i] === b[j] ? dp[(i + 1) * w + j + 1] + 1 : Math.max(dp[(i + 1) * w + j], dp[i * w + j + 1]);
    }
  }
  const pairs: Array<[number, number]> = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { pairs.push([i, j]); i++; j++; }
    else if (dp[(i + 1) * w + j] >= dp[i * w + j + 1]) i++;
    else j++;
  }
  return pairs;
}

/**
 * Order-preserving pairing inside a gap that pairs as many scenes as possible
 * (min of both sides) and, among those, maximises heading similarity.
 */
function pairGap(oldH: string[], newH: string[]): Array<[number, number]> {
  const n = oldH.length;
  const m = newH.length;
  if (n === 0 || m === 0) return [];
  // score = pairs * BIG + similarity, so pair count always wins.
  const BIG = 1000;
  const w = m + 1;
  const dp = new Float64Array((n + 1) * w);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      const take = BIG + headingSimilarity(oldH[i], newH[j]) + dp[(i + 1) * w + j + 1];
      dp[i * w + j] = Math.max(take, dp[(i + 1) * w + j], dp[i * w + j + 1]);
    }
  }
  const pairs: Array<[number, number]> = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    const take = BIG + headingSimilarity(oldH[i], newH[j]) + dp[(i + 1) * w + j + 1];
    if (dp[i * w + j] === take) { pairs.push([i, j]); i++; j++; }
    else if (dp[i * w + j] === dp[(i + 1) * w + j]) i++;
    else j++;
  }
  return pairs;
}

/**
 * The scene id each parsed scene should carry, in order. `newId` is called
 * once per genuinely new scene.
 */
export function alignSceneIds(existing: IndexedScene[], parsed: ParsedSceneInput[], newId: () => string): string[] {
  const active = existing
    .filter((s) => !s.removed_at)
    .sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0));
  const oldH = active.map((s) => normalizeHeading(s.heading));
  const newH = parsed.map((s) => normalizeHeading(s.heading));
  const ids: Array<string | null> = new Array(parsed.length).fill(null);

  const anchors = lcsPairs(oldH, newH);
  const bounds: Array<[number, number]> = [[-1, -1], ...anchors, [active.length, parsed.length]];
  for (let k = 0; k < bounds.length - 1; k++) {
    const [oi, ni] = bounds[k];
    const [oj, nj] = bounds[k + 1];
    if (k > 0) ids[ni] = active[oi].id;
    const gapOld = oldH.slice(oi + 1, oj);
    const gapNew = newH.slice(ni + 1, nj);
    for (const [a, b] of pairGap(gapOld, gapNew)) ids[ni + 1 + b] = active[oi + 1 + a].id;
  }

  // Revive removed scenes whose heading comes back, most recently removed first.
  const removed = existing
    .filter((s) => s.removed_at)
    .sort((a, b) => String(b.removed_at).localeCompare(String(a.removed_at)));
  const used = new Set(ids.filter(Boolean) as string[]);
  for (let j = 0; j < parsed.length; j++) {
    if (ids[j]) continue;
    const hit = removed.find((r) => !used.has(r.id) && normalizeHeading(r.heading) === newH[j]);
    if (hit) { ids[j] = hit.id; used.add(hit.id); }
  }

  return ids.map((id) => id ?? newId());
}

function sameElements(a: unknown, b: unknown): boolean {
  const norm = (v: unknown) => {
    const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
    return JSON.stringify(Object.keys(o).sort().map((k) => [k, o[k]]));
  };
  return norm(a) === norm(b);
}

export function planSceneSync(existing: IndexedScene[], parsed: ParsedSceneInput[], newId: () => string): ScenePlan {
  const active = existing
    .filter((s) => !s.removed_at)
    .sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0));
  const baseIds = active.map((s) => s.id);
  const ids = alignSceneIds(existing, parsed, newId);
  const scenes = parsed.map((s, i) => toPlanRow(ids[i], s, i));

  const byId = new Map(active.map((s) => [s.id, s]));
  const changed =
    scenes.length !== active.length ||
    scenes.some((row, i) => {
      const cur = byId.get(row.id);
      return (
        !cur ||
        cur.ordinal !== i ||
        cur.heading !== row.heading ||
        (cur.location ?? null) !== row.location ||
        (cur.time_of_day ?? null) !== row.time_of_day ||
        (cur.cast_list ?? null) !== row.cast_list ||
        (cur.est_duration ?? null) !== row.est_duration ||
        !sameElements(cur.elements, row.elements)
      );
    });

  return { baseIds, scenes, changed };
}
