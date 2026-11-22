// Which notification types a person has switched off, and when their phone may buzz (Settings ›
// Notifications, profiles.notification_prefs). Shared by the bell in the app
// and the push sender on the server — kept free of any client. (Whether a push waits for the morning is lib/notifications/quiet.ts: server only.)

/** Quiet hours: no push to the phone between `start` and `end` (24-hour HH:MM, in `tz`, an IANA zone like America/Toronto). The window may cross midnight. */
export interface QuietHours { on: boolean; start: string; end: string; tz: string }
export const DEFAULT_QUIET_HOURS: QuietHours = { on: false, start: '22:00', end: '07:00', tz: 'UTC' };

export interface NotificationPrefs { replies: boolean; jobs: boolean; product: boolean; leak_check: boolean; quiet: QuietHours }
export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = { replies: true, jobs: true, product: false, leak_check: true, quiet: DEFAULT_QUIET_HOURS };

const HHMM = /^([01][0-9]|2[0-3]):([0-5][0-9])$/;
const validZone = (tz: string) => { try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch { return false; } };

const TYPE_PREF: Record<string, 'replies' | 'jobs' | 'product'> = {
  reply: 'replies', comment: 'replies', job: 'jobs', application: 'jobs', product: 'product',
};

export function typeEnabled(type: string, prefs: NotificationPrefs = DEFAULT_NOTIFICATION_PREFS): boolean {
  const key = TYPE_PREF[type];
  if (!key) return true;
  return prefs[key] !== false;
}

/** A stored prefs value (any shape) over the defaults. Only real booleans for known keys are taken, and a quiet-hours block only when its parts are valid; anything else keeps the default. */
export function readPrefs(stored: unknown): NotificationPrefs {
  const prefs: NotificationPrefs = { ...DEFAULT_NOTIFICATION_PREFS, quiet: { ...DEFAULT_QUIET_HOURS } };
  if (!stored || typeof stored !== 'object') return prefs;
  const src = stored as Record<string, unknown>;
  for (const key of ['replies', 'jobs', 'product', 'leak_check'] as const) {
    if (typeof src[key] === 'boolean') prefs[key] = src[key] as boolean;
  }
  const q = src.quiet;
  if (q && typeof q === 'object') {
    const r = q as Record<string, unknown>;
    prefs.quiet = {
      on: r.on === true,
      start: typeof r.start === 'string' && HHMM.test(r.start) ? r.start : DEFAULT_QUIET_HOURS.start,
      end: typeof r.end === 'string' && HHMM.test(r.end) ? r.end : DEFAULT_QUIET_HOURS.end,
      tz: typeof r.tz === 'string' && validZone(r.tz) ? r.tz : DEFAULT_QUIET_HOURS.tz,
    };
  }
  return prefs;
}
