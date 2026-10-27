import { describe, it, expect } from 'vitest';
import { FLAGS, flagEnv, flagOn, flagForPath, routeGate, type FlagDef } from './flags';

const T: Record<string, FlagDef> = {
  wip: { local: true, preview: true, production: 'off', routes: ['/wip'], since: '2026-10-25', note: '' },
  staff: { local: true, preview: true, production: 'admins', routes: ['/staff', '/api/staff'], since: '2026-10-25', note: '' },
  live: { local: true, preview: false, production: 'on', since: '2026-10-25', note: '' },
};
const on = (name: string, env: 'local' | 'preview' | 'production', isAdmin?: boolean) =>
  flagOn(name as never, { env, isAdmin }, T);

describe('flagEnv', () => {
  it('reads Vercel’s environment, local when unset', () => {
    expect(flagEnv({ VERCEL_ENV: 'production' })).toBe('production');
    expect(flagEnv({ NEXT_PUBLIC_VERCEL_ENV: 'preview' })).toBe('preview');
    expect(flagEnv({ VERCEL_ENV: 'development' })).toBe('local');
    expect(flagEnv({})).toBe('local');
  });
});

describe('flagOn', () => {
  it('follows each environment', () => {
    expect(on('wip', 'local')).toBe(true);
    expect(on('wip', 'preview')).toBe(true);
    expect(on('wip', 'production')).toBe(false);
    expect(on('wip', 'production', true)).toBe(false);
    expect(on('live', 'preview')).toBe(false);
    expect(on('live', 'production')).toBe(true);
  });

  it('admins-only in production', () => {
    expect(on('staff', 'production')).toBe(false);
    expect(on('staff', 'production', false)).toBe(false);
    expect(on('staff', 'production', true)).toBe(true);
  });

  it('an unknown flag is off', () => {
    expect(on('nope', 'local')).toBe(false);
  });
});

describe('routes', () => {
  it('maps paths to their flag by prefix', () => {
    expect(flagForPath('/wip', T)).toBe('wip');
    expect(flagForPath('/wip/a', T)).toBe('wip');
    expect(flagForPath('/wipe', T)).toBeNull();
    expect(flagForPath('/api/staff/x', T)).toBe('staff');
  });

  it('gates per environment', () => {
    expect(routeGate('/other', 'production', T)).toBe('pass');
    expect(routeGate('/wip', 'local', T)).toBe('pass');
    expect(routeGate('/wip', 'preview', T)).toBe('pass');
    expect(routeGate('/wip', 'production', T)).toBe('not-found');
    expect(routeGate('/staff', 'production', T)).toBe('admin-check');
    expect(routeGate('/staff', 'preview', T)).toBe('pass');
  });
});

describe('the registry', () => {
  it('has a date and a note on every flag', () => {
    for (const [name, f] of Object.entries(FLAGS)) {
      expect(f.since, name).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(f.note.length, name).toBeGreaterThan(0);
    }
  });

  it('has no flag left fully on for more than 30 days — delete it and its uses', () => {
    const stale = Object.entries(FLAGS as Record<string, FlagDef>)
      .filter(([, f]) => f.local && f.preview && f.production === 'on')
      .filter(([, f]) => Date.now() - Date.parse(f.since) > 30 * 86_400_000)
      .map(([name]) => name);
    expect(stale).toEqual([]);
  });
});
