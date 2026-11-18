import { randomUUID } from 'node:crypto';
import { test, expect, stackEnabled, stackSkipReason, signInAs } from './support/stack';
import type { Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Support cases and the platform numbers, in a real browser against a local stack: a member opens a case from Help, an admin answers it (the member is
// notified and reads the answer) and resolves it; the admin home and Analytics show the database's own totals, and a sample project is not counted.
// Opt-in: E2E_LOCAL_STACK=1.
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);



test.describe.serial('Admin support and numbers (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  let admin: SupabaseClient;
  let apiUrl = '';
  let anonKey = '';
  const boss = { id: '', email: `sn-boss.${TAG}@journey.test` };
  const member = { id: '', email: `sn-mem.${TAG}@journey.test` };
  const SUBJECT = `Cannot export ${TAG}`;
  const ANSWER = `Try the Print / PDF button ${TAG}`;
  const projects: string[] = [];

  test.beforeAll(async ({ stack }) => {
    apiUrl = stack.url; anonKey = stack.anonKey;
    admin = stack.admin;
    for (const [who, name] of [[boss, 'snboss'], [member, 'snmem']] as const) {
      who.id = (await stack.createUser({ email: who.email, password: PASSWORD, username: `${name}${TAG}` })).id;
    }
    await admin.from('profiles').update({ is_admin: true }).eq('id', boss.id);
  });
  test.afterAll(async () => {
    if (!admin) return;
    if (projects.length) await admin.from('projects').delete().in('id', projects);
    await admin.from('support_cases').delete().eq('subject', SUBJECT);
    for (const who of [boss, member]) if (who.id) await admin.auth.admin.deleteUser(who.id);
  });

  const signIn = async (page: Page, who: { email: string }) => {
    await signInAs(page, { email: who.email, password: PASSWORD });
  };

  test('a member opens a case, the admin answers and resolves it, and the member reads the answer', async ({ browser }) => {
    test.setTimeout(240_000);
    const memCtx = await browser.newContext();
    const mem = await memCtx.newPage();
    await signIn(mem, member);
    await mem.goto('/hub/help');
    const form = mem.getByRole('form', { name: 'Open a case' });
    await expect(form).toBeVisible({ timeout: 30_000 });
    const subject = form.getByLabel('Subject');
    await expect(async () => { await subject.fill(SUBJECT); await expect(subject).toHaveValue(SUBJECT, { timeout: 1000 }); }).toPass({ timeout: 20_000 });
    await form.getByLabel(/What happened/).fill('The export button does nothing on my phone.');
    await form.getByRole('button', { name: 'Send' }).click();
    await expect(mem.getByText(/Sent — we’ll answer here/)).toBeVisible({ timeout: 20_000 });
    // Sending takes them to their case; the list shows it as with us.
    await mem.waitForURL(/\/hub\/help\/[0-9a-f-]{36}/, { timeout: 20_000 });
    await mem.goto('/hub/help');
    await expect(mem.getByRole('link', { name: new RegExp(SUBJECT) })).toContainText('With us', { timeout: 30_000 });

    const bossCtx = await browser.newContext();
    const adm = await bossCtx.newPage();
    await signIn(adm, boss);
    await adm.goto('/admin/support');
    await expect(adm.getByRole('heading', { name: /^Support$/ })).toBeVisible({ timeout: 30_000 });
    await adm.getByRole('button', { name: new RegExp(SUBJECT) }).click();
    const kase = adm.getByRole('region', { name: `Case: ${SUBJECT}` });
    await expect(kase).toBeVisible({ timeout: 20_000 });
    await expect(kase).toContainText('The export button does nothing on my phone.');
    await kase.getByRole('textbox', { name: 'Answer' }).fill(ANSWER);
    await kase.getByRole('button', { name: 'Send' }).click();
    await expect(kase).toContainText(ANSWER, { timeout: 20_000 });
    const row = await admin.from('support_cases').select('id, status').eq('subject', SUBJECT).single();
    expect(row.data!.status).toBe('waiting');
    const told = await admin.from('notifications').select('title, body').eq('user_id', member.id);
    expect(JSON.stringify(told.data)).toContain(SUBJECT);

    // The member sees the answer, and the case now reads as answered.
    await mem.goto(`/hub/help/${row.data!.id}`);
    await expect(mem.getByText(ANSWER)).toBeVisible({ timeout: 30_000 });
    await mem.goto('/hub/help');
    await expect(mem.getByRole('link', { name: new RegExp(SUBJECT) })).toContainText('Answered');

    await adm.getByRole('combobox', { name: 'Status' }).selectOption('resolved');
    await expect(adm.getByText('Marked “Resolved”')).toBeVisible({ timeout: 20_000 });
    expect((await admin.from('support_cases').select('status').eq('subject', SUBJECT).single()).data!.status).toBe('resolved');
    await memCtx.close();
    await bossCtx.close();
  });

  test('the admin home shows the database\'s own totals, and a sample project is not counted', async ({ page }) => {
    test.setTimeout(200_000);
    const client = createClient(apiUrl, anonKey, { auth: { persistSession: false } });
    expect((await client.auth.signInWithPassword({ email: boss.email, password: PASSWORD })).error).toBeNull();
    // The RPC returns one row; the app maps `creators` to the user total.
    const stats = async () => {
      const row = ((await client.rpc('get_platform_stats')).data as Array<{ creators: number | string; projects: number | string }>)[0];
      return { users: Number(row.creators), projects: Number(row.projects) };
    };
    const before = await stats();

    await signIn(page, boss);
    const shown = async (label: string) => {
      // The label and the number sit in sibling divs of one card: take the card.
      const card = page.getByText(label, { exact: true }).first().locator('xpath=ancestor::div[2]');
      return Number(((await card.innerText()).match(/\d[\d,]*/) ?? ['NaN'])[0].replace(/,/g, ''));
    };
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: /admin panel/i })).toBeVisible({ timeout: 30_000 });
    await expect.poll(() => shown('Total Projects'), { timeout: 30_000 }).toBe(before.projects);
    expect(await shown('Total Users')).toBe(before.users);

    // A real project counts; a sample project does not.
    const real = (await admin.from('projects').insert({ title: `Counted ${TAG}`, creator_id: boss.id }).select('id').single()).data!.id;
    const sample = (await admin.from('projects').insert({ title: `Sample ${TAG}`, creator_id: boss.id, is_sample: true }).select('id').single()).data!.id;
    projects.push(real, sample);
    const after = await stats();
    expect(after.projects).toBe(before.projects + 1);
    await page.reload();
    await expect.poll(() => shown('Total Projects'), { timeout: 30_000 }).toBe(after.projects);

    // Analytics reads the same totals.
    await page.goto('/admin/analytics');
    await expect(page.getByRole('heading', { name: /^analytics$/i })).toBeVisible({ timeout: 30_000 });
    await expect.poll(() => shown('Total Projects'), { timeout: 30_000 }).toBe(after.projects);
    expect(await shown('Total Users')).toBe(after.users);
  });
});
