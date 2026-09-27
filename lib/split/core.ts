// Split screen, pure: the messages panes exchange, the layout in the URL, and
// the surfaces a pane can show. No DOM, so it's testable anywhere.

export const SPLIT_KEY = 'mcSplit';

export type SplitMessage =
  /** The pane's page changed (so a reload restores it, and the bar can name it). */
  | { type: 'navigated'; href: string; title: string }
  /** The script's caret is in this scene (null: before the first heading). */
  | { type: 'scene'; scriptId: string; sceneId: string | null }
  /** Take the script to this scene (and to a cut note's line in it). */
  | { type: 'open-scene'; scriptId: string; sceneId: string; noteId?: string };

export function isSplitMessage(data: unknown): data is SplitMessage {
  if (!data || typeof data !== 'object' || !(data as Record<string, unknown>)[SPLIT_KEY]) return false;
  const d = data as Record<string, unknown>;
  const str = (v: unknown) => typeof v === 'string' && v.length > 0 && v.length < 2000;
  switch (d.type) {
    case 'navigated': return str(d.href) && typeof d.title === 'string';
    case 'scene': return str(d.scriptId) && (d.sceneId === null || str(d.sceneId));
    case 'open-scene': return str(d.scriptId) && str(d.sceneId) && (d.noteId === undefined || str(d.noteId));
    default: return false;
  }
}

/** Only this site's pages, never the split itself (no frames within frames). */
export function safePanePath(raw: string | null | undefined, fallback: string): string {
  if (!raw) return fallback;
  let path = raw.trim();
  try { path = decodeURIComponent(path); } catch { return fallback; }
  if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) return fallback;
  if (/^\/split(?:[/?#]|$)/.test(path) || /[\u0000-\u001f]/.test(path)) return fallback;
  return path;
}

export type Orientation = 'row' | 'column';

export interface SplitLayout {
  a: string;
  b: string;
  orientation: Orientation;
  /** Share of the first pane, 0.2–0.8. */
  ratio: number;
  linked: boolean;
}

export const DEFAULT_LAYOUT: SplitLayout = { a: '/editor', b: '/studio?tab=scenes', orientation: 'row', ratio: 0.5, linked: true };

export const clampRatio = (r: number) => (Number.isFinite(r) ? Math.min(0.8, Math.max(0.2, r)) : 0.5);

export function layoutFromSearch(search: string, fallback: SplitLayout = DEFAULT_LAYOUT): SplitLayout {
  const q = new URLSearchParams(search);
  return {
    a: safePanePath(q.get('a'), fallback.a),
    b: safePanePath(q.get('b'), fallback.b),
    orientation: q.get('o') === 'column' ? 'column' : q.get('o') === 'row' ? 'row' : fallback.orientation,
    ratio: q.has('r') ? clampRatio(Number(q.get('r'))) : fallback.ratio,
    linked: q.has('link') ? q.get('link') !== '0' : fallback.linked,
  };
}

export function layoutToSearch(l: SplitLayout): string {
  const q = new URLSearchParams({ a: l.a, b: l.b, o: l.orientation, r: l.ratio.toFixed(2), link: l.linked ? '1' : '0' });
  return `?${q.toString()}`;
}

/** Surfaces a pane can switch to. */
export interface Surface { id: string; label: string; group: 'Write' | 'Studio' | 'Project' | 'Suite'; href: string }

export const SURFACES: Surface[] = [
  { id: 'script', label: 'Script', group: 'Write', href: '/editor' },
  { id: 'scenes', label: 'Scenes', group: 'Studio', href: '/studio?tab=scenes' },
  { id: 'readiness', label: 'Readiness', group: 'Studio', href: '/studio?tab=production&view=readiness' },
  { id: 'breakdown', label: 'Breakdown', group: 'Studio', href: '/studio?tab=production&view=breakdown' },
  { id: 'schedule', label: 'Schedule', group: 'Studio', href: '/studio?tab=production&view=schedule' },
  { id: 'story', label: 'Story board', group: 'Studio', href: '/studio?tab=production&view=story' },
  { id: 'library', label: 'Library', group: 'Studio', href: '/studio?tab=library' },
  { id: 'post', label: 'Post', group: 'Studio', href: '/studio?tab=post' },
  { id: 'projects', label: 'Projects', group: 'Project', href: '/projects' },
  { id: 'lounge', label: 'Lounge', group: 'Suite', href: '/lounge' },
  { id: 'soundtrack', label: 'Soundtrack', group: 'Suite', href: '/soundtrack' },
  { id: 'jobs', label: 'Jobs', group: 'Suite', href: '/jobs' },
];

/** The surface a path is on (most specific match), or null. */
export function surfaceOf(href: string): Surface | null {
  const [path, query = ''] = href.split('?');
  const q = new URLSearchParams(query);
  let best: Surface | null = null;
  let bestScore = -1;
  for (const s of SURFACES) {
    const [sp, sq = ''] = s.href.split('?');
    if (path !== sp && !(sp !== '/' && path.startsWith(`${sp}/`))) continue;
    const want = new URLSearchParams(sq);
    let ok = true;
    let score = path === sp ? 1 : 0;
    want.forEach((v, k) => { if (q.get(k) === v) score += 2; else ok = false; });
    // /studio?tab=production (no view) is the Story board, Production's default.
    if (!ok && s.id === 'story' && q.get('tab') === 'production' && !q.get('view')) { ok = true; score += 3; }
    if (ok && score > bestScore) { best = s; bestScore = score; }
  }
  return best;
}

/** What to open beside a page when splitting from it. */
export function companionOf(href: string): string {
  const s = surfaceOf(href);
  if (!s) return '/editor';
  return s.id === 'script' ? '/studio?tab=scenes' : '/editor';
}
