// The island's link definitions — where people can go next. Routing logic
// (routes.ts) decides which of these a page offers; the places themselves,
// their ids, labels and hrefs, live only here.

export interface IslandLink {
  id: string;
  label: string;
  href: string;
}

const link = (id: string, label: string, href: string): IslandLink => ({ id, label, href });

export const PROJECTS = link('go-projects', 'Projects', '/projects');
export const TODAY = link('go-today', 'Today', '/today');
export const SCRIPT = link('go-script', 'Script', '/editor');
export const STUDIO = link('go-studio', 'Studio', '/studio');
export const LOUNGE = link('go-lounge', 'Lounge', '/lounge');
export const JOBS = link('go-jobs', 'Jobs board', '/jobs');
export const CREW = link('go-crew', 'Crew', '/crew');
export const PORTFOLIO = link('go-portfolio', 'Portfolio', '/portfolio');
export const PORTFOLIO_MANAGE = link('go-portfolio-manage', 'Manage', '/portfolio/manage');
export const PROFILE = link('go-profile', 'Profile', '/profile');
export const SETTINGS = link('go-settings', 'Settings', '/settings');

export const ADMIN_LINKS: readonly IslandLink[] = [
  link('go-admin-users', 'Users', '/admin/users'),
  link('go-admin-errors', 'Errors', '/admin/errors'),
  link('go-admin-analytics', 'Analytics', '/admin/analytics'),
  link('go-admin-audit', 'Audit log', '/admin/audit-logs'),
];

/** The link to one project's page. */
export const projectLink = (id: string): IslandLink => link('go-project', 'Project', `/projects/${id}`);
