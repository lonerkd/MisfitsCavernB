import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Today, for the person who runs a production: each of their projects says what
// needs them — an invite nobody answered, a task past its date, the next shoot
// day and whether its call sheet has gone out. Crew see none of it.
// Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);
const day = (offset: number) => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

test.describe.serial('Today for the owner (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  const person = (k: string) => ({ id: '', email: `to.${k}.${TAG}@journey.test`, name: `to${k}${TAG}` });
  const owner = person('o');
  const crew = person('c');
  const invited = person('i');
  let projectId = '';

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    for (const p of [owner, crew, invited]) {
      p.id = (await admin.auth.admin.createUser({ email: p.email, password: PASSWORD, email_confirm: true, user_metadata: { username: p.name } })).data.user!.id;
    }
    projectId = (await admin.from('projects').insert({ title: `Flags ${TAG}`, creator_id: owner.id }).select('id').single()).data!.id;
    const crewIns = await admin.from('project_crew').insert([
      { project_id: projectId, user_id: crew.id, role: 'contributor', craft: 'Actor', status: 'confirmed' },
      { project_id: projectId, user_id: invited.id, role: 'contributor', craft: 'Actor', status: 'pending' },
    ]);
    expect(crewIns.error).toBeNull();
    const taskIns = await admin.from('project_tasks').insert({ project_id: projectId, title: 'Book the van', due_date: day(-3), completed: false });
    expect(taskIns.error).toBeNull();
    const sheetIns = await admin.from('call_sheets').insert({ project_id: projectId, shoot_date: day(2), shoot_day: 1 });
    expect(sheetIns.error).toBeNull();
  });
  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('call_sheets').delete().eq('project_id', projectId);
    await admin.from('project_tasks').delete().eq('project_id', projectId);
    await admin.from('projects').delete().eq('id', projectId);
    for (const p of [owner, crew, invited]) if (p.id) await admin.auth.admin.deleteUser(p.id);
  });

  const signIn = async (page: import('@playwright/test').Page, p: { email: string }) => {
    await page.goto('/auth');
    await page.fill('input[name="email"]', p.email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });
  };

  test('the owner sees what needs them on the project', async ({ page }) => {
    test.setTimeout(120_000);
    await signIn(page, owner);
    await page.goto('/today');
    const flags = page.getByRole('list', { name: `Flags ${TAG}: what needs you` });
    await expect(flags).toBeVisible({ timeout: 30_000 });
    await expect(flags.getByText('1 invite unanswered')).toBeVisible();
    await expect(flags.getByText('1 task overdue')).toBeVisible();
    await expect(flags.getByText(/Day 1 · .* · call sheet not issued/)).toBeVisible();
  });

  test('crew see no such flags', async ({ page }) => {
    test.setTimeout(120_000);
    await signIn(page, crew);
    await page.goto('/today');
    await expect(page.getByRole('heading', { name: 'Your projects' })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('link', { name: new RegExp(`Flags ${TAG}`) })).toBeVisible();
    await expect(page.getByRole('list', { name: `Flags ${TAG}: what needs you` })).toHaveCount(0);
  });
});
