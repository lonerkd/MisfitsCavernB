// A person's line override (Force type, "Read as ...") is saved with the line's number and, since 2026-11-21, its text. When lines are
// added or removed above it, the number no longer points at the line; this puts the override back on the nearest line that still has
// that text, and lets go of one whose line is gone. An override with no saved text stays by number, as it always was. Pure.

export interface LineOverride { line_index: number; forced_type: string; line_text?: string | null }

/** How far from its old number an override is looked for (lines). */
export const ANCHOR_REACH = 400;

export function anchorOverrides(rawLines: readonly string[], overrides: ReadonlyArray<LineOverride> | undefined): ReadonlyArray<LineOverride> | undefined {
  if (!overrides?.length) return overrides;
  const taken = new Set<number>();
  const out: LineOverride[] = [];
  // Overrides still on their line keep it first, so a moved neighbour cannot take their place.
  const moved: LineOverride[] = [];
  for (const o of overrides) {
    const text = o.line_text?.trim();
    if (text == null || text === '') { out.push(o); taken.add(o.line_index); continue; }
    if ((rawLines[o.line_index] ?? '').trim() === text) { out.push(o); taken.add(o.line_index); continue; }
    moved.push(o);
  }
  for (const o of moved) {
    const text = (o.line_text ?? '').trim();
    let found = -1;
    for (let d = 1; d <= ANCHOR_REACH && found < 0; d++) {
      for (const j of [o.line_index + d, o.line_index - d]) {
        if (j >= 0 && j < rawLines.length && !taken.has(j) && rawLines[j].trim() === text) { found = j; break; }
      }
    }
    if (found >= 0) { out.push({ ...o, line_index: found }); taken.add(found); }
  }
  return out;
}
