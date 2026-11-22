/**
 * A small Myers diff of two arrays of strings, bounded: it gives up (null) when the edit script would be longer than `maxEdit`.
 * The previous-draft alignment needs only this, and `parser.ts` (loaded by every page that reads a script) imports it, so it is kept
 * here instead of pulling the general-purpose `diff` package into every one of those pages' bundles.
 *
 * Parts come out in the order a reader expects: equal runs, and in each changed stretch the removed lines first, then the added ones.
 */
export interface DiffPart { value: string[]; added?: true; removed?: true }

export function diffArrays(a: readonly string[], b: readonly string[], maxEdit: number): DiffPart[] | null {
  const n = a.length;
  const m = b.length;
  const max = Math.min(n + m, maxEdit);
  const off = max + 1;
  const v = new Int32Array(2 * max + 3);
  const trace: Int32Array[] = [];
  let found = -1;
  for (let d = 0; d <= max && found < 0; d++) {
    trace.push(v.slice(0)); // the frontier before step d, for walking back
    for (let k = -d; k <= d; k += 2) {
      let x = k === -d || (k !== d && v[off + k - 1] < v[off + k + 1]) ? v[off + k + 1] : v[off + k - 1] + 1;
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) { x++; y++; }
      v[off + k] = x;
      if (x >= n && y >= m) { found = d; break; }
    }
  }
  if (found < 0) return null;

  // Walk back from the end to the start, collecting the edit script in reverse.
  const ops: Array<'=' | '-' | '+'> = [];
  let x = n;
  let y = m;
  for (let d = found; d > 0; d--) {
    const prev = trace[d];
    const k = x - y;
    const down = k === -d || (k !== d && prev[off + k - 1] < prev[off + k + 1]);
    const pk = down ? k + 1 : k - 1;
    const px = prev[off + pk];
    const py = px - pk;
    // This step ended at (endX, endY) after one edit from (px, py); anything diagonal beyond that was a run of equal lines.
    const endX = down ? px : px + 1;
    const endY = down ? py + 1 : py;
    while (x > endX && y > endY) { ops.push('='); x--; y--; }
    if (down) { ops.push('+'); y--; } else { ops.push('-'); x--; }
  }
  while (x > 0 && y > 0) { ops.push('='); x--; y--; }
  ops.reverse();

  // Coalesce: equal runs, and per changed stretch the removals before the additions.
  const parts: DiffPart[] = [];
  let ai = 0;
  let bi = 0;
  for (let i = 0; i < ops.length;) {
    if (ops[i] === '=') {
      let j = i;
      while (j < ops.length && ops[j] === '=') j++;
      parts.push({ value: a.slice(ai, ai + (j - i)) as string[] });
      ai += j - i; bi += j - i; i = j;
    } else {
      let j = i;
      let del = 0;
      let add = 0;
      while (j < ops.length && ops[j] !== '=') { if (ops[j] === '-') del++; else add++; j++; }
      if (del) parts.push({ value: a.slice(ai, ai + del) as string[], removed: true });
      if (add) parts.push({ value: b.slice(bi, bi + add) as string[], added: true });
      ai += del; bi += add; i = j;
    }
  }
  return parts;
}
