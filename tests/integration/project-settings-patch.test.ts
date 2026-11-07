import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { anonClient, createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject } from './support/project';

// patch_project_settings: only the project's creator changes its settings (the same rule as the "Creators update
// projects" policy); two patches of different keys both survive; crew (even confirmed ones) and outsiders are refused.
let cast: Cast;
let projectId: string;

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Settings'));
});
afterAll(async () => { await destroyCast(cast); });

const patch = (who: Cast['sam'], p: Record<string, unknown>) => (who.client as any).rpc('patch_project_settings', { p_project_id: projectId, p_patch: p as never });

describe('patch_project_settings', () => {
  it('Sam, the owner, merges a patch and gets the merged settings back', async () => {
    const a = await patch(cast.sam, { toolA: { n: 1 } });
    expect(a.error).toBeNull();
    const b = await patch(cast.sam, { toolB: { n: 2 } });
    expect(b.error).toBeNull();
    // Both keys survive: a second save of another key does not overwrite the first.
    expect(b.data).toMatchObject({ toolA: { n: 1 }, toolB: { n: 2 } });
    const { data } = await cast.sam.client.from('projects').select('settings').eq('id', projectId).single();
    expect(data?.settings).toMatchObject({ toolA: { n: 1 }, toolB: { n: 2 } });
  });

  it('a later patch replaces only its own key', async () => {
    const r = await patch(cast.sam, { toolA: { n: 9 } });
    expect(r.data).toMatchObject({ toolA: { n: 9 }, toolB: { n: 2 } });
  });

  it('Jordan, crew on the project, cannot change its settings', async () => {
    const r = await patch(cast.jordan, { toolA: { n: 'hijack' } });
    expect(r.error).not.toBeNull();
    expect(r.error?.code).toBe('42501');
    const { data } = await cast.sam.client.from('projects').select('settings').eq('id', projectId).single();
    expect(data?.settings).toMatchObject({ toolA: { n: 9 } });
  });

  it('Riley, an outsider, cannot, and a patch that is not an object is refused', async () => {
    expect((await patch(cast.riley, { x: 1 })).error?.code).toBe('42501');
    expect((await (cast.sam.client as any).rpc('patch_project_settings', { p_project_id: projectId, p_patch: [1, 2] as never })).error?.code).toBe('22023');
  });

  it('nobody signed out can call it', async () => {
    expect((await (anonClient() as any).rpc('patch_project_settings', { p_project_id: projectId, p_patch: {} as never })).error).not.toBeNull();
  });
});
