import { describe, it, expect, afterAll } from 'vitest';
import { createPersona, destroyCast, anonClient, type Persona } from './support/personas';

// Signing up must create the profile row the whole suite keys off
// (public.handle_new_user on auth.users), using the chosen username.
const made: Persona[] = [];

afterAll(async () => {
  await destroyCast(Object.fromEntries(made.map((p, i) => [i, p])));
});

describe('signup', () => {
  it('creates a profile with the chosen username, readable by the new user', async () => {
    const p = await createPersona('signup');
    made.push(p);
    const { data, error } = await p.client.from('profiles').select('id, username, status').eq('id', p.id).single();
    expect(error).toBeNull();
    expect(data).toEqual({ id: p.id, username: p.username, status: 'OPEN' });
  });

  it('a new user can only update their own profile', async () => {
    const [a, b] = await Promise.all([createPersona('ownera'), createPersona('ownerb')]);
    made.push(a, b);
    const own = await a.client.from('profiles').update({ bio: 'mine' }).eq('id', a.id).select('bio');
    expect(own.data).toEqual([{ bio: 'mine' }]);
    const other = await a.client.from('profiles').update({ bio: 'hijack' }).eq('id', b.id).select('bio');
    expect(other.data).toEqual([]);
  });

  it('profiles are publicly readable (crew directory), but anon cannot write', async () => {
    const p = await createPersona('public');
    made.push(p);
    const read = await anonClient().from('profiles').select('username').eq('id', p.id);
    expect(read.data).toEqual([{ username: p.username }]);
    const write = await anonClient().from('profiles').update({ bio: 'x' }).eq('id', p.id).select('id');
    expect(write.data ?? []).toEqual([]);
  });
});
