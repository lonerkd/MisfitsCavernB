// Three-way line merge for co-writing: `base` is the last text both sides
// agreed on, `local` is this copy, `remote` is the collaborator's. Edits in
// different places both survive; edits to the same lines that differ are a
// conflict, which the caller hands to the person (nothing is dropped
// silently). Pure — no I/O — so it is tested directly (merge.test.ts).

export interface MergeResult {
  /** The merged text. When `clean` is false, conflicting regions hold the local side. */
  text: string;
  /** True when every change from both sides is in `text`. */
  clean: boolean;
  /** Regions where both sides changed the same lines differently. */
  conflicts: number;
}

interface Hunk { bs: number; be: number; lines: string[] }

// The DP table is O(n·m); beyond this the middle is one hunk (conservative —
// it can only turn a clean merge into a conflict, never lose text).
const MAX_CELLS = 16_000_000;

/** Where `side` differs from `base`: base[bs, be) is replaced by `lines`. */
function hunksOf(base: string[], side: string[]): Hunk[] {
  let pre = 0;
  while (pre < base.length && pre < side.length && base[pre] === side[pre]) pre++;
  let suf = 0;
  while (suf < base.length - pre && suf < side.length - pre && base[base.length - 1 - suf] === side[side.length - 1 - suf]) suf++;
  const a = base.slice(pre, base.length - suf);
  const b = side.slice(pre, side.length - suf);
  if (!a.length && !b.length) return [];
  if (!a.length || !b.length || a.length * b.length > MAX_CELLS) {
    return [{ bs: pre, be: pre + a.length, lines: b }];
  }

  // Longest common subsequence of the differing middle.
  const w = b.length + 1;
  const t = new Uint32Array((a.length + 1) * w);
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      t[i * w + j] = a[i] === b[j] ? t[(i + 1) * w + j + 1] + 1 : Math.max(t[(i + 1) * w + j], t[i * w + j + 1]);
    }
  }
  const hunks: Hunk[] = [];
  let i = 0, j = 0;
  let open: Hunk | null = null;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      if (open) { hunks.push(open); open = null; }
      i++; j++;
      continue;
    }
    if (!open) open = { bs: pre + i, be: pre + i, lines: [] };
    if (j < b.length && (i === a.length || t[i * w + j + 1] >= t[(i + 1) * w + j])) { open.lines.push(b[j]); j++; }
    else { i++; open.be = pre + i; }
  }
  if (open) hunks.push(open);
  return hunks;
}

/** `base[s, e)` with this side's hunks (all inside [s, e]) applied. */
function render(base: string[], hunks: Hunk[], s: number, e: number): string[] {
  const out: string[] = [];
  let pos = s;
  for (const h of hunks) { out.push(...base.slice(pos, h.bs), ...h.lines); pos = h.be; }
  out.push(...base.slice(pos, e));
  return out;
}

const touches = (x: { bs: number; be: number }, s: number, e: number) => x.bs <= e && x.be >= s;
const same = (x: string[], y: string[]) => x.length === y.length && x.every((l, k) => l === y[k]);

export function mergeScript(base: string, local: string, remote: string): MergeResult {
  if (local === remote) return { text: local, clean: true, conflicts: 0 };
  if (local === base) return { text: remote, clean: true, conflicts: 0 };
  if (remote === base) return { text: local, clean: true, conflicts: 0 };

  const B = base.split('\n');
  const L = hunksOf(B, local.split('\n'));
  const R = hunksOf(B, remote.split('\n'));
  const out: string[] = [];
  let pos = 0, conflicts = 0, i = 0, j = 0;

  while (i < L.length || j < R.length) {
    const fromL = j >= R.length || (i < L.length && L[i].bs <= R[j].bs);
    const first = fromL ? L[i] : R[j];
    let s = first.bs, e = first.be;
    const cl: Hunk[] = [], cr: Hunk[] = [];
    // Grow the cluster over every hunk, from either side, that touches it.
    for (let grew = true; grew;) {
      grew = false;
      while (i < L.length && touches(L[i], s, e)) { cl.push(L[i]); s = Math.min(s, L[i].bs); e = Math.max(e, L[i].be); i++; grew = true; }
      while (j < R.length && touches(R[j], s, e)) { cr.push(R[j]); s = Math.min(s, R[j].bs); e = Math.max(e, R[j].be); j++; grew = true; }
    }
    out.push(...B.slice(pos, s));
    pos = e;
    if (!cr.length) out.push(...render(B, cl, s, e));
    else if (!cl.length) out.push(...render(B, cr, s, e));
    else {
      const lt = render(B, cl, s, e), rt = render(B, cr, s, e);
      if (!same(lt, rt)) conflicts++;
      out.push(...lt);
    }
  }
  out.push(...B.slice(pos));
  return { text: out.join('\n'), clean: conflicts === 0, conflicts };
}
