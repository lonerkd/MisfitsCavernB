import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, adminClient, type Cast } from './support/personas';

// Admin rights gate /admin (user management, audit logs). They must never be
// self-granted, and only an admin may grant or revoke them.
let cast: Cast;

beforeAll(async () => {
  cast = await createCast();
  // Sam is made an admin out-of-band (as a platform operator would).
  const { error } = await adminClient().from('profiles').update({ is_admin: true }).eq('id', cast.sam.id);
  if (error) throw error;
});

afterAll(async () => {
  await destroyCast(cast);
});

const isAdmin = async (id: string) => (await adminClient().from('profiles').select('is_admin').eq('id', id).single()).data?.is_admin;

describe('admin rights', () => {
  it('a user cannot make themselves an admin by editing their profile', async () => {
    const { error } = await cast.riley.client.from('profiles').update({ is_admin: true }).eq('id', cast.riley.id);
    expect(error?.message).toMatch(/only be granted by an admin/);
    expect(await isAdmin(cast.riley.id)).toBe(false);
  });

  it('ordinary profile edits still work', async () => {
    const { error } = await cast.riley.client.from('profiles').update({ bio: 'Gaffer, Toronto' }).eq('id', cast.riley.id);
    expect(error).toBeNull();
  });

  it('a non-admin cannot use set_user_admin', async () => {
    const { error } = await cast.riley.client.rpc('set_user_admin', { p_user: cast.riley.id, p_admin: true });
    expect(error?.message).toMatch(/Only an admin/);
    expect(await isAdmin(cast.riley.id)).toBe(false);
  });

  it('an admin can grant and revoke admin rights for others', async () => {
    expect((await cast.sam.client.rpc('set_user_admin', { p_user: cast.jordan.id, p_admin: true })).error).toBeNull();
    expect(await isAdmin(cast.jordan.id)).toBe(true);
    expect((await cast.sam.client.rpc('set_user_admin', { p_user: cast.jordan.id, p_admin: false })).error).toBeNull();
    expect(await isAdmin(cast.jordan.id)).toBe(false);
  });

  it('an admin cannot remove their own rights', async () => {
    const { error } = await cast.sam.client.rpc('set_user_admin', { p_user: cast.sam.id, p_admin: false });
    expect(error?.message).toMatch(/your own admin rights/);
    expect(await isAdmin(cast.sam.id)).toBe(true);
  });
});

describe('platform analytics', () => {
  it('are admins-only and count the whole platform, not the admin’s own rows', async () => {
    expect((await cast.riley.client.rpc('admin_platform_analytics', { p_since: new Date(Date.now() - 86400000).toISOString() })).error).not.toBeNull();
    await adminClient().from('projects').insert({ title: 'Done film', creator_id: cast.riley.id, status: 'completed', start_date: '2026-01-01', end_date: '2026-01-31' });
    const { data, error } = await cast.sam.client.rpc('admin_platform_analytics', { p_since: new Date(Date.now() - 86400000).toISOString() });
    expect(error).toBeNull();
    expect(Number(data![0].completed_projects)).toBeGreaterThanOrEqual(1);
    expect(Number(data![0].active_users)).toBeGreaterThanOrEqual(3);
    expect(data![0].avg_project_days).not.toBeNull();
  });
});
