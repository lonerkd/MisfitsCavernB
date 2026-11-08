import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test, expect, type Browser } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// A person's own portfolio page, in a real browser against a local stack: off until the owner publishes it from the manage screen;
// then a signed-out visitor sees the person and ONLY their public pieces; link only is reachable but told not to be indexed;
// off is a not-found again. A piece's own page shows its cover. Opt-in: E2E_LOCAL_STACK=1.
const ENABLED = process.env.E2E_LOCAL_STACK === '1';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);
const COVER = 'https://images.example.com/still.jpg';

test.describe('A person’s portfolio page (local Supabase)', () => {
  test.skip(!ENABLED, 'set E2E_LOCAL_STACK=1 and build the app against the local stack');

  let admin: SupabaseClient;
  const owner = { id: '', email: `pp-owner.${TAG}@journey.test`, name: `ppowner${TAG}` };
  let publicToken: string;

  const signIn = async (browser: Browser) => {
    const page = await (await browser.newContext()).newPage();
    await page.goto('/auth');
    await page.fill('input[name="email"]', owner.email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });
    return page;
  };
  const visitor = async (browser: Browser) => (await browser.newContext()).newPage();
  const robots = (page: import('@playwright/test').Page) => page.locator('meta[name="robots"]').getAttribute('content');

  test.beforeAll(async () => {
    const s = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { data } = await admin.auth.admin.createUser({ email: owner.email, password: PASSWORD, email_confirm: true, user_metadata: { username: owner.name } });
    owner.id = data.user!.id;
    await admin.from('profiles').update({ role: 'Director', bio: 'Short films about water.' }).eq('id', owner.id);
    const pub = await admin.from('portfolio_projects').insert({ user_id: owner.id, title: 'Public Film', visibility: 'public', cover_url: COVER, year: 2026 }).select('share_token').single();
    if (pub.error) throw pub.error;
    publicToken = pub.data.share_token;
    const rest = await admin.from('portfolio_projects').insert([
      { user_id: owner.id, title: 'Link Only Film', visibility: 'unlisted' },
      { user_id: owner.id, title: 'Private Film', visibility: 'private' },
    ]);
    if (rest.error) throw rest.error;
  });
  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('portfolio_projects').delete().eq('user_id', owner.id);
    await admin.auth.admin.deleteUser(owner.id);
  });

  test('off by default: a visitor gets a not-found', async ({ browser }) => {
    const page = await visitor(browser);
    await page.goto(`/u/${owner.name}`);
    // The route streams its shell before the page decides, so the status is 200 with the not-found screen: never the person.
    await expect(page.getByText("This page doesn't exist.")).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: owner.name })).toHaveCount(0);
  });

  test('the owner publishes it from the manage screen; a visitor sees the person and only the public piece', async ({ browser }) => {
    const me = await signIn(browser);
    await me.goto('/portfolio/manage');
    const select = me.getByLabel('Your page', { exact: true });
    await select.selectOption('public');
    await expect(me.getByRole('link', { name: new RegExp(`/u/${owner.name}$`) })).toBeVisible();

    const page = await visitor(browser);
    await page.goto(`/u/${owner.name}`);
    await expect(page.getByRole('heading', { level: 1, name: owner.name })).toBeVisible();
    await expect(page.getByText('Short films about water.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Public Film' })).toBeVisible();
    await expect(page.getByText('Link Only Film')).toHaveCount(0);
    await expect(page.getByText('Private Film')).toHaveCount(0);
    expect(await robots(page)).toContain('index');
    expect(await robots(page)).not.toContain('noindex');
  });

  test('link only is reachable but told not to be indexed; off is a not-found again', async ({ browser }) => {
    const me = await signIn(browser);
    await me.goto('/portfolio/manage');
    await me.getByLabel('Your page', { exact: true }).selectOption('unlisted');
    await expect(me.getByText(/Link only: /)).toBeVisible();

    const page = await visitor(browser);
    await page.goto(`/u/${owner.name}`);
    await expect(page.getByRole('heading', { level: 1, name: owner.name })).toBeVisible();
    expect(await robots(page)).toContain('noindex');

    await me.getByLabel('Your page', { exact: true }).selectOption('off');
    await expect(me.getByText(/Off: /)).toBeVisible();
    const again = await visitor(browser);
    await again.goto(`/u/${owner.name}`);
    await expect(again.getByText("This page doesn't exist.")).toBeVisible();
  });

  test('a piece’s own page shows its cover', async ({ browser }) => {
    const page = await visitor(browser);
    await page.goto(`/p/${publicToken}`);
    await expect(page.locator(`img[src="${COVER}"]`)).toHaveCount(1);
  });
});
