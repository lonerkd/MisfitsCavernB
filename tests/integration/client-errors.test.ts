import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, anonClient, adminClient, type Cast } from './support/personas';

// The suite's own error log: anyone can report (signed in or not), fields are
// trimmed, reporting is rate-limited, and only admins can read or clear it.
let cast: Cast;
const TAG = `it-${Date.now().toString(36)}`;

beforeAll(async () => {
  cast = await createCast();
  expect((await adminClient().from('profiles').update({ is_admin: true }).eq('id', cast.sam.id)).error).toBeNull();
});
afterAll(async () => {
  await adminClient().from('client_errors').delete().like('message', `%${TAG}%`);
  await adminClient().from('profiles').update({ is_admin: false }).eq('id', cast.sam.id);
  await destroyCast(cast);
});

const report = (client: ReturnType<typeof anonClient>, message: string, over: Partial<Record<string, string>> = {}) =>
  client.rpc('report_client_error', {
    p_kind: 'window', p_message: message, p_stack: 'at x (a.js:1:1)', p_path: '/studio', p_digest: '', p_release: 'test', p_user_agent: 'vitest',
    ...over,
  } as never);

const logged = async (like: string) => (await adminClient().from('client_errors').select('*').like('message', `%${like}%`)).data ?? [];

describe('reporting', () => {
  it('signed-in and signed-out visitors can report; the reporter is recorded', async () => {
    expect((await report(cast.jordan.client, `crew boom ${TAG}`)).error).toBeNull();
    expect((await report(anonClient(), `anon boom ${TAG}`)).error).toBeNull();
    const [crew] = await logged(`crew boom ${TAG}`);
    const [anon] = await logged(`anon boom ${TAG}`);
    expect(crew).toMatchObject({ user_id: cast.jordan.id, kind: 'window', path: '/studio', release: 'test' });
    expect(anon.user_id).toBeNull();
  });

  it('trims oversized fields and ignores junk without failing the caller', async () => {
    expect((await report(cast.riley.client, `${TAG} ${'x'.repeat(3000)}`, { p_path: '/' + 'p'.repeat(900) })).error).toBeNull();
    const [row] = await logged(`${TAG} xxx`);
    expect(row.message).toHaveLength(1000);
    expect(row.path).toHaveLength(300);
    expect((await report(cast.riley.client, `bad kind ${TAG}`, { p_kind: 'drop table' })).error).toBeNull();
    expect((await report(cast.riley.client, '   ')).error).toBeNull();
    expect(await logged(`bad kind ${TAG}`)).toEqual([]);
  });

  it('one person can’t flood it', async () => {
    for (let i = 0; i < 25; i++) await report(cast.riley.client, `flood ${i} ${TAG}`);
    const rows = (await adminClient().from('client_errors').select('id').eq('user_id', cast.riley.id).gte('created_at', new Date(Date.now() - 60_000).toISOString())).data ?? [];
    expect(rows.length).toBeLessThanOrEqual(20);
  });

  it('nobody writes to the table directly', async () => {
    const direct = await cast.jordan.client.from('client_errors').insert({ kind: 'window', message: `direct ${TAG}` } as never);
    expect(direct.error).not.toBeNull();
  });
});

describe('reading and clearing', () => {
  it('only admins read it', async () => {
    expect((await cast.sam.client.from('client_errors').select('id').like('message', `%${TAG}%`)).data?.length).toBeGreaterThan(0);
    expect((await cast.jordan.client.from('client_errors').select('id')).data).toEqual([]);
    expect((await anonClient().from('client_errors').select('id')).data ?? []).toEqual([]);
  });

  it('only admins clear it', async () => {
    const [row] = await logged(`crew boom ${TAG}`);
    await cast.jordan.client.from('client_errors').delete().eq('id', row.id);
    expect(await logged(`crew boom ${TAG}`)).toHaveLength(1);
    await cast.sam.client.from('client_errors').delete().eq('id', row.id);
    expect(await logged(`crew boom ${TAG}`)).toHaveLength(0);
  });
});
