// Where the caret has been: the editor remembers each place it jumped from, so
// Alt + ← / → walks back and forward through jumps like a browser. Session-only
// (nothing is stored), and pure so the stacks are testable.

export const HISTORY_MAX = 50;

export interface HistoryState {
  /** Places to go back to, oldest first. */
  back: number[];
  /** Places reached by going back, newest last. */
  forward: number[];
}

export const NO_HISTORY: HistoryState = { back: [], forward: [] };

/** Remember the place a jump leaves (a script line index): push it on `back`, drop what was ahead. */
export function remember(state: HistoryState, place: number): HistoryState {
  return { back: [...state.back, place].slice(-HISTORY_MAX), forward: [] };
}

/**
 * Step back (direction -1) or forward (1) through the places. Returns the stacks
 * after the move and the line to land on — null when there is nowhere to go,
 * with the stacks untouched.
 */
export function stepHistory(state: HistoryState, current: number, direction: -1 | 1): { state: HistoryState; place: number | null } {
  const from = direction === -1 ? state.back : state.forward;
  if (!from.length) return { state, place: null };
  const place = from[from.length - 1];
  const rest = from.slice(0, -1);
  const other = [...(direction === -1 ? state.forward : state.back), current].slice(-HISTORY_MAX);
  return {
    state: direction === -1 ? { back: rest, forward: other } : { back: other, forward: rest },
    place,
  };
}
