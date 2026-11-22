// When a bottom sheet dragged down by its handle should close: a long pull, or a short quick flick. Pure; the sheet reads the pointer.

/** `dy` is how far the finger moved down (px), `ms` how long the drag took. */
export function shouldDismiss(dy: number, ms: number): boolean {
  if (dy <= 0) return false;
  if (dy >= 120) return true;
  return dy >= 40 && dy / Math.max(ms, 1) >= 0.5;
}
