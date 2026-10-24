// How the audit log reads: one plain sentence per action, where to look at the
// thing it was about, and a colour that tells a person the kind of event at a
// glance. Pure — the admin page and its tests share it.

const SENTENCES: Record<string, string> = {
  user_login: 'Signed in',
  user_logout: 'Signed out',
  user_created: 'Created an account',
  user_deleted: 'Deleted an account',
  role_changed: 'Changed a role',
  project_created: 'Created a project',
  project_deleted: 'Deleted a project',
  project_updated: 'Updated a project',
  script_created: 'Created a script',
  script_deleted: 'Deleted a script',
  script_updated: 'Updated a script',
  crew_invited: 'Invited crew',
  crew_removed: 'Removed crew',
  crew_role_changed: 'Changed a crew role',
  job_created: 'Posted a job',
  job_closed: 'Closed a job',
  password_breach_detected: 'A breached password was refused',
  admin_action: 'Took an admin action',
  admin_close_job: 'Closed a reported job (admin)',
  admin_hide_message: 'Hid a reported message (admin)',
  admin_unhide_message: 'Brought a message back (admin)',
  admin_suspend_user: 'Suspended an account (admin)',
  admin_unsuspend_user: 'Lifted a suspension (admin)',
};

/** The action a log row records, in words. An unknown action reads as its own name, lower-cased. */
export function describeAction(action: string, resourceType = ''): string {
  if (SENTENCES[action]) return SENTENCES[action];
  const words = action.replace(/_/g, ' ').toLowerCase();
  return resourceType && !words.includes(resourceType) ? `${words} (${resourceType})` : words;
}

/** Where to look at what an entry was about; null when there is no page for it. */
export function resourceHref(resourceType: string, resourceId?: string | null): string | null {
  if (!resourceId) return null;
  if (resourceType === 'job') return `/jobs/${resourceId}`;
  if (resourceType === 'user') return `/crew/${resourceId}`;
  if (resourceType === 'project') return `/projects/${resourceId}`;
  return null;
}

/** A colour for the kind of event: admin actions stand out (what lifts one is green); the rest as before. */
export function actionTone(action: string): string {
  if (action.startsWith('admin_')) return action.startsWith('admin_unhide') || action.startsWith('admin_unsuspend') ? '#10b981' : '#e8431a';
  if (action.includes('created') || action.includes('invited')) return '#10b981';
  if (action.includes('deleted') || action.includes('removed')) return '#ef4444';
  if (action.includes('changed') || action.includes('updated')) return '#f59e0b';
  if (action.includes('login') || action.includes('logout')) return '#6366f1';
  return '#0099ff';
}

/**
 * What the extra details say, short enough for a table cell. When too long it keeps whole
 * `key: value` pairs and ends with an ellipsis; only a first pair that alone is too long is cut mid-value.
 */
export function describeDetails(details: Record<string, unknown> | null | undefined, max = 80): string {
  if (!details || Object.keys(details).length === 0) return '-';
  const pairs = Object.entries(details).map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`);
  const text = pairs.join(', ');
  if (text.length <= max) return text;
  let kept = '';
  for (const pair of pairs) {
    const next = kept ? `${kept}, ${pair}` : pair;
    if (next.length + 1 > max) break;
    kept = next;
  }
  return kept ? `${kept}…` : `${pairs[0].slice(0, max - 1)}…`;
}
