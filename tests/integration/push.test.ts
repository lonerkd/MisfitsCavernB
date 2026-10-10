import { createECDH, randomBytes } from 'node:crypto';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client as Pg } from 'pg';
import { adminClient, anonClient, createCast, destroyCast, type Cast } from './support/personas';
import { dispatchNotification, type PushSend, type PushTarget } from '@/lib/push/dispatch';

// Web Push (20261008010000_web_push): who may hold a device's subscription,
// what the dispatcher sends (and to whom, and when it doesn't), and that a new
// notification queues a post to the dispatcher only when push is configured.
let cast: Cast;
const admin = () => adminClient();

/** A browser-like subscription: a P-256 public key and a 16-byte secret. */
function device(endpoint = `https://push.example.test/${randomBytes(8).toString('hex')}`) {
  const ecdh = createECDH('prime256v1');
  ecdh.generateKeys();
  return { endpoint, p256dh: ecdh.getPublicKey('base64url'), auth: randomBytes(16).toString('base64url') };
}

const notify = async (userId: string, type = 'call_sheet', extra: Record<string, unknown> = {}) =>
  (await admin().from('notifications').insert({ user_id: userId, type, title: 'Harbor — call sheet · Day 1', body: 'Your call 07:15.', link: '/call/abc', ...extra }).select('id').single()).data!.id as string;

beforeAll(async () => { cast = await createCast(); });
afterAll(async () => {
  await admin().from('push_subscriptions').delete().in('user_id', [cast.sam.id, cast.jordan.id, cast.riley.id]);
  await destroyCast(cast);
});

describe('push_subscriptions: each person, their own devices', () => {
  it('Sam adds and reads his; Riley sees, removes and adds none of Sam’s; signed out sees nothing', async () => {
    const d = device();
    expect((await cast.sam.client.from('push_subscriptions').insert({ user_id: cast.sam.id, ...d })).error).toBeNull();
    expect((await cast.sam.client.from('push_subscriptions').select('endpoint').eq('endpoint', d.endpoint)).data).toHaveLength(1);

    expect((await cast.riley.client.from('push_subscriptions').select('id').eq('endpoint', d.endpoint)).data).toEqual([]);
    await cast.riley.client.from('push_subscriptions').delete().eq('endpoint', d.endpoint);
    expect((await admin().from('push_subscriptions').select('id').eq('endpoint', d.endpoint)).data).toHaveLength(1);
    expect((await cast.riley.client.from('push_subscriptions').insert({ user_id: cast.sam.id, ...device() })).error).not.toBeNull();
    expect((await anonClient().from('push_subscriptions').select('id')).data ?? []).toEqual([]);

    // Nobody edits a row (a device that resubscribes replaces it).
    await cast.sam.client.from('push_subscriptions').update({ p256dh: device().p256dh }).eq('endpoint', d.endpoint);
    expect((await admin().from('push_subscriptions').select('p256dh').eq('endpoint', d.endpoint).single()).data?.p256dh).toBe(d.p256dh);

    expect((await cast.sam.client.from('push_subscriptions').delete().eq('endpoint', d.endpoint)).error).toBeNull();
    expect((await admin().from('push_subscriptions').select('id').eq('endpoint', d.endpoint)).data).toEqual([]);
  });

  it('refuses endpoints that aren’t http(s) and keys of the wrong size', async () => {
    const bad = [{ ...device(), endpoint: 'javascript:alert(1)' }, { ...device(), p256dh: 'short' }, { ...device(), auth: 'x' }];
    for (const d of bad) expect((await cast.sam.client.from('push_subscriptions').insert({ user_id: cast.sam.id, ...d })).error).not.toBeNull();
  });
});

