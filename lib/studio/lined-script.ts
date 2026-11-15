// The script supervisor's lined script and selected takes. Pure: the view supplies the take records (kept in
// production_records as `scriptNotes`), the scene's script lines and its planned shots.
//
// A take covers a run of the scene's lines, from `from_line` to `to_line` (1-based, in the scene's own numbering): on paper that is
// the vertical line drawn down the page, solid when the actor is on camera and wavy when the dialogue is off camera. A take is
// "circled" when it is the one the editor should use; one selected take per shot.

export interface ScriptTake {
  id: string;
  scene_ids?: string[];
  scene?: string;
  /** The planned shot this take is of, when it is linked to one. */
  shot_id?: string | null;
  take: string;
  slate?: string;
  lens?: string;
  notes?: string;
  circle: boolean;
  from_line?: number | null;
  to_line?: number | null;
  /** The covered lines are heard but not seen. */
  off_camera?: boolean;
}

export interface TakeSpan { from: number; to: number }

/** A take's lined run, clamped to the scene's lines; null when it has none, or when it lies entirely outside the scene. */
export function takeSpan(t: Pick<ScriptTake, 'from_line' | 'to_line'>, lineCount: number): TakeSpan | null {
  const a = Number(t.from_line);
  const b = t.to_line == null || Number.isNaN(Number(t.to_line)) ? a : Number(t.to_line);
  if (!Number.isFinite(a) || a < 1 || lineCount < 1) return null;
  const from = Math.min(a, b);
  const to = Math.max(a, b);
  if (from > lineCount) return null;
  return { from, to: Math.min(to, lineCount) };
}

export interface LineCoverage {
  /** For each line (index 0 = line 1): the ids of the takes that cover it. */
  byLine: string[][];
  /** Runs of consecutive lines no selected take covers, as 1-based inclusive ranges. */
  uncovered: TakeSpan[];
  /** The count of lines a selected take covers. */
  covered: number;
}

/** Which takes cover which lines, and which lines no *selected* take covers (what the editor would have no picture for). */
export function coverage(lineCount: number, takes: ScriptTake[]): LineCoverage {
  const byLine: string[][] = Array.from({ length: Math.max(lineCount, 0) }, () => []);
  const selected: boolean[] = Array.from({ length: Math.max(lineCount, 0) }, () => false);
  for (const t of takes) {
    const span = takeSpan(t, lineCount);
    if (!span) continue;
    for (let n = span.from; n <= span.to; n++) {
      byLine[n - 1].push(t.id);
      if (t.circle) selected[n - 1] = true;
    }
  }
  const uncovered: TakeSpan[] = [];
  for (let n = 1; n <= lineCount; n++) {
    if (selected[n - 1]) continue;
    const last = uncovered[uncovered.length - 1];
    if (last && last.to === n - 1) last.to = n; else uncovered.push({ from: n, to: n });
  }
  return { byLine, uncovered, covered: selected.filter(Boolean).length };
}

/** Circle a take. Within one shot of one scene only one take is selected, so circling it un-circles the others of that shot. */
export function circleTake(items: ScriptTake[], id: string): ScriptTake[] {
  const target = items.find((i) => i.id === id);
  if (!target) return items;
  if (target.circle) return items.map((i) => (i.id === id ? { ...i, circle: false } : i));
  const sameShot = (i: ScriptTake) => !!target.shot_id && i.shot_id === target.shot_id && sameScene(i, target);
  return items.map((i) => (i.id === id ? { ...i, circle: true } : sameShot(i) ? { ...i, circle: false } : i));
}

const sameScene = (a: ScriptTake, b: ScriptTake) => {
  const x = [...(a.scene_ids ?? [])].sort().join(',');
  const y = [...(b.scene_ids ?? [])].sort().join(',');
  return x === y;
};

export interface SelectedTakes {
  scene_id: string | null;
  scene: string;
  shots: Array<{ shot_id: string | null; shot: string; takes: ScriptTake[] }>;
}

/**
 * The takes the editor should use, by scene and shot: the circled ones. A shot with takes but none circled is listed with no
 * take so the gap shows; a circled take with no shot goes under "No shot linked".
 */
export function selectedTakes(
  items: ScriptTake[],
  scenes: ReadonlyMap<string, { scene_number: number; title?: string | null; heading?: string | null }>,
  shotName: (id: string) => string | null,
): SelectedTakes[] {
  const groups = new Map<string, SelectedTakes>();
  for (const t of items) {
    const sceneId = t.scene_ids?.[0] ?? null;
    const key = sceneId ?? `text:${(t.scene ?? '').trim()}`;
    const sc = sceneId ? scenes.get(sceneId) : undefined;
    const g = groups.get(key) ?? { scene_id: sceneId, scene: sc ? String(sc.scene_number) : (t.scene ?? '').trim(), shots: [] };
    const shotKey = t.shot_id ?? null;
    let sh = g.shots.find((x) => x.shot_id === shotKey);
    if (!sh) { sh = { shot_id: shotKey, shot: shotKey ? (shotName(shotKey) ?? 'A shot') : 'No shot linked', takes: [] }; g.shots.push(sh); }
    if (t.circle) sh.takes.push(t);
    groups.set(key, g);
  }
  const num = (g: SelectedTakes) => Number(g.scene) || 1e9;
  return [...groups.values()].sort((a, b) => num(a) - num(b) || a.scene.localeCompare(b.scene));
}
