import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// The Lounge in a real browser against a local stack: a crew member's posts
// show as unread for the owner until the channel is opened; the owner pins
// one and finds it under Pinned; edits their own post; and search jumps to a
// message. Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

async function axeViolations(page: Page): Promise<string[]> {
  await page.evaluate(() => Promise.all(document.getAnimations()
    .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
    .map((a) => a.finished.catch(() => undefined))));
  await page.addScriptTag({ content: AXE });
  return page.evaluate(async () => {
    const r = await (window as any).axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations'] });
    return r.violations.map((v: any) => `${v.id}: ${v.nodes.slice(0, 3).map((n: any) => `${n.target.join(' ')} ${n.html.slice(0, 140)} ${n.any?.[0]?.message ?? ''}`).join(' | ')}`);
  });
}

test.describe('Lounge (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  const owner = { id: '', email: `lounge-owner.${TAG}@journey.test` };
  const crew = { id: '', email: `lounge-crew.${TAG}@journey.test` };
  let projectId: string;
  let channelId: string;
  const name = `set-${TAG}`;

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    for (const [who, uname] of [[owner, `lowner${TAG}`], [crew, `lcrew${TAG}`]] as const) {
      who.id = (await admin.auth.admin.createUser({ email: who.email, password: PASSWORD, email_confirm: true, user_metadata: { username: uname } })).data.user!.id;
    }
    projectId = (await admin.from('projects').insert({ title: `Lounge ${TAG}`, creator_id: owner.id, status: 'production' }).select('id').single()).data!.id;
    await admin.from('project_crew').insert({ project_id: projectId, user_id: crew.id, craft: 'Gaffer', status: 'confirmed' });
    channelId = (await admin.from('channels').insert({ project_id: projectId, name, created_by: owner.id }).select('id').single()).data!.id;
  });

  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('projects').delete().eq('id', projectId);
    for (const who of [owner, crew]) await admin.auth.admin.deleteUser(who.id);
  });

  test('unread until opened; pin, edit, search', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/auth');
    await page.fill('input[name="email"]', owner.email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });

    await page.goto('/lounge');
    const picker = page.getByLabel('Active project');
    await picker.waitFor();
    if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);

    // Elsewhere in the Lounge, the crew posts in the project channel: it lights up.
    await page.getByRole('button', { name: /^general/ }).first().click();
    await page.waitForTimeout(1500);
    await admin.from('messages').insert({ sender_id: crew.id, channel_uuid: channelId, content: 'Generator arrives at the pier at five' });
    await admin.from('messages').insert({ sender_id: crew.id, channel_uuid: channelId, content: 'Bring warm layers tonight' });
    const channelButton = page.getByRole('button', { name: `${name}, 2 unread` });
    await expect(channelButton).toBeVisible({ timeout: 20_000 });
    await channelButton.click();
    await expect(page.getByText('Bring warm layers tonight')).toBeVisible();
    await expect(page.getByRole('button', { name: `${name}, 2 unread` })).toHaveCount(0);
    await expect.poll(async () => (await admin.from('lounge_reads').select('last_read_at').eq('user_id', owner.id).eq('channel_id', channelId).single()).data?.last_read_at)
      .not.toBe(null);

    // Pin the generator message; it's listed under Pinned.
    const gen = page.locator('[id^="msg-"]', { hasText: 'Generator arrives' });
    await gen.hover();
    await gen.getByRole('button', { name: 'Pin message' }).click();
    await expect(gen.getByText('PINNED')).toBeVisible();
    await page.getByRole('button', { name: `Pinned messages in #${name}` }).click();
    const pinned = page.getByRole('dialog', { name: `Pinned in #${name}` });
    await expect(pinned.getByText('Generator arrives at the pier at five')).toBeVisible();
    await expect(await axeViolations(page)).toEqual([]);
    await pinned.getByRole('button', { name: 'Close pinned messages' }).click();

    // Post, then edit it.
    await page.getByPlaceholder(`Message #${name}...`).fill('Wrap is at 6');
    await page.getByPlaceholder(`Message #${name}...`).press('Enter');
    const mine = page.locator('[id^="msg-"]', { hasText: 'Wrap is at 6' });
    await expect(mine).toBeVisible({ timeout: 15_000 });
    await mine.hover();
    await mine.getByRole('button', { name: 'Edit message' }).click();
    await mine.getByLabel('Edit message').fill('Wrap is at 6:30');
    await mine.getByLabel('Edit message').press('Enter');
    await expect(page.locator('[id^="msg-"]', { hasText: 'Wrap is at 6:30' }).getByText('(edited)')).toBeVisible();

    // Search from another channel jumps back here.
    await page.getByRole('button', { name: /^general/ }).first().click();
    await page.getByRole('button', { name: 'Search messages' }).click();
    const search = page.getByRole('dialog', { name: 'Search the Lounge' });
    await search.getByRole('radio', { name: 'Everywhere' }).click();
    await search.getByLabel('Search messages').fill('warm lay');
    await search.getByRole('button', { name: /Bring warm layers tonight/ }).click();
    // The message itself (the search panel may still be sliding away with its copy of the text).
    await expect(page.locator('[id^="msg-"]', { hasText: 'Bring warm layers tonight' })).toBeInViewport();
    await expect(await axeViolations(page)).toEqual([]);
  });

  // The side panels and the member tools: what was added to the project shows
  // in the feed, the crew list names the crew, a private channel's owner finds
  // someone by name, adds them and lets them manage it, and a ?dm= link opens
  // the conversation.
  test('feed, crew, private-channel members, a direct-message link', async ({ page }) => {
    test.setTimeout(120_000);
    const room = `room-${TAG}`;
    const roomId = (await admin.from('channels').insert({ project_id: projectId, name: room, created_by: owner.id, is_private: true }).select('id').single()).data!.id;
    await admin.from('budget_items').insert({ project_id: projectId, category: `Ferry hire ${TAG}`, amount: 300, created_by: owner.id });

    await page.goto('/auth');
    await page.fill('input[name="email"]', owner.email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });

    await page.goto('/lounge');
    const picker = page.getByLabel('Active project');
    await picker.waitFor();
    if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);
    await expect(page.getByText(`Budget — Ferry hire ${TAG}`)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(`lcrew${TAG}`).filter({ visible: true }).first()).toBeVisible();

    // The private room: find the crew member by name, add them, let them manage.
    await page.getByRole('button', { name: new RegExp(`^${room}`) }).first().click();
    await page.getByTitle('Manage channel').click();
    await page.getByLabel('Add member').fill(`lcrew${TAG}`);
    await page.getByRole('button', { name: new RegExp(`lcrew${TAG}`) }).last().click();
    await expect.poll(async () => (await admin.from('channel_members').select('can_manage').eq('channel_id', roomId).eq('user_id', crew.id)).data)
      .toEqual([{ can_manage: false }]);
    await page.getByTitle('Can manage').last().click();
    await expect.poll(async () => (await admin.from('channel_members').select('can_manage').eq('channel_id', roomId).eq('user_id', crew.id).single()).data?.can_manage)
      .toBe(true);
    await page.getByRole('button', { name: 'Close manage channel' }).click();

    // A link straight into a conversation with them.
    await page.goto(`/lounge?dm=${crew.id}`);
    await expect(page.getByPlaceholder(`Message @lcrew${TAG}...`)).toBeVisible({ timeout: 20_000 });
  });
});
