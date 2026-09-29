import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { adminClient, anonClient, createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject } from './support/project';

// Availability as personas: everyone keeps their own dates away. Sam, who
// runs the production, sees when Jordan (on the crew) is away — the dates,
// never the note — and nothing of Riley, who isn't on it. Crew who don't plan
// the production see nobody's dates.
let cast: Cast;
let projectId: string;
const iso = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Away days'));
});
afterAll(async () => { await destroyCast(cast); });

describe('unavailability', () => {
  it('is yours to keep, and only yours', async () => {
    const mine = await cast.jordan.client.from('unavailability').insert({ user_id: cast.jordan.id, starts_on: iso(10), ends_on: iso(12), note: 'another shoot' }).select('id').single();
    expect(mine.error).toBeNull();
    expect((await cast.riley.client.from('unavailability').insert({ user_id: cast.riley.id, starts_on: iso(10), ends_on: iso(10), note: 'wedding' })).error).toBeNull();

    // Nobody reads, adds to or deletes someone else's.
    expect((await cast.sam.client.from('unavailability').select('id').eq('user_id', cast.jordan.id)).data).toEqual([]);
    expect((await cast.sam.client.from('unavailability').insert({ user_id: cast.jordan.id, starts_on: iso(1), ends_on: iso(1) })).error).not.toBeNull();
    await cast.sam.client.from('unavailability').delete().eq('id', mine.data!.id);
    expect((await adminClient().from('unavailability').select('id').eq('id', mine.data!.id)).data).toHaveLength(1);
    expect((await anonClient().from('unavailability').select('id')).data ?? []).toEqual([]);
  });

  it('keeps ranges sensible', async () => {
    expect((await cast.jordan.client.from('unavailability').insert({ user_id: cast.jordan.id, starts_on: iso(5), ends_on: iso(4) })).error).not.toBeNull();
    expect((await cast.jordan.client.from('unavailability').insert({ user_id: cast.jordan.id, starts_on: iso(1), ends_on: iso(500) })).error).not.toBeNull();
    expect((await cast.jordan.client.from('unavailability').insert({ user_id: cast.jordan.id, starts_on: iso(1), ends_on: iso(1), note: 'x'.repeat(201) })).error).not.toBeNull();
  });
});

describe('project_availability', () => {
  it('shows the production’s planners who on it is away — dates only', async () => {
    const { data, error } = await cast.sam.client.rpc('project_availability', { p_project: projectId });
    expect(error).toBeNull();
    expect(data).toEqual([{ user_id: cast.jordan.id, starts_on: iso(10), ends_on: iso(12) }]);
  });

  it('only for the dates asked about', async () => {
    const { data } = await cast.sam.client.rpc('project_availability', { p_project: projectId, p_from: iso(13), p_to: iso(40) });
    expect(data).toEqual([]);
  });

  it('shows crew who don’t plan it, outsiders and strangers nothing', async () => {
    await adminClient().from('project_crew').update({ role: 'viewer' }).eq('project_id', projectId).eq('user_id', cast.jordan.id);
    expect((await cast.jordan.client.rpc('project_availability', { p_project: projectId })).data).toEqual([]);
    expect((await cast.riley.client.rpc('project_availability', { p_project: projectId })).data).toEqual([]);
    expect((await anonClient().rpc('project_availability', { p_project: projectId })).error).not.toBeNull();
    // A lead plans it, and sees the owner's dates too.
    await adminClient().from('project_crew').update({ role: 'lead' }).eq('project_id', projectId).eq('user_id', cast.jordan.id);
    await cast.sam.client.from('unavailability').insert({ user_id: cast.sam.id, starts_on: iso(20), ends_on: iso(20) });
    const lead = (await cast.jordan.client.rpc('project_availability', { p_project: projectId })).data ?? [];
    expect(lead.map((r) => r.user_id).sort()).toEqual([cast.jordan.id, cast.sam.id].sort());
  });
});