describe('dispatchNotification', () => {
  const sent: Array<{ target: PushTarget; payload: Record<string, unknown> }> = [];
  const ok: PushSend = async (target, payload) => { sent.push({ target, payload: JSON.parse(payload) }); return { statusCode: 201 }; };

  it('sends the notification to each of the person’s devices, and nobody else’s', async () => {
    const a = device(), b = device(), other = device();
    await admin().from('push_subscriptions').insert([{ user_id: cast.jordan.id, ...a }, { user_id: cast.jordan.id, ...b }, { user_id: cast.riley.id, ...other }]);
    sent.length = 0;
    const id = await notify(cast.jordan.id);
    expect(await dispatchNotification(admin(), id, ok)).toEqual({ sent: 2, removed: 0, failed: 0 });
    expect(sent.map((s) => s.target.endpoint).sort()).toEqual([a.endpoint, b.endpoint].sort());
    expect(sent[0].payload).toEqual({ id, title: 'Harbor — call sheet · Day 1', body: 'Your call 07:15.', link: '/call/abc', tag: 'call_sheet' });
    expect((await admin().from('push_subscriptions').select('last_used_at').eq('endpoint', a.endpoint).single()).data?.last_used_at).not.toBeNull();
    await admin().from('push_subscriptions').delete().in('endpoint', [a.endpoint, b.endpoint, other.endpoint]);
  });

  it('honours the person’s settings: a kind switched off isn’t pushed', async () => {
    const d = device();
    await admin().from('push_subscriptions').insert({ user_id: cast.jordan.id, ...d });
    await admin().from('profiles').update({ notification_prefs: { jobs: false } }).eq('id', cast.jordan.id);
    sent.length = 0;
    expect((await dispatchNotification(admin(), await notify(cast.jordan.id, 'application'), ok)).skipped).toBe('switched-off');
    expect(sent).toEqual([]);
    await admin().from('profiles').update({ notification_prefs: {} }).eq('id', cast.jordan.id);
    await admin().from('push_subscriptions').delete().eq('endpoint', d.endpoint);
  });

  it('forgets a device the push service says is gone (404/410); keeps one that failed for now', async () => {
    const gone = device(), flaky = device();
    await admin().from('push_subscriptions').insert([{ user_id: cast.jordan.id, ...gone }, { user_id: cast.jordan.id, ...flaky }]);
    const send: PushSend = async (t) => {
      if (t.endpoint === gone.endpoint) throw Object.assign(new Error('Gone'), { statusCode: 410 });
      throw Object.assign(new Error('Server error'), { statusCode: 500 });
    };
    expect(await dispatchNotification(admin(), await notify(cast.jordan.id), send)).toEqual({ sent: 0, removed: 1, failed: 1 });
    expect((await admin().from('push_subscriptions').select('endpoint').in('endpoint', [gone.endpoint, flaky.endpoint])).data?.map((r) => r.endpoint)).toEqual([flaky.endpoint]);
    await admin().from('push_subscriptions').delete().eq('endpoint', flaky.endpoint);
  });

  it('nothing to do: no such notification, or no devices', async () => {
    expect((await dispatchNotification(admin(), '00000000-0000-4000-8000-000000000000', ok)).skipped).toBe('not-found');
    expect((await dispatchNotification(admin(), await notify(cast.riley.id), ok)).skipped).toBe('no-devices');
  });
});

describe('the notifications trigger', () => {
  // pg_net queues a request inside the transaction; read it before commit and
  // roll back, so nothing is ever sent.
  const queued = async (setup: (pg: Pg) => Promise<void>) => {
    const pg = new Pg({ connectionString: process.env.SUPABASE_TEST_DB_URL });
    await pg.connect();
    try {
      await pg.query('begin');
      await setup(pg);
      const { rows } = await pg.query(`select url, headers, convert_from(body, 'utf8') as body from net.http_request_queue where url like 'http://push-dispatch.test/%'`);
      return rows as Array<{ url: string; headers: Record<string, string>; body: string }>;
    } finally {
      await pg.query('rollback');
      await pg.end();
    }
  };
  const SECRET = 'x'.repeat(40);

  it('posts {notification_id} with the secret when push is configured and the person has a device', async () => {
    const rows = await queued(async (pg) => {
      await pg.query(`insert into internal.push_config (dispatch_url, secret) values ('http://push-dispatch.test/api/push/dispatch', $1)`, [SECRET]);
      const d = device();
      await pg.query(`insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values ($1, $2, $3, $4)`, [cast.sam.id, d.endpoint, d.p256dh, d.auth]);
      await pg.query(`insert into public.notifications (user_id, type, title) values ($1, 'call_sheet', 'Day 1')`, [cast.sam.id]);
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].url).toBe('http://push-dispatch.test/api/push/dispatch');
    expect(rows[0].headers.Authorization).toBe(`Bearer ${SECRET}`);
    expect(Object.keys(JSON.parse(rows[0].body))).toEqual(['notification_id']);
  });

  it('posts nothing when push isn’t configured, or the person has no device', async () => {
    expect(await queued(async (pg) => {
      const d = device();
      await pg.query(`insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values ($1, $2, $3, $4)`, [cast.sam.id, d.endpoint, d.p256dh, d.auth]);
      await pg.query(`insert into public.notifications (user_id, type, title) values ($1, 'call_sheet', 'Day 1')`, [cast.sam.id]);
    })).toEqual([]);
    expect(await queued(async (pg) => {
      await pg.query(`insert into internal.push_config (dispatch_url, secret) values ('http://push-dispatch.test/api/push/dispatch', $1)`, [SECRET]);
      await pg.query(`insert into public.notifications (user_id, type, title) values ($1, 'call_sheet', 'Day 1')`, [cast.riley.id]);
    })).toEqual([]);
  });

  it('the config is out of reach to signed-in users and visitors', async () => {
    // Prove the REVOKE directly: neither front-end role may SELECT the config
    // (has_table_privilege is a boolean, so no denied-query transaction abort).
    const pg = new Pg({ connectionString: process.env.SUPABASE_TEST_DB_URL });
    await pg.connect();
    try {
      for (const role of ['anon', 'authenticated']) {
        const { rows } = await pg.query(`select has_table_privilege($1, 'internal.push_config', 'SELECT') as can`, [role]);
        expect(rows[0].can).toBe(false);
      }
    } finally {
      await pg.end();
    }
  });
});
