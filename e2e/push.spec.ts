import { createECDH, randomBytes, randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { test, expect, stackEnabled, stackSkipReason } from './support/stack';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Client as Pg } from 'pg';
const ece = require('http_ece') as { decrypt: (buf: Buffer, opts: Record<string, unknown>) => Buffer };

// Web Push end to end: a notification written in the database reaches the
// person's device. The database posts to /api/push/dispatch (pg_net), the app
// signs and encrypts the message (VAPID, aes128gcm) and sends it to the
// device's push service — here a stand-in this test runs, which decrypts it.
// Needs the server started with NEXT_PUBLIC_VAPID_PUBLIC_KEY,
// VAPID_PRIVATE_KEY, PUSH_DISPATCH_SECRET and SUPABASE_SERVICE_ROLE_KEY
// (CI sets test-only ones). PUSH_E2E_HOST: how the database container reaches
// this machine (Docker Desktop: host.docker.internal; CI: the network gateway).
const SECRET = process.env.PUSH_DISPATCH_SECRET ?? '';
const CONFIGURED = !!(SECRET && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
const TAG = Date.now().toString(36);

test.describe('Web Push (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);
  test.skip(stackEnabled && !CONFIGURED, 'start the app with VAPID keys and PUSH_DISPATCH_SECRET (see the spec header)');

  let admin: SupabaseClient;
  let dbUrl = '';
  let userId = '';
  let server: Server;
  const received: Array<{ req: IncomingMessage; body: Buffer }> = [];
  const ecdh = createECDH('prime256v1');
  const authSecret = randomBytes(16);

  const setConfig = async (sql: string, params: unknown[] = []) => {
    const pg = new Pg({ connectionString: dbUrl });
    await pg.connect();
    try { await pg.query(sql, params); } finally { await pg.end(); }
  };

  test.beforeAll(async ({ stack }) => {
    admin = stack.admin;
    dbUrl = stack.dbUrl;
    userId = (await stack.createUser({ email: `push.${TAG}@journey.test`, password: randomUUID(), username: `push${TAG}` })).id;

    // The stand-in push service: records what it's sent and says Created.
    server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => { received.push({ req, body: Buffer.concat(chunks) }); res.statusCode = 201; res.end(); });
    });
    await new Promise<void>((r) => server.listen(0, '0.0.0.0', r));
    const port = (server.address() as AddressInfo).port;

    ecdh.generateKeys();
    await admin.from('push_subscriptions').insert({
      user_id: userId, endpoint: `http://127.0.0.1:${port}/device/${TAG}`,
      p256dh: ecdh.getPublicKey('base64url'), auth: authSecret.toString('base64url'),
    });
    const app = new URL(process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000');
    const host = process.env.PUSH_E2E_HOST ?? 'host.docker.internal';
    await setConfig('delete from internal.push_config');
    await setConfig('insert into internal.push_config (dispatch_url, secret) values ($1, $2)', [`http://${host}:${app.port || 80}/api/push/dispatch`, SECRET]);
  });

  test.afterAll(async () => {
    if (dbUrl) await setConfig('delete from internal.push_config').catch(() => {});
    server?.close();
    if (admin && userId) {
      await admin.from('push_subscriptions').delete().eq('user_id', userId);
    }
  });

  test('a notification written in the database arrives on the device, signed and encrypted', async () => {
    await admin.from('notifications').insert({ user_id: userId, type: 'call_sheet', title: `Harbor ${TAG} — call sheet · Day 1`, body: 'Your call 07:15.', link: '/call/abc' });
    await expect.poll(() => received.length, { timeout: 20_000 }).toBe(1);

    const { req, body } = received[0];
    expect(req.method).toBe('POST');
    expect(req.headers['content-encoding']).toBe('aes128gcm');
    expect(req.headers.authorization).toMatch(new RegExp(`^vapid t=[\\w-]+\\.[\\w-]+\\.[\\w-]+, k=${process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY}$`));
    const message = JSON.parse(ece.decrypt(body, { version: 'aes128gcm', privateKey: ecdh, authSecret: authSecret.toString('base64url') }).toString('utf8'));
    expect(message).toMatchObject({ title: `Harbor ${TAG} — call sheet · Day 1`, body: 'Your call 07:15.', link: '/call/abc', tag: 'call_sheet' });
  });

  test('the dispatcher only answers the database’s secret', async ({ request }) => {
    const id = '00000000-0000-4000-8000-000000000000';
    expect((await request.post('/api/push/dispatch', { data: { notification_id: id } })).status()).toBe(401);
    expect((await request.post('/api/push/dispatch', { data: { notification_id: id }, headers: { Authorization: 'Bearer wrong' } })).status()).toBe(401);
    expect((await request.post('/api/push/dispatch', { data: { notification_id: 'nope' }, headers: { Authorization: `Bearer ${SECRET}` } })).status()).toBe(400);
    const res = await request.post('/api/push/dispatch', { data: { notification_id: id }, headers: { Authorization: `Bearer ${SECRET}` } });
    expect(await res.json()).toMatchObject({ ok: true, skipped: 'not-found' });
  });
});
