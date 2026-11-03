// Which island a narrow window gets (plans/2026-11-02-island-at-every-size.md).
// Under 760 px the dock used to vanish for everyone and the phone's pill took
// over, whatever the device. With island_v2 on, a narrow window whose main input
// is a mouse or trackpad (a split screen, a small desktop window) keeps the dock;
// a touch device keeps the pill.

export const NARROW_QUERY = '(max-width: 760px)';
export const FINE_POINTER_QUERY = '(pointer: fine)';

export type IslandSurface = 'dock' | 'compact-dock' | 'pill';

/** The presentation for a window of this width and input, with the flag on or off. */
export function islandSurface(i: { v2: boolean; narrow: boolean; finePointer: boolean }): IslandSurface {
  if (!i.narrow) return 'dock';
  return i.v2 && i.finePointer ? 'compact-dock' : 'pill';
}
