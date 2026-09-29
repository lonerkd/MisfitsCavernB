// Pick up where you left off, on the other device. The suite remembers the
// last place someone worked on a phone and on a desk (profiles.ui_prefs.places),
// so the phone can offer "Continue: Night Shift — script, on your desktop 20 min
// ago" and the desk the same the other way round. Only places worth coming back
// to are kept — a script, a Studio tab, a project page, a conversation — never
// the hub, settings or someone else's profile.
//
// Pure: what counts as a place, what it's called, and when to offer it.

export type Device = 'phone' | 'desktop';
export interface Place { path: string; label: string; at: string; project?: string | null }
export type Places = Partial<Record<Device, Place | null>>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
// The same shape set_my_ui_prefs accepts: an in-suite path, never "//host".
const PATH = /^\/([A-Za-z0-9_?=&%.,:+~-][A-Za-z0-9/_?=&%.,:+~-]{0,299})?$/;
const AT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?Z$/;

const STUDIO_TABS: Record<string, string> = {
  overview: 'Overview', library: 'Library', scenes: 'Scenes', production: 'Production',
  post: 'Post', promos: 'Promos', pitch: 'Pitch', share: 'Share',
};
const PRODUCTION_VIEWS: Record<string, string> = {
  story: 'Story', breakdown: 'Breakdown', readiness: 'Readiness', locations: 'Locations', money: 'Money',
  paperwork: 'Paperwork', schedule: 'Schedule', onset: 'On Set', crew: 'Crew',
};

const withProject = (title: string | null | undefined, what: string) => (title ? `${title} — ${what}` : what).slice(0, 120);

/**
 * The place a page is, or null if it isn't one worth resuming. `project` is the
 * project in view (Studio follows the active project, so it's recorded with it).
 */
export function placeFor(pathname: string, search: URLSearchParams, project: { id: string; title: string } | null): Omit<Place, 'at'> | null {
  const keep = (path: string, label: string, projectId: string | null) => (PATH.test(path) ? { path, label, project: projectId } : null);
  if (pathname === '/editor') {
    const script = search.get('script');
    if (!script || !UUID.test(script)) return null;
    return keep(`/editor?script=${script}`, withProject(project?.title, 'script'), project?.id ?? null);
  }
  if (pathname === '/studio') {
    if (!project) return null;
    const tab = search.get('tab') ?? 'overview';
    if (!STUDIO_TABS[tab]) return null;
    const view = tab === 'production' ? search.get('view') ?? 'story' : null;
    if (view && !PRODUCTION_VIEWS[view]) return null;
    const path = `/studio?tab=${tab}${view ? `&view=${view}` : ''}`;
    return keep(path, withProject(project.title, view ? PRODUCTION_VIEWS[view] : `Studio › ${STUDIO_TABS[tab]}`), project.id);
  }
  const proj = pathname.match(/^\/projects\/([0-9a-f-]{36})(\/pitch)?$/);
  if (proj && UUID.test(proj[1])) {
    const title = project?.id === proj[1] ? project.title : null;
    return keep(pathname, withProject(title, proj[2] ? 'pitch' : 'project page'), proj[1]);
  }
  if (pathname === '/lounge') {
    const channel = search.get('channel'), dm = search.get('dm');
    if (channel && UUID.test(channel)) return keep(`/lounge?channel=${channel}`, 'a conversation in the Lounge', null);
    if (dm && UUID.test(dm)) return keep(`/lounge?dm=${dm}`, 'a message in the Lounge', null);
    return null;
  }
  return null;
}

function toPlace(raw: unknown): Place | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.path !== 'string' || !PATH.test(r.path)) return null;
  if (typeof r.label !== 'string' || !r.label || r.label.length > 120) return null;
  if (typeof r.at !== 'string' || !AT.test(r.at)) return null;
  const project = typeof r.project === 'string' && UUID.test(r.project) ? r.project : null;
  return { path: r.path, label: r.label, at: r.at, project };
}

export function toPlaces(raw: unknown): Places {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const out: Places = {};
  for (const d of ['phone', 'desktop'] as const) {
    const p = toPlace(r[d]);
    if (p) out[d] = p;
  }
  return out;
}

/** Whether a new place is worth saving over the last one (a different page, or the same one a while later). */
export function worthSaving(last: Place | null | undefined, next: Omit<Place, 'at'>, now: Date, minGapMs = 5 * 60_000): boolean {
  if (!last) return true;
  if (last.path !== next.path || (last.project ?? null) !== (next.project ?? null)) return true;
  return now.getTime() - Date.parse(last.at) >= minGapMs;
}

/**
 * The place to offer on this device: the other device's last place, if it's
 * more recent than this one's, not too old, and not where we already are.
 */
export function resumeOffer(places: Places, here: Device, now: Date, currentPath: string | null = null, maxAgeHours = 72): { from: Device; place: Place } | null {
  const from: Device = here === 'phone' ? 'desktop' : 'phone';
  const there = places[from];
  if (!there) return null;
  const at = Date.parse(there.at);
  if (!Number.isFinite(at) || now.getTime() - at > maxAgeHours * 3_600_000) return null;
  const mine = places[here];
  if (mine && Date.parse(mine.at) >= at && mine.path === there.path) return null;
  if (currentPath && currentPath === there.path) return null;
  return { from, place: there };
}

/** "just now", "20 min ago", "3 h ago", "yesterday", "2 days ago". */
export function ago(at: string, now: Date): string {
  const mins = Math.max(0, Math.round((now.getTime() - Date.parse(at)) / 60_000));
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}
