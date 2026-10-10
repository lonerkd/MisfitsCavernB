// Which notification types a person has switched off (Settings ›
// Notifications, profiles.notification_prefs). Shared by the bell in the app
// and the push sender on the server — kept free of any client.

export interface NotificationPrefs { replies: boolean; jobs: boolean; product: boolean; leak_check: boolean }
export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = { replies: true, jobs: true, product: false, leak_check: true };

const TYPE_PREF: Record<string, keyof NotificationPrefs> = {
  reply: 'replies', comment: 'replies', job: 'jobs', application: 'jobs', product: 'product',
};

export function typeEnabled(type: string, prefs: NotificationPrefs = DEFAULT_NOTIFICATION_PREFS): boolean {
  const key = TYPE_PREF[type];
  if (!key) return true;
  return prefs[key] !== false;
}

/** A stored prefs value (any shape) over the defaults. */
export function readPrefs(stored: unknown): NotificationPrefs {
  return { ...DEFAULT_NOTIFICATION_PREFS, ...((stored && typeof stored === 'object' ? stored : {}) as Partial<NotificationPrefs>) };
}
