// The lines of a scene as the script supervisor numbers them: the script's own lines without the blank ones and without the scene
// heading (the heading is the scene, not something the camera covers). Pure.

export interface LiningLine { type: string; text: string }

export function liningLines(lines: ReadonlyArray<{ type: string; text: string }>): LiningLine[] {
  let seenHeading = false;
  const out: LiningLine[] = [];
  for (const l of lines) {
    const text = (l.text ?? '').trim();
    if (!text || l.type === 'empty') continue;
    if (!seenHeading && (l.type === 'slug' || l.type === 'scene')) { seenHeading = true; continue; }
    out.push({ type: l.type, text });
  }
  return out;
}
