import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// The owner tells the team: it lands in the project's announcements channel and in
// each confirmed crew member's notifications — not the pending, not the owner,
// not an outsider. Crew do not see the box. Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);

test.describe.serial('Announcements (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  const person = (k: string) => ({ id: '', email: `an.${k}.${TAG}@journey.test`, name: `an${k}${TAG}` });
  const owner = person('o');
  const crew = person('c');
  const pending = person('p');
  const outsider = person('x');
  let projectId = '';
  const TEXT = `Call moved to 6am ${TAG}`;

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    for (const p of [owner, crew, pending, outsider]) {
      p.id = (await admin.auth.admin.createUser({ email: p.email, password: PASSWORD, email_confirm: true, user_metadata: { username: p.name } })).data.user!.id;
    }
    projectId = (await admin.from('projects').insert({ title: `Announce ${TAG}`, creator_id: owner.id }).select('id').single()).data!.id;
    const crewInsert = await admin.from('project_crew').insert([
      { project_id: projectId, user_id: crew.id, role: 'contributor', craft: 'Actor', status: 'confirmed' },
      { project_id: projectId, user_id: pending.id, role: 'contributor', craft: 'Actor', status: 'pending' },
    ]);
    expect(crewInsert.error).toBeNull();
  });
  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('notifications').delete().in('user_id', [crew.id, pending.id, outsider.id, owner.id]);
    await admin.from('channels').delete().eq('project_id', projectId);
    await admin.from('projects').delete().eq('id', projectId);
    for (const p of [owner, crew, pending, outsider]) if (p.id) await admin.auth.admin.deleteUser(p.id);
  });

  const signIn = async (page: import('@playwright/test').Page, p: { email: string }) => {
    await page.goto('/auth');
    await page.fill('input[name="email"]', p.email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });
  };

  test('the owner posts; the channel and the confirmed crew get it, nobody else does', async ({ page }) => {
    test.setTimeout(120_000);
    await signIn(page, owner);
    await page.goto(`/projects/${projectId}`);
    const box = page.getByLabel('Tell the team');
    // The field is controlled: a fill before the page hydrates is wiped, so hold it until it sticks.
    await expect(async () => { await box.fill(TEXT); await expect(box).toHaveValue(TEXT, { timeout: 1000 }); }).toPass({ timeout: 20_000 });
    await page.getByRole('button', { name: 'Post announcement' }).click();
    await expect(page.getByText(/Posted, and 1 person told/)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByLabel('Tell the team')).toHaveValue('');

    const channel = (await admin.from('channels').select('id, post_policy, audience').eq('project_id', projectId).eq('name', 'announcements').single()).data!;
    expect(channel).toMatchObject({ post_policy: 'managers', audience: 'team' });
    const msgs = (await admin.from('messages').select('content, sender_id').eq('channel_uuid', channel.id)).data!;
    expect(msgs).toEqual([{ content: TEXT, sender_id: owner.id }]);

    const told = async (id: string) => (await admin.from('notifications').select('type, title, body, link').eq('user_id', id)).data!;
    expect(await told(crew.id)).toEqual([{ type: 'announcement', title: `Announcement · Announce ${TAG}`, body: TEXT, link: '/lounge' }]);
    expect(await told(pending.id)).toEqual([]);
    expect(await told(outsider.id)).toEqual([]);
    expect(await told(owner.id)).toEqual([]);
  });

  test('crew read it but have no box to post with', async ({ page }) => {
    test.setTimeout(120_000);
    await signIn(page, crew);
    await page.goto(`/projects/${projectId}`);
    await expect(page.getByRole('heading', { name: `Announce ${TAG}` })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByLabel('Tell the team')).toHaveCount(0);
  });
});
