import { randomUUID } from 'node:crypto';
import { test, expect, stackEnabled, stackSkipReason, signInAs } from './support/stack';
import type { Page } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';

// The Sound page on a phone, in both orientations, against a local stack: no
// sideways scroll, the room tabs and the scene blocks are thumb-sized in
// portrait, and the scenes timeline shows the project's scenes and a tap on a
// scene presses it. Opt-in: E2E_LOCAL_STACK=1.
//
// The page shows only "Connect Spotify" until the account has a Spotify
// connection, and this spec never touches Spotify. So it runs only when the
// account it signs in with is already connected: E2E_SPOTIFY_CONNECTED=1.
const spotifyConnected = process.env.E2E_SPOTIFY_CONNECTED === '1';
const SPOTIFY_SKIP = 'the Sound page needs a connected Spotify account (set E2E_SPOTIFY_CONNECTED=1); this spec does not touch Spotify';
const PASSWORD = randomUUID();
const TAG = Date.now().toString(36);
const SCRIPT = [
  'INT. HARBOUR - DAY', '', 'Gulls over the boats.', '',
  'MAYA', 'The tide is in.', '',
  'EXT. PIER - DUSK', '', 'Maya walks the planks.', '',
  'INT. CABIN - NIGHT', '', 'A lamp, a map, a cold cup.', '',
].join('\n');
const ORIENTATIONS = [
  { name: 'portrait', viewport: { width: 393, height: 852 } },
  { name: 'landscape', viewport: { width: 852, height: 393 } },
] as const;
const ROOM_TABS = ['search', 'scenes', 'library'] as const;

test.describe('The Sound page on a phone (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);
  test.skip(!spotifyConnected, SPOTIFY_SKIP);

  for (const { name, viewport } of ORIENTATIONS) {
    test.describe(name, () => {
      test.use({ viewport, isMobile: true, hasTouch: true });

      let admin: SupabaseClient;
      const owner = { id: '', email: `sound.${name}.${TAG}@journey.test` };
      let projectId = '';
      let scriptId = '';

      test.beforeAll(async ({ stack }) => {
        admin = stack.admin;
        owner.id = (await stack.createUser({ email: owner.email, password: PASSWORD, username: `sound${name}${TAG}` })).id;
        projectId = (await admin.from('projects').insert({ title: `Harbour ${name} ${TAG}`, creator_id: owner.id, status: 'pre-production' }).select('id').single()).data!.id;
        scriptId = (await admin.from('scripts').insert({ title: 'Harbour', content: SCRIPT, project_id: projectId, created_by: owner.id, last_edited_by: owner.id }).select('id').single()).data!.id;
      });

      test.afterAll(async () => {
        if (!admin) return;
        await admin.from('scripts').delete().eq('project_id', projectId);
        await admin.from('projects').delete().eq('id', projectId);
      });

      // The editor indexes the script's scenes into the scenes table; the Sound page reads them from there.
      async function openScenes(page: Page) {
        await signInAs(page, { email: owner.email, password: PASSWORD });
        await page.goto(`/editor?script=${scriptId}`);
        await expect(page.getByRole('textbox', { name: 'Script', exact: true })).toHaveCount(1, { timeout: 20_000 });
        await expect.poll(async () => (await admin.from('scenes').select('id').eq('script_id', scriptId).is('removed_at', null)).data?.length, { timeout: 20_000 }).toBe(3);
        await page.goto('/soundtrack?tab=scenes');
        await expect(page.getByRole('group', { name: 'Scenes timeline' })).toBeVisible({ timeout: 30_000 });
      }

      test('the page fits the screen and the scenes timeline shows the three scenes', async ({ page }) => {
        test.setTimeout(120_000);
        await openScenes(page);

        // (a) no horizontal page scroll
        const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
        expect(fits).toBe(true);

        // (c) the timeline holds one block per scene, and a tap presses it
        const blocks = page.getByRole('group', { name: 'Scenes timeline' }).locator('button[aria-pressed]');
        await expect(blocks).toHaveCount(3);
        const first = blocks.first();
        await expect(first).toHaveAttribute('aria-pressed', 'false');
        await first.tap();
        await expect(first).toHaveAttribute('aria-pressed', 'true');
      });

      test('the room tabs and scene blocks are at least 44 px tall', async ({ page }) => {
        test.skip(name !== 'portrait', 'the 44 px target is measured in portrait');
        test.setTimeout(120_000);
        await openScenes(page);

        // (b) the three room tabs, and each scene block (a 44 px block in the timeline)
        for (const tab of ROOM_TABS) {
          const box = await page.getByRole('tab', { name: tab, exact: true }).boundingBox();
          expect(box, `tab ${tab}`).not.toBeNull();
          expect(box!.height, `tab ${tab} height`).toBeGreaterThanOrEqual(44);
        }
        const blocks = page.getByRole('group', { name: 'Scenes timeline' }).locator('button[aria-pressed]');
        await expect(blocks).toHaveCount(3);
        for (let i = 0; i < 3; i++) {
          const box = await blocks.nth(i).boundingBox();
          expect(box, `scene block ${i + 1}`).not.toBeNull();
          expect(box!.height, `scene block ${i + 1} height`).toBeGreaterThanOrEqual(44);
        }
      });
    });
  }
});
