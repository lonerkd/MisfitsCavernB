/** "12 s" / "2 min" for a wait in ms (rounded up, so it never reads "0 s" while waiting). */
export function formatWait(ms: number): string {
  const s = Math.max(1, Math.ceil(ms / 1000));
  return s < 60 ? `${s} s` : `${Math.ceil(s / 60)} min`;
}
