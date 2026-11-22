// Where the island's back chevron goes. The rule: back returns to the page the person was just on, and only
// when there is no such page inside the app does it climb to the page's logical parent (islandRoute().back).
//
// "A page" is a pathname. A query-string-only change (a Studio tab, a filter) is the same page, so back steps
// over those entries instead of undoing them one by one: from Studio?tab=b, back leaves Studio.
// Entries that are another origin, or the sign-in pages, never count as somewhere to return to.

export type BackPlan =
  /** Go back `steps` history entries, landing on `path`. */
  | { kind: 'history'; steps: number; path: string }
  /** No earlier in-app page: go to the logical parent. */
  | { kind: 'parent' };

export const PARENT: BackPlan = { kind: 'parent' };

export interface BackInput {
  /** Pathname of the page now showing. */
  currentPath: string;
  /** The session's history entries as absolute URLs, oldest first (Navigation API); null where the browser has no such API. */
  entries: (string | null)[] | null;
  /** Index of the current entry in `entries`. */
  index: number;
  origin: string;
  /** Without `entries`: the pathname seen before this one in this tab (one real step back), or null on a fresh load. */
  previousPath: string | null;
}

const SKIP = (path: string) => path === '/auth' || path.startsWith('/auth/');

export function planBack({ currentPath, entries, index, origin, previousPath }: BackInput): BackPlan {
  if (!entries) {
    return previousPath && previousPath !== currentPath && !SKIP(previousPath) ? { kind: 'history', steps: 1, path: previousPath } : PARENT;
  }
  for (let i = index - 1; i >= 0; i--) {
    const url = entries[i];
    if (!url) return PARENT;
    let u: URL;
    try { u = new URL(url); } catch { return PARENT; }
    if (u.origin !== origin) return PARENT;
    if (u.pathname === currentPath) continue; // the same page with another query: not a place to return to
    return SKIP(u.pathname) ? PARENT : { kind: 'history', steps: index - i, path: u.pathname };
  }
  return PARENT;
}
