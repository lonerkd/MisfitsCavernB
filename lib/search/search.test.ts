import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase/client', () => ({ supabase: {} }));
const { HIT_KINDS, hitTarget, searchable } = await import('./search');

describe('search results', () => {
  it('open where the thing lives', () => {
    expect(hitTarget({ kind: 'project', id: 'p1', project_id: 'p1' })).toEqual({ href: '/projects/p1', needsProject: false });
    expect(hitTarget({ kind: 'script', id: 's1', project_id: 'p1' }).href).toBe('/editor?script=s1');
    expect(hitTarget({ kind: 'task', id: 't1', project_id: 'p1' }).href).toBe('/projects/p1#production');
    expect(hitTarget({ kind: 'person', id: 'u1', project_id: null }).href).toBe('/crew/u1');
    expect(hitTarget({ kind: 'location', id: 'l1', project_id: 'p1' })).toEqual({ href: '/studio?tab=production&view=locations', needsProject: true });
  });

  it('every kind has a name and a place', () => {
    for (const kind of Object.keys(HIT_KINDS) as Array<keyof typeof HIT_KINDS>) {
      expect(hitTarget({ kind, id: 'x', project_id: 'p' }).href).toMatch(/^\//);
    }
  });

  it('asks only when there is something to find', () => {
    expect(searchable('a')).toBe(false);
    expect(searchable(' . ')).toBe(false);
    expect(searchable('ab')).toBe(true);
    expect(searchable('é1')).toBe(true);
  });
});
