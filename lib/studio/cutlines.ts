// Cut notes on script lines. A note remembers its line relative to the
// scene's heading plus the line's text, so it survives edits elsewhere in the
// script, and edits inside the scene can re-find it (`findLine`).
//
// While a cut plays, `cutMap` predicts which scene is on screen: the script's
// scene lengths (a table-read time, else the page-count estimate) laid along
// the cut, pinned wherever a note already says "this moment is scene N".
// Every anchored note makes the prediction better.

export interface LineAnchor { offset: number; text: string }

/** Trimmed, single-spaced, lower case — how lines are compared. */
export function normLine(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toLowerCase();
}

function words(text: string): string[] {
  return normLine(text).replace(/[^\p{L}\p{N}' ]/gu, ' ').split(' ').filter(Boolean);
}

/** Share of the longer line's words the two have in common (0–1). */
export function lineSimilarity(a: string, b: string): number {
  const wa = words(a);
  const wb = words(b);
  if (!wa.length || !wb.length) return 0;
  const pool = new Map<string, number>();
  for (const w of wb) pool.set(w, (pool.get(w) ?? 0) + 1);
  let common = 0;
  for (const w of wa) {
    const n = pool.get(w) ?? 0;
    if (n) { common += 1; pool.set(w, n - 1); }
  }
  return common / Math.max(wa.length, wb.length);
}

/**
 * Where an anchored line is now among its scene's lines (index 0 is the
 * heading): the same text at the same place; else the nearest line with the
 * same text; else the nearest line that still reads mostly the same (reworded
 * a little). Null when the line has gone.
 */
export function findLine(sceneLines: string[], anchor: LineAnchor): { offset: number; exact: boolean } | null {
  const want = normLine(anchor.text);
  if (!want) return null;
  if (normLine(sceneLines[anchor.offset] ?? '') === want) return { offset: anchor.offset, exact: true };
  let best: { offset: number; score: number; distance: number } | null = null;
  sceneLines.forEach((line, i) => {
    const same = normLine(line) === want;
    const score = same ? 2 : lineSimilarity(line, anchor.text);
    if (!same && score < 0.6) return;
    const distance = Math.abs(i - anchor.offset);
    if (!best || score > best.score || (score === best.score && distance < best.distance)) best = { offset: i, score, distance };
  });
  if (!best) return null;
  const { offset, score } = best as { offset: number; score: number };
  return { offset, exact: score === 2 };
}

/** A scene's expected screen time: its table-read time, else its length (eighths of a page, a minute a page). */
export function sceneSeconds(scene: { read_seconds?: number | null; est_duration?: string | null }): number {
  if (scene.read_seconds && scene.read_seconds > 0) return Number(scene.read_seconds);
  const m = /(\d+)\s*\/\s*8/.exec(scene.est_duration ?? '');
  return m ? Math.max(1, Number(m[1])) * 7.5 : 60;
}

export interface CutAnchor { at: number; scene: number }

export interface CutMap {
  /** Predicted time each scene starts in the cut. */
  starts: number[];
  /** The scene predicted on screen at `t` seconds (-1 when there are no scenes). */
  sceneAt: (t: number) => number;
}

/**
 * Lay the script's scenes along a cut. `seconds[i]` is scene i's expected
 * length; `anchors` are notes that tie a moment of the cut to a scene (their
 * middle is taken as that moment); `duration` is the cut's length when the
 * player knows it. Anchors that contradict earlier ones (a later moment in an
 * earlier scene — a reordered cut) are ignored.
 */
export function cutMap(seconds: number[], anchors: CutAnchor[] = [], duration?: number | null): CutMap {
  const pos: number[] = [];
  let total = 0;
  for (const s of seconds) { pos.push(total); total += Math.max(0, s); }

  // Knots mapping script position → cut time.
  const knots: Array<[number, number]> = [[0, 0]];
  for (const a of [...anchors].sort((x, y) => x.at - y.at)) {
    if (a.scene < 0 || a.scene >= seconds.length || !(a.at >= 0)) continue;
    const p = pos[a.scene] + Math.max(0, seconds[a.scene]) / 2;
    const [lp, lt] = knots[knots.length - 1];
    if (p > lp && a.at > lt) knots.push([p, a.at]);
  }
  const [lp, lt] = knots[knots.length - 1];
  if (duration && duration > lt && total > lp) knots.push([total, duration]);

  const timeAt = (p: number): number => {
    for (let k = 1; k < knots.length; k++) {
      const [p0, t0] = knots[k - 1];
      const [p1, t1] = knots[k];
      if (p <= p1) return t0 + ((p - p0) / (p1 - p0)) * (t1 - t0);
    }
    // Past the last knot: carry on at the last segment's pace (script pace if none).
    const n = knots.length;
    if (n < 2) return p;
    const [p0, t0] = knots[n - 2];
    const [p1, t1] = knots[n - 1];
    return t1 + (p - p1) * ((t1 - t0) / (p1 - p0));
  };

  const starts = pos.map(timeAt);
  return {
    starts,
    sceneAt: (t: number) => {
      let at = starts.length ? 0 : -1;
      for (let i = 0; i < starts.length; i++) if (starts[i] <= t) at = i;
      return at;
    },
  };
}

export interface PlacedNote<N> { note: N; exact: boolean; lost: boolean }

/**
 * Where each line-pinned note sits in the script now, by absolute line index.
 * `scenes[i]` is the i-th scene's stored id and heading line; a note whose
 * line has gone sits on its scene's heading, marked `lost`. Notes on scenes
 * not in this script are left out.
 */
export function placeLineNotes<N extends { scene_id: string | null; line_offset: number | null; line_text: string | null }>(
  notes: N[], scenes: Array<{ id: string | null; start: number }>, lineTexts: string[],
): Map<number, PlacedNote<N>[]> {
  const byLine = new Map<number, PlacedNote<N>[]>();
  const put = (i: number, p: PlacedNote<N>) => byLine.set(i, [...(byLine.get(i) ?? []), p]);
  scenes.forEach((sc, k) => {
    if (!sc.id) return;
    const mine = notes.filter((n) => n.scene_id === sc.id && n.line_offset != null && n.line_text);
    if (!mine.length) return;
    const body = lineTexts.slice(sc.start, scenes[k + 1]?.start ?? lineTexts.length);
    for (const note of mine) {
      const at = findLine(body, { offset: note.line_offset!, text: note.line_text! });
      if (at) put(sc.start + at.offset, { note, exact: at.exact, lost: false });
      else put(sc.start, { note, exact: false, lost: true });
    }
  });
  return byLine;
}
