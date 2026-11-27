import { randomUUID } from 'node:crypto';
import { test, expect, stackEnabled, stackSkipReason, signInAs } from './support/stack';
import { chromium, type BrowserContext, type Page } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';

// The voice cap, with nine real people (BACKLOG 3.24 d): a voice room is a full mesh and holds eight. The ninth to join is told the room is
// full and is not in it; when one of the eight leaves, the ninth gets in. Nine accounts, one fake microphone each, real WebRTC between
// the contexts over the local stack's Realtime signalling. Opt-in: E2E_LOCAL_STACK=1.
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);
const N = 9;
const CAP = 8;

test.describe('A full voice room (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  let admin: SupabaseClient;
  const people = Array.from({ length: N }, (_, i) => ({ id: '', email: `vf${i}.${TAG}@journey.test`, name: `vf${i}${TAG}` }));
  let projectId = '';
  const room = `Full ${TAG}`;

  test.beforeAll(async ({ stack }) => {
    admin = stack.admin;
    for (const p of people) p.id = (await stack.createUser({ email: p.email, password: PASSWORD, username: p.name })).id;
    projectId = (await admin.from('projects').insert({ title: `Full ${TAG}`, creator_id: people[0].id, status: 'production' }).select('id').single()).data!.id;
    await admin.from('project_crew').insert(people.slice(1).map((p) => ({ project_id: projectId, user_id: p.id, craft: 'Writer', status: 'confirmed' })));
    const { error } = await admin.from('channels').insert({ project_id: projectId, name: room, type: 'voice', created_by: people[0].id });
    if (error) throw new Error(`voice channel: ${error.message}`);
  });
  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('projects').delete().eq('id', projectId);
    for (const p of people) if (p.id) await admin.auth.admin.deleteUser(p.id);
  });

  const island = (page: Page) => page.getByRole('navigation', { name: 'Suite' });

  test('eight can join; the ninth is told it is full, and gets in when one leaves', async () => {
    test.setTimeout(420_000);
    const browser = await chromium.launch({ executablePath: process.env.MC_LOCAL_CHROMIUM, args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
    const ctxs: BrowserContext[] = [];
    try {
      const pages: Page[] = [];
      for (let i = 0; i < N; i++) {
        const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, permissions: ['microphone'] });
        ctxs.push(ctx);
        const page = await ctx.newPage();
        await signInAs(page, { email: people[i].email, password: PASSWORD });
        // The Lounge has no project picker (the island switches projects): choose it the way the app remembers it.
        await page.goto('/lounge');
        await page.evaluate((id) => localStorage.setItem('mc_active_project', id), projectId);
        await page.goto('/lounge');
        await page.getByRole('button', { name: new RegExp(`^${room}`) }).first().click();
        pages.push(page);
      }
      // Join one at a time so the seats are taken in order.
      for (let i = 0; i < CAP; i++) {
        await pages[i].getByRole('button', { name: /JOIN VOICE/ }).click();
        await expect(island(pages[i]).getByText(`In voice · ${room}`)).toBeVisible({ timeout: 40_000 });
      }
      // The ninth is refused, in words, and is not in the room.
      await pages[CAP].getByRole('button', { name: /JOIN VOICE/ }).click();
      await expect(pages[CAP].getByText(`This voice room is full (${CAP} people)`).first()).toBeVisible({ timeout: 30_000 });
      await expect(island(pages[CAP]).getByText(`In voice · ${room}`)).toHaveCount(0);

      // One of the eight leaves; the ninth can now join.
      await expect(async () => {
        const leave = island(pages[0]).getByRole('button', { name: 'Leave', exact: true });
        if (!(await leave.isVisible())) await island(pages[0]).getByRole('button', { name: /^Open the island/ }).click();
        await leave.click({ timeout: 4000 });
      }).toPass({ timeout: 30_000 });
      await expect(island(pages[0]).getByText(`In voice · ${room}`)).toHaveCount(0, { timeout: 20_000 });
      await pages[CAP].getByRole('button', { name: /JOIN VOICE/ }).click();
      await expect(island(pages[CAP]).getByText(`In voice · ${room}`)).toBeVisible({ timeout: 40_000 });
    } finally {
      for (const c of ctxs) await c.close().catch(() => {});
      await browser.close().catch(() => {});
    }
  });
});
