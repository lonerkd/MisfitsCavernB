// A performer's own sides, read where they live (the call page), not only printed by the production.
// Pure: takes the day's scene rows as the Studio holds them and the script as the parser reads it.
//
// The scene rows were written from a parse that had the project's cast, places and corrections; the call page parses the
// text without them, so the two can number scenes differently. The row's `ordinal` is only trusted when the heading it
// points at is the same one; otherwise the scene is found by its heading, each parsed scene used once.

import { buildSides, type Sides } from './sides';

export interface DaySceneRow { id: string; heading: string | null; title: string | null; scene_number: number | string | null; ordinal: number | null }
export interface ParsedSceneLite { heading: string | null; lines: { type: string; text: string }[] }

/** A heading as a comparison key: no scene-number marks, one space between words, upper case. */
export const headingKey = (h: string | null | undefined): string => (h ?? '').replace(/#[^#]*#/g, '').replace(/\s+/g, ' ').trim().toUpperCase();

/** The script lines of each of the day's scenes, by scene row id. A scene that cannot be found has no entry. */
export function linesByScene(rows: DaySceneRow[], parsed: ParsedSceneLite[]): Map<string, { type: string; text: string }[]> {
  const out = new Map<string, { type: string; text: string }[]>();
  const used = new Set<number>();
  const keys = parsed.map((p) => headingKey(p.heading));
  for (const row of rows) {
    const key = headingKey(row.heading ?? row.title);
    if (!key) continue;
    let at = row.ordinal != null && keys[row.ordinal] === key && !used.has(row.ordinal) ? row.ordinal : -1;
    if (at < 0) at = keys.findIndex((k, i) => k === key && !used.has(i));
    if (at < 0) continue;
    used.add(at);
    out.set(row.id, parsed[at].lines);
  }
  return out;
}

/** The sides of every character a person plays that day, in shooting order, with their own lines marked. */
export function mySides(a: { castAs: string[]; rows: DaySceneRow[]; parsed: ParsedSceneLite[]; actor: string | null; call: string | null }): Sides[] {
  const lines = linesByScene(a.rows, a.parsed);
  const dayScenes = a.rows.map((r) => ({ heading: r.heading ?? r.title ?? '', sceneNumber: r.scene_number, lines: lines.get(r.id) ?? [] }));
  return buildSides(dayScenes, a.castAs.map((character) => ({ character, actor: a.actor, call: a.call })));
}
