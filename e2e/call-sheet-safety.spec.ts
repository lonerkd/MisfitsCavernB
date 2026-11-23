import { randomUUID } from 'node:crypto';
import { test, expect, stackEnabled, stackSkipReason, signInAs } from './support/stack';
import type { Browser } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';

// Emergency details on the call sheet and "Text it", in real browsers against a local stack: the owner enters a
// hospital, issues, the crew's call page shows it, the printed document carries it, a later edit reads as "changed since
// issued", and the Text it link is an sms: link carrying the call page's address. Opt-in: E2E_LOCAL_STACK=1.
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);
const SCRIPT = 'INT. HARBOR - NIGHT\n\nMAYA waits by the water.\n\nMAYA\nYou’re late.\n';

test.describe('Call sheet safety details (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  let admin: SupabaseClient;
  const owner = { id: '', email: `sf-owner.${TAG}@journey.test`, name: `sfowner${TAG}` };
  const crew = { id: '', email: `sf-crew.${TAG}@journey.test`, name: `sfcrew${TAG}` };
  let projectId: string;

  const signIn = async (browser: Browser, who: typeof owner) => {
    const page = await (await browser.newContext()).newPage();
    await signInAs(page, { email: who.email, password: PASSWORD });
    return page;
  };

  test.beforeAll(async ({ stack }) => {
    admin = stack.admin;
    for (const who of [owner, crew]) who.id = (await stack.createUser({ email: who.email, password: PASSWORD, username: who.name })).id;
    projectId = (await admin.from('projects').insert({ title: `Safety ${TAG}`, creator_id: owner.id, status: 'pre-production' }).select('id').single()).data!.id;
    await admin.from('project_crew').insert({ project_id: projectId, user_id: crew.id, craft: 'Gaffer', status: 'confirmed' });
    await admin.from('scripts').insert({ title: 'Harbor', content: SCRIPT, project_id: projectId, created_by: owner.id, last_edited_by: owner.id });
  });

  test.afterAll(async () => {
    if (!admin) return;
    await admin.from('scripts').delete().eq('project_id', projectId);
    await admin.from('projects').delete().eq('id', projectId);
    for (const who of [owner, crew]) if (who.id) await admin.auth.admin.deleteUser(who.id);
  });

  test('hospital → issue → the crew’s page and the printed sheet → a change after issue → Text it', async ({ browser }) => {
    test.setTimeout(150_000);
    const sam = await signIn(browser, owner);
    // Capture what the print kit would print: its hidden frame's document, without opening a dialog.
    await sam.addInitScript(() => {
      Object.defineProperty(HTMLIFrameElement.prototype, 'srcdoc', {
        configurable: true,
        set(v: string) { (window as unknown as { __printed: string[] }).__printed = [...((window as unknown as { __printed?: string[] }).__printed ?? []), v]; },
        get() { return ''; },
      });
    });
    await sam.goto('/studio?tab=production&view=schedule');
    const picker = sam.getByLabel('Active project');
    await picker.waitFor();
    if ((await picker.inputValue()) !== projectId) await picker.selectOption(projectId);
    await sam.getByRole('button', { name: /^Day 1/ }).click({ timeout: 30_000 });

    await sam.getByLabel('Date', { exact: true }).fill('2026-11-03');
    await sam.getByLabel('Date', { exact: true }).blur();
    await sam.getByLabel('Nearest hospital').fill('St Mary’s');
    await sam.getByLabel('Nearest hospital').blur();
    await sam.getByLabel('Hospital phone').fill('555 0100');
    await sam.getByLabel('Hospital phone').blur();
    await sam.getByLabel('Hospital address').fill('1 Hospital Way');
    await sam.getByLabel('Hospital address').blur();
    await sam.getByLabel(`Call time for ${crew.name}`).fill('07:15');
    await sam.getByLabel(`Call time for ${crew.name}`).blur();
    await expect.poll(async () => (await admin.from('call_sheets').select('hospital_name, hospital_phone').eq('project_id', projectId).eq('shoot_day', 1).single()).data)
      .toEqual({ hospital_name: 'St Mary’s', hospital_phone: '555 0100' });

    await sam.getByRole('button', { name: 'Send to crew' }).click();
    await expect(sam.getByRole('status').filter({ hasText: /^Issued v1/ })).toBeVisible();
    const sheet = (await admin.from('call_sheets').select('id').eq('project_id', projectId).eq('shoot_day', 1).single()).data!;

    // The crew's call page shows it.
    const jordan = await signIn(browser, crew);
    await jordan.goto(`/call/${sheet.id}`);
    await expect(jordan.getByRole('heading', { name: 'Emergency' })).toBeVisible({ timeout: 20_000 });
    await expect(jordan.getByText('St Mary’s, 1 Hospital Way')).toBeVisible();
    await expect(jordan.getByRole('link', { name: '555 0100' })).toHaveAttribute('href', 'tel:5550100');

    // The printed sheet carries it.
    await sam.getByRole('button', { name: 'Print', exact: true }).last().click();
    await expect.poll(async () => sam.evaluate(() => ((window as unknown as { __printed?: string[] }).__printed ?? []).join('\n'))).toContain('Nearest hospital');
    const printed = await sam.evaluate(() => ((window as unknown as { __printed?: string[] }).__printed ?? []).join('\n'));
    expect(printed).toContain('St Mary’s, 1 Hospital Way');
    expect(printed).toContain('555 0100');

    // Text it: an sms: link with the call page's address and the person's own call.
    const text = sam.getByRole('link', { name: `Text ${crew.name} their call` });
    const href = (await text.getAttribute('href'))!;
    expect(href.startsWith('sms:')).toBe(true);
    const body = decodeURIComponent(href.slice(href.indexOf('body=') + 5));
    expect(body).toContain(`/call/${sheet.id}`);
    expect(body).toContain('Your call 07:15');

    // A change after issue is noticed.
    await sam.getByLabel('Nearest hospital').fill('General Hospital');
    await sam.getByLabel('Nearest hospital').blur();
    await expect(sam.getByRole('status').filter({ hasText: 'Changed since v1 · emergency details' })).toBeVisible();
  });
});
