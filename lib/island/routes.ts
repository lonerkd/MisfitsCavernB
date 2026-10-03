// What the island says about a page that hasn't described itself. Pages with
// live state publish their own descriptor (usePillStage); every other route
// still gets a name, the app it belongs to, and the places people go next
// from there — so the island is never blank and never a dead end.

export type IslandApp = 'home' | 'today' | 'editor' | 'studio' | 'lounge' | 'portfolio';

export interface IslandLink {
  id: string;
  label: string;
  href: string;
}

export interface IslandRoute {
  /** Short name of the place, shown beside the dot. */
  title: string;
  /** The app whose icon and colour the island wears here. */
  app: IslandApp | null;
  /** Where people usually go next from here. */
  links: IslandLink[];
}

const link = (id: string, label: string, href: string): IslandLink => ({ id, label, href });

const PROJECTS = link('go-projects', 'Projects', '/projects');
const TODAY = link('go-today', 'Today', '/today');
const SCRIPT = link('go-script', 'Script', '/editor');
const STUDIO = link('go-studio', 'Studio', '/studio');
const LOUNGE = link('go-lounge', 'Lounge', '/lounge');
const JOBS = link('go-jobs', 'Jobs board', '/jobs');
const CREW = link('go-crew', 'Crew', '/crew');
const PORTFOLIO = link('go-portfolio', 'Portfolio', '/portfolio');

/** The island's fallback for `pathname`. `hasProject`: a project is open, so its tools are worth offering. */
export function islandRoute(pathname: string, hasProject = false): IslandRoute {
  const [first = '', second = '', third = ''] = pathname.split('/').filter(Boolean);
  const tools = hasProject ? [SCRIPT, STUDIO, LOUNGE] : [];

  switch (first) {
    case '':
      return { title: 'Hub', app: 'home', links: [TODAY, PROJECTS] };
    case 'today':
      return { title: 'Today', app: 'today', links: [PROJECTS, ...tools] };
    case 'projects':
      if (!second) return { title: 'Projects', app: 'home', links: [TODAY] };
      if (third === 'pitch') return { title: 'Pitch', app: 'home', links: [link('go-project', 'Project', `/projects/${second}`), STUDIO] };
      return { title: 'Project', app: 'home', links: [SCRIPT, STUDIO, LOUNGE] };
    case 'editor':
      return { title: 'ScriptOS', app: 'editor', links: [STUDIO, LOUNGE] };
    case 'studio':
      return { title: 'Studio', app: 'studio', links: [SCRIPT, LOUNGE] };
    case 'soundtrack':
      return { title: 'Soundtrack', app: 'studio', links: [STUDIO] };
    case 'lounge':
      return { title: 'Lounge', app: 'lounge', links: [SCRIPT, STUDIO] };
    case 'call':
      return { title: 'Call', app: 'lounge', links: [LOUNGE] };
    case 'portfolio':
      if (second === 'manage') return { title: 'Manage portfolio', app: 'portfolio', links: [PORTFOLIO] };
      return { title: 'Portfolio', app: 'portfolio', links: [link('go-portfolio-manage', 'Manage', '/portfolio/manage')] };
    case 'showcase':
      return { title: 'Showcase', app: 'portfolio', links: [PORTFOLIO] };
    case 'jobs':
      return second ? { title: 'Job', app: null, links: [JOBS, CREW] } : { title: 'Jobs board', app: null, links: [CREW] };
    case 'crew':
      return second ? { title: 'Crew member', app: null, links: [CREW, JOBS] } : { title: 'Crew', app: null, links: [JOBS] };
    case 'profile':
      return { title: 'Profile', app: null, links: [PORTFOLIO, link('go-settings', 'Settings', '/settings')] };
    case 'settings':
      return { title: 'Settings', app: null, links: [link('go-profile', 'Profile', '/profile')] };
    case 'welcome':
      return { title: 'Welcome', app: 'home', links: [PROJECTS] };
    case 'admin':
      return {
        title: 'Admin',
        app: null,
        links: [
          link('go-admin-users', 'Users', '/admin/users'),
          link('go-admin-errors', 'Errors', '/admin/errors'),
          link('go-admin-analytics', 'Analytics', '/admin/analytics'),
          link('go-admin-audit', 'Audit log', '/admin/audit-logs'),
        ].filter((l) => l.href !== pathname),
      };
    default:
      return { title: first.replace(/-/g, ' '), app: null, links: [TODAY, PROJECTS] };
  }
}

/** Keys the Caps Lock layer gives the controls on show, left to right. */
export const CONTROL_KEYS = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i'] as const;
