// A person arranges their own portfolio: pin up to three pieces to the top, put the rest in the order they choose. Pure, so the
// manage screen and the tests read the same rules; the database enforces the limit of three and who may change what.

export const MAX_PINNED = 3;

export interface Arrangeable { id: string; pinned?: boolean | null; position?: number | null; year?: number | string | null; created_at?: string | null }

const yearOf = (p: Arrangeable) => (p.year === null || p.year === undefined || p.year === '' ? -Infinity : Number(p.year) || -Infinity);

/** The order the page shows: pinned first, then by chosen position (unarranged pieces after), then newest year, then newest. */
export function arrange<T extends Arrangeable>(list: readonly T[]): T[] {
  return [...list].sort((a, b) =>
    Number(!!b.pinned) - Number(!!a.pinned)
    || (a.position ?? Infinity) - (b.position ?? Infinity)
    || yearOf(b) - yearOf(a)
    || (b.created_at ?? '').localeCompare(a.created_at ?? ''));
}

export interface Placement { id: string; pinned: boolean; position: number }

/** Every piece's place, in the arranged order, as the numbers to save. */
export const placements = (list: readonly Arrangeable[]): Placement[] => arrange(list).map((p, i) => ({ id: p.id, pinned: !!p.pinned, position: i }));

/** The list with a piece moved one step earlier or later within its group (pinned pieces stay in the pinned group). Same list when it cannot move. */
export function move<T extends Arrangeable>(list: readonly T[], id: string, by: -1 | 1): T[] {
  const ordered = arrange(list);
  const i = ordered.findIndex((p) => p.id === id);
  const j = i + by;
  if (i < 0 || j < 0 || j >= ordered.length || !!ordered[i].pinned !== !!ordered[j].pinned) return ordered;
  const next = [...ordered];
  [next[i], next[j]] = [next[j], next[i]];
  return next.map((p, k) => ({ ...p, position: k }));
}

/** Pins or unpins a piece; null (the list unchanged) when that would be a fourth pin. A newly pinned piece goes last among the pinned. */
export function togglePin<T extends Arrangeable>(list: readonly T[], id: string): T[] | null {
  const ordered = arrange(list);
  const target = ordered.find((p) => p.id === id);
  if (!target) return ordered;
  if (!target.pinned && ordered.filter((p) => p.pinned).length >= MAX_PINNED) return null;
  const flipped = ordered.map((p) => (p.id === id ? { ...p, pinned: !p.pinned } : p));
  const pinned = flipped.filter((p) => p.pinned && p.id !== id);
  const rest = flipped.filter((p) => !p.pinned && p.id !== id);
  const changed = flipped.find((p) => p.id === id)!;
  const next = changed.pinned ? [...pinned, changed, ...rest] : [...pinned, changed, ...rest];
  return next.map((p, k) => ({ ...p, position: k }));
}
