// Version comparison helpers: a simple line-level diff.

export type DiffLine = { kind: 'same' | 'add' | 'remove'; text: string };

export function lineDiff(a: string, b: string): DiffLine[] {
  const A = a.split('\n');
  const B = b.split('\n');
  const out: DiffLine[] = [];
  // Simple LCS-free greedy diff: walk both; emit removes for lines only in A, adds for only in B.
  let i = 0, j = 0;
  while (i < A.length && j < B.length) {
    if (A[i] === B[j]) { out.push({ kind: 'same', text: A[i] }); i++; j++; }
    else {
      // look ahead for match
      const nextA = B.indexOf(A[i], j);
      const nextB = A.indexOf(B[j], i);
      if (nextA !== -1 && (nextB === -1 || nextA - j <= nextB - i)) {
        while (j < nextA) { out.push({ kind: 'add', text: B[j++] }); }
      } else if (nextB !== -1) {
        while (i < nextB) { out.push({ kind: 'remove', text: A[i++] }); }
      } else {
        out.push({ kind: 'remove', text: A[i++] });
        out.push({ kind: 'add', text: B[j++] });
      }
    }
  }
  while (i < A.length) out.push({ kind: 'remove', text: A[i++] });
  while (j < B.length) out.push({ kind: 'add', text: B[j++] });
  return out;
}

export function changeStats(diff: DiffLine[]) {
  return {
    added: diff.filter((d) => d.kind === 'add').length,
    removed: diff.filter((d) => d.kind === 'remove').length,
    unchanged: diff.filter((d) => d.kind === 'same').length,
  };
}
