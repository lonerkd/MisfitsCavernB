// What the island says about a page that hasn't described itself. Pages with
// live state publish their own descriptor (usePillStage); every other route
// still gets a name, the app it belongs to, and the places people go next
// from there — so the island is never blank and never a dead end.

import {
  ADMIN_LINKS, CREW, JOBS, LOUNGE, PORTFOLIO, PORTFOLIO_MANAGE, PROFILE, PROJECTS,
  SCRIPT, SETTINGS, STUDIO, TODAY, projectLink, type IslandLink,
} from './links';

export type { IslandLink };

export type IslandApp = 'home' | 'today' | 'editor' | 'studio' | 'lounge' | 'portfolio';

export interface IslandRoute {
  /** Short name of the place, shown beside the dot. */
  title: string;
  /** The app whose icon and colour the island wears here. */
  app: IslandApp | null;
  /** Where people usually go next from here. */
  links: IslandLink[];
  /** One level up — where the back chevron goes. Null on top-level places. */
  back: { label: string; href: string } | null;
}

/** The island's fallback for `pathname`. `hasProject`: a project is open, so its tools are worth offering. */
export function islandRoute(pathname: string, hasProject = false): IslandRoute {
  return { ...describe(pathname, hasProject), back: backTarget(pathname) };
}

/** The parent of `pathname`, or null for a top-level place. */
function backTarget(pathname: string): IslandRoute['back'] {
  const [first = '', second = '', third = ''] = pathname.split('/').filter(Boolean);
  const project = second ? { label: 'Project', href: `/projects/${second}` } : null;
  switch (first) {
    case 'projects':
      if (!second) return null;
      return third ? project : { label: 'Projects', href: '/projects' };
    case 'studio': case 'editor': case 'lounge': case 'soundtrack':
      return project ?? { label: 'Projects', href: '/projects' };
    case 'hub': return second ? { label: 'Hub', href: '/hub' } : null;
    case 'crew': return second ? { label: 'Crew', href: '/crew' } : null;
    case 'jobs': return second ? { label: 'Jobs board', href: '/jobs' } : null;
    case 'portfolio': return second ? { label: 'Portfolio', href: '/portfolio' } : null;
    case 'admin': return second ? { label: 'Admin', href: '/admin' } : null;
    default: return null;
  }
}

function describe(pathname: string, hasProject = false): Omit<IslandRoute, 'back'> {
  const [first = '', second = '', third = ''] = pathname.split('/').filter(Boolean);
  const tools = hasProject ? [SCRIPT, STUDIO, LOUNGE] : [];

  switch (first) {
    case '':
      return { title: 'Hub', app: 'home', links: [TODAY, PROJECTS] };
    case 'hub':
      return { title: second ? 'Hub post' : 'Hub', app: 'home', links: [TODAY, PROJECTS] };
    case 'today':
      return { title: 'Today', app: 'today', links: [PROJECTS, ...tools] };
    case 'projects':
      if (!second) return { title: 'Projects', app: 'home', links: [TODAY] };
      if (third === 'pitch') return { title: 'Pitch', app: 'home', links: [projectLink(second), STUDIO] };
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
      return { title: 'Portfolio', app: 'portfolio', links: [PORTFOLIO_MANAGE] };
    case 'showcase':
      return { title: 'Showcase', app: 'portfolio', links: [PORTFOLIO] };
    case 'jobs':
      return second ? { title: 'Job', app: null, links: [JOBS, CREW] } : { title: 'Jobs board', app: null, links: [CREW] };
    case 'crew':
      return second ? { title: 'Crew member', app: null, links: [CREW, JOBS] } : { title: 'Crew', app: null, links: [JOBS] };
    case 'profile':
      return { title: 'Profile', app: null, links: [PORTFOLIO, SETTINGS] };
    case 'settings':
      return { title: 'Settings', app: null, links: [PROFILE] };
    case 'welcome':
      return { title: 'Welcome', app: 'home', links: [PROJECTS] };
    case 'admin':
      return {
        title: 'Admin',
        app: null,
        links: ADMIN_LINKS.filter((l) => l.href !== pathname),
      };
    default:
      return { title: first.replace(/-/g, ' '), app: null, links: [TODAY, PROJECTS] };
  }
}

/** Keys the Caps Lock layer gives the controls on show, left to right. */
export const CONTROL_KEYS = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i'] as const;
