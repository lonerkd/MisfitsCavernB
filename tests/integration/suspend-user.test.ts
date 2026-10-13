import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, adminClient, anonClient, createPersona, PASSWORD, type Cast, type Persona } from './support/personas';

// Suspending an account: an admin can stop a person signing in (and refreshing a
// session they already have) without deleting anything; they cannot suspend
// themselves or another admin; nobody else can; it is on the record and
// reversible. As personas: Sam is the platform admin, Riley is the one
// suspended, Jordan is an ordinary member, Casey is a second admin.
let cast: Cast;
let casey: Persona;
let email = '';

const signsIn = async () => !(await anonClient().auth.signInWithPassword({ email, password: PASSWORD })).error;

beforeAll(async () => {
  cast = await createCast();
  casey = await createPersona('casey');
  email = cast.riley.email;
  const db = adminClient();
  await db.from('profiles').update({ is_admin: true }).in('id', [cast.sam.id, casey.id]);
});
afterAll(async () => {
  await adminClient().from('audit_logs').delete().eq('resource_id', cast.riley.id);
  await destroyCast({ ...cast, casey });
});

describe('who can suspend', () => {
  it('a member and anon cannot', async () => {
    expect((await cast.jordan.client.rpc('admin_set_suspended', { p_user: cast.riley.id, p_suspended: true })).error).not.toBeNull();
    expect((await anonClient().rpc('admin_set_suspended', { p_user: cast.riley.id, p_suspended: true })).error).not.toBeNull();
    expect(await signsIn()).toBe(true);
  });

  it('an admin cannot suspend themselves or another admin', async () => {
    expect((await cast.sam.client.rpc('admin_set_suspended', { p_user: cast.sam.id, p_suspended: true })).error?.message).toMatch(/your own account/i);
    expect((await cast.sam.client.rpc('admin_set_suspended', { p_user: casey.id, p_suspended: true })).error?.message).toMatch(/admin/i);
  });

  it('a person that does not exist is a plain error', async () => {
    expect((await cast.sam.client.rpc('admin_set_suspended', { p_user: '00000000-0000-0000-0000-000000000000', p_suspended: true })).error).not.toBeNull();
  });
});

describe('suspending', () => {
  it('stops sign-in and session refresh, and is listed and recorded', async () => {
    const { error } = await cast.sam.client.rpc('admin_set_suspended', { p_user: cast.riley.id, p_suspended: true });
    expect(error).toBeNull();
    expect(await signsIn()).toBe(false);
    const refused = (await anonClient().auth.signInWithPassword({ email, password: PASSWORD })).error;
    expect(refused?.message).toMatch(/banned/i); // the auth service's own reason, not a database error
    expect((await cast.riley.client.auth.refreshSession()).error).not.toBeNull();
    const list = (await cast.sam.client.rpc('admin_list_users')).data ?? [];
    expect(list.find((u) => u.id === cast.riley.id)?.suspended).toBe(true);
    expect(list.find((u) => u.id === cast.jordan.id)?.suspended).toBe(false);
    const log = (await adminClient().from('audit_logs').select('user_id, action, resource_type').eq('resource_id', cast.riley.id)).data ?? [];
    expect(log).toEqual([{ user_id: cast.sam.id, action: 'admin_suspend_user', resource_type: 'user' }]);
  });

  it('their words and projects stay (nothing is deleted)', async () => {
    expect((await adminClient().from('profiles').select('id').eq('id', cast.riley.id)).data).toHaveLength(1);
  });

  it('who is suspended is not public', async () => {
    const seen = await cast.jordan.client.from('profiles').select('*').eq('id', cast.riley.id);
    expect(seen.error).not.toBeNull(); // select('*') on profiles is refused
    expect((await cast.jordan.client.from('profiles').select('suspended_at').eq('id', cast.riley.id)).error).not.toBeNull();
  });

  it('an admin lifts it and they can sign in again', async () => {
    expect((await cast.sam.client.rpc('admin_set_suspended', { p_user: cast.riley.id, p_suspended: false })).error).toBeNull();
    expect(await signsIn()).toBe(true);
    const list = (await cast.sam.client.rpc('admin_list_users')).data ?? [];
    expect(list.find((u) => u.id === cast.riley.id)?.suspended).toBe(false);
  });
});
