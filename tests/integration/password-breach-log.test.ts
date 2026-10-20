import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, anonClient, adminClient, type Cast } from './support/personas';

// A refused, breached password is logged once: a keyed hash of the address, the
// count and the screen — never the address or password. Anyone can write (sign-up
// is signed out) but only through the function; only admins read.
let cast: Cast;
const TAG = `it-${Date.now().toString(36)}`;
const addr = (n: string) => `${n}.${TAG}@example.com`;

beforeAll(async () => {
  cast = await createCast();
  expect((await adminClient().from('profiles').update({ is_admin: true }).eq('id', cast.sam.id)).error).toBeNull();
});
afterAll(async () => {
  await adminClient().from('audit_logs').delete().eq('action', 'password_breach_detected');
  await adminClient().from('profiles').update({ is_admin: false }).eq('id', cast.sam.id);
  await destroyCast(cast);
});

const log = (client: ReturnType<typeof anonClient>, email: string, count = 7, context = 'signup') =>
  client.rpc('log_password_breach', { p_email: email, p_breach_count: count, p_context: context } as never);
const rows = async () =>
  (await adminClient().from('audit_logs').select('*').eq('action', 'password_breach_detected').order('created_at', { ascending: false })).data ?? [];

describe('writing', () => {
  it('signed-out and signed-in callers log; the row holds a hash, the count and the screen — no address', async () => {
    expect((await log(anonClient(), addr('anon'), 12, 'signup')).error).toBeNull();
    expect((await log(cast.jordan.client, cast.jordan.email, 3, 'change')).error).toBeNull();
    const all = await rows();
    const anon = all.find((r) => r.user_id === null);
    const crew = all.find((r) => r.user_id === cast.jordan.id);
    expect(anon?.details).toMatchObject({ breach_count: 12, context: 'signup' });
    expect(crew?.details).toMatchObject({ breach_count: 3, context: 'change' });
    for (const r of all) {
      const text = JSON.stringify(r);
      expect(text).not.toContain(TAG);
      expect(text).not.toContain(cast.jordan.email);
      expect((r.details as { email_hash: string }).email_hash).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it('the hash is keyed, not a plain SHA-256 of the address, and stable per address', async () => {
    const e = addr('stable');
    await log(anonClient(), e, 1, 'reset');
    await log(anonClient(), e.toUpperCase(), 1, 'reset');
    const mine = (await rows()).filter((r) => (r.details as { context: string }).context === 'reset');
    const hashes = mine.map((r) => (r.details as { email_hash: string }).email_hash);
    expect(hashes).toHaveLength(2);
    expect(hashes[0]).toBe(hashes[1]);
    const { createHash } = await import('node:crypto');
    expect(hashes[0]).not.toBe(createHash('sha256').update(e).digest('hex'));
  });

  it('ignores junk without failing the caller', async () => {
    const before = (await rows()).length;
    for (const [email, count, context] of [['', 5, 'signup'], ['nobody', 5, 'signup'], [addr('x'), 0, 'signup'], [addr('x'), 5, 'drop table']] as const) {
      expect((await log(anonClient(), email, count, context)).error).toBeNull();
    }
    expect((await rows()).length).toBe(before);
  });

  it('one person can’t flood it', async () => {
    for (let i = 0; i < 15; i++) await log(cast.riley.client, addr(`flood${i}`));
    const mine = (await rows()).filter((r) => r.user_id === cast.riley.id);
    expect(mine.length).toBeLessThanOrEqual(10);
  });

  it('nobody can forge a row for someone else, or touch the secret', async () => {
    const forged = await cast.jordan.client.from('audit_logs').insert({ user_id: cast.sam.id, action: 'password_breach_detected', resource_type: 'auth' } as never);
    expect(forged.error).not.toBeNull();
    const anonInsert = await anonClient().from('audit_logs').insert({ action: 'password_breach_detected', resource_type: 'auth' } as never);
    expect(anonInsert.error).not.toBeNull();
    expect((await cast.sam.client.schema('internal' as never).from('password_breach_secret' as never).select('*')).error).not.toBeNull();
  });
});

describe('reading', () => {
  it('only admins read it: Sam ✅, Jordan and Riley ❌, signed out ❌', async () => {
    expect(((await cast.sam.client.from('audit_logs').select('id').eq('action', 'password_breach_detected')).data ?? []).length).toBeGreaterThan(0);
    expect((await cast.jordan.client.from('audit_logs').select('id').eq('action', 'password_breach_detected')).data ?? []).toEqual([]);
    expect((await cast.riley.client.from('audit_logs').select('id').eq('action', 'password_breach_detected')).data ?? []).toEqual([]);
    expect((await anonClient().from('audit_logs').select('id').eq('action', 'password_breach_detected')).data ?? []).toEqual([]);
  });
});
