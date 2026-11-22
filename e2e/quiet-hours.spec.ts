import { test, expect, stackEnabled, stackSkipReason, signInAs } from './support/stack';

// BACKLOG 3.53: Settings › Notifications › Quiet hours. The person switches them on, sets their own night, and it is kept in their account
// (profiles.notification_prefs), in their device's time zone. Opt-in: E2E_LOCAL_STACK=1.
test.describe('Quiet hours (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  test('switch on, set the window, reload: it is still there and stored with a zone', async ({ page, stack }) => {
    test.setTimeout(120_000);
    const sam = await stack.createUser({ label: 'quiet' });
    await signInAs(page, sam);
    await page.goto('/settings');
    const toggle = page.getByRole('switch', { name: 'Quiet hours' });
    await expect(toggle).toHaveAttribute('aria-checked', 'false', { timeout: 30_000 });
    await expect(page.getByLabel('Quiet hours start')).toHaveCount(0);

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    await page.getByLabel('Quiet hours start').fill('23:15');
    await page.getByLabel('Quiet hours end').fill('06:45');
    await expect(page.getByText(/from 23:15 to 06:45/)).toBeVisible();

    await expect.poll(async () => {
      const q = (await stack.admin.from('profiles').select('notification_prefs').eq('id', sam.id).single()).data?.notification_prefs?.quiet;
      return q ? { on: q.on, start: q.start, end: q.end, hasZone: typeof q.tz === 'string' && q.tz.length > 0 } : null;
    }).toEqual({ on: true, start: '23:15', end: '06:45', hasZone: true });

    await page.reload();
    await expect(page.getByRole('switch', { name: 'Quiet hours' })).toHaveAttribute('aria-checked', 'true', { timeout: 30_000 });
    await expect(page.getByLabel('Quiet hours start')).toHaveValue('23:15');
    await expect(page.getByLabel('Quiet hours end')).toHaveValue('06:45');

    await page.getByRole('switch', { name: 'Quiet hours' }).click();
    await expect(page.getByLabel('Quiet hours start')).toHaveCount(0);
  });
});
