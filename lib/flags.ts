// Feature flags: where an unfinished feature is switched on (ADR 0007).
// A flag lives here only while its feature is being finished; once it is on in
// production, delete the flag and every use of it (flags.test.ts fails on a
// flag left fully on for more than 30 days).

export type FlagEnv = 'local' | 'preview' | 'production';

export type FlagDef = {
  local: boolean;
  preview: boolean;
  /** 'admins': on in production for admins only, so the owner can try it on live data. */
  production: 'off' | 'admins' | 'on';
  /** Path prefixes that don't exist where the flag is off (pages and API routes). */
  routes?: readonly string[];
  /** The day the flag was added (YYYY-MM-DD). */
  since: string;
  note: string;
};

export const FLAGS = {
  guest_review: {
    local: true,
    preview: true,
    production: 'admins',
    since: '2026-10-27',
    note: 'Versions and the client review link (Studio › Share › Review). Admin-only in production: the first feature where someone without an account writes, so the owner tries it on live data before it is public.',
  },
  entity_cards: {
    local: true,
    preview: true,
    production: 'admins',
    since: '2026-10-27',
    note: 'The link layer\'s card: open a scene, character, location or shoot day from the stripboard and call sheet. Admin-only in production until the owner has tried it on live data.',
  },
  hub_case_studies: {
    local: true,
    preview: true,
    production: 'admins',
    since: '2026-10-26',
    note: 'The hub\'s Case studies tab, the admin editor\'s case-study kind, and the owner\'s "allow a case study" switch in Share. Admin-only in production until the owner has tried it on live data.',
  },
  hub_help: {
    local: true,
    preview: true,
    production: 'admins',
    routes: ['/hub/help', '/admin/support'],
    since: '2026-10-26',
    note: 'The hub\'s Help: support cases and the admin queue. Admin-only in production until the owner has tried it on live data.',
  },
  hub_status: {
    local: true,
    preview: true,
    production: 'admins',
    since: '2026-10-26',
    note: 'The hub\'s Status tab (incidents) and the suite-wide incident banner. Admin-only in production until the owner has tried it on live data.',
  },
  discord_signin_preview: {
    local: true,
    preview: false,
    production: 'on',
    since: '2026-10-25',
    note: 'The Discord sign-in button. Off on previews: Discord sign-in is not set up for the staging project.',
  },
} as const satisfies Record<string, FlagDef>;

export type FlagName = keyof typeof FLAGS;

export function flagEnv(env: Record<string, string | undefined> = process.env): FlagEnv {
  const v = env.NEXT_PUBLIC_VERCEL_ENV ?? env.VERCEL_ENV;
  if (v === 'production') return 'production';
  if (v === 'preview') return 'preview';
  return 'local';
}

export function flagOn(
  name: FlagName,
  ctx: { env?: FlagEnv; isAdmin?: boolean } = {},
  flags: Record<string, FlagDef> = FLAGS,
): boolean {
  const f = flags[name];
  if (!f) return false;
  const env = ctx.env ?? flagEnv();
  if (env === 'local') return f.local;
  if (env === 'preview') return f.preview;
  return f.production === 'on' || (f.production === 'admins' && ctx.isAdmin === true);
}

/** The flag that owns a path, if any. */
export function flagForPath(path: string, flags: Record<string, FlagDef> = FLAGS): string | null {
  for (const [name, f] of Object.entries(flags)) {
    if (f.routes?.some((r) => path === r || path.startsWith(r + '/'))) return name;
  }
  return null;
}

/**
 * What the proxy does with a path: 'pass' (no flag, or on), 'admin-check'
 * (on in production for admins only — the proxy asks who is signed in), or
 * 'not-found'.
 */
export function routeGate(
  path: string,
  env: FlagEnv,
  flags: Record<string, FlagDef> = FLAGS,
): 'pass' | 'admin-check' | 'not-found' {
  const name = flagForPath(path, flags);
  if (!name) return 'pass';
  const f = flags[name];
  if (env === 'local') return f.local ? 'pass' : 'not-found';
  if (env === 'preview') return f.preview ? 'pass' : 'not-found';
  if (f.production === 'on') return 'pass';
  return f.production === 'admins' ? 'admin-check' : 'not-found';
}
