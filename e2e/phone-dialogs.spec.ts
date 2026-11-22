import { test, expect, stackEnabled, stackSkipReason, signInAs } from './support/stack';

// Dialogs on a phone (BACKLOG 3.41): the Studio's "Storyboard frame for shot" picker stacks its header (the title on its own line(s),
// the buttons in one wrapping row under it, all inside the dialog), the search field has the width and a short placeholder, nothing
// scrolls sideways, and the full-bleed backdrop keeps clear of the notch (a safe-area `max()` on every side).
// Opt-in: E2E_LOCAL_STACK=1.
const SCRIPT = ['INT. KITCHEN - DAY', '', 'MAYA', 'Still up.', ''].join('\n');
const PHONES = [
  { name: 'portrait 390x844', viewport: { width: 390, height: 844 } },
  { name: 'landscape 844x390', viewport: { width: 844, height: 390 } },
];

test.describe('Dialogs on a phone (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  for (const phone of PHONES) {
    test(`the storyboard frame picker, ${phone.name}`, async ({ browser, stack }) => {
      test.setTimeout(150_000);
      const admin = stack.admin;
      const owner = await stack.createUser({ label: 'dialogs' });
      const project = await stack.createProject(owner, { title: `Dialogs ${stack.tag}`, status: 'production' });
      await stack.insert('scripts', { title: 'Dialogs', content: SCRIPT, project_id: project.id, created_by: owner.id, last_edited_by: owner.id });
      expect((await admin.from('media').insert([
        { project_id: project.id, kind: 'image', title: 'Coat reference', external_url: 'https://example.com/coat.jpg' },
        { project_id: project.id, kind: 'image', title: 'Pier reference', external_url: 'https://example.com/pier.jpg' },
      ])).error).toBeNull();

      const ctx = await browser.newContext({ viewport: phone.viewport, isMobile: true, hasTouch: true });
      const page = await ctx.newPage();
      try {
        await signInAs(page, owner);
        await page.goto('/studio?tab=scenes');
        const picker = page.getByLabel('Active project');
        await picker.waitFor();
        if ((await picker.inputValue()) !== project.id) await picker.selectOption(project.id);
        await expect.poll(async () => (await admin.from('scenes').select('id').eq('project_id', project.id).is('removed_at', null)).data?.length, { timeout: 30_000 }).toBe(1);
        const scene = (await admin.from('scenes').select('id').eq('project_id', project.id).single()).data!;
        expect((await admin.from('shots').insert({ project_id: project.id, scene_id: scene.id, shot_number: '1.1', created_by: owner.id })).error).toBeNull();
        await page.reload();

        await page.getByRole('button', { name: /storyboard frame to shot 1\.1/i }).first().click({ timeout: 30_000 });
        const dialog = page.getByRole('dialog', { name: /Storyboard frame for shot/ });
        await expect(dialog).toBeVisible();
        const d = (await dialog.boundingBox())!;
        const title = (await dialog.locator('[id^="modal-"]').boundingBox())!;

        // Every action lies inside the dialog, and in a row under the title block.
        for (const name of ['Upload', 'Add link', 'Use as frame', 'Close']) {
          const b = (await dialog.getByRole('button', { name: new RegExp(`^\\s*${name}`) }).first().boundingBox())!;
          expect(b.x, name).toBeGreaterThanOrEqual(d.x - 1);
          expect(b.x + b.width, name).toBeLessThanOrEqual(d.x + d.width + 1);
          expect(b.y, name).toBeGreaterThanOrEqual(d.y - 1);
          expect(b.y + b.height, name).toBeLessThanOrEqual(d.y + d.height + 1);
          if (phone.viewport.width < 500) expect(b.y, `${name} sits under the title`).toBeGreaterThanOrEqual(title.y + title.height - 1);
        }

        // The search field: a short placeholder and at least 60% of the dialog.
        const search = dialog.getByRole('searchbox');
        expect(await search.getAttribute('placeholder')).toBe('Search library');
        if (phone.viewport.width < 500) expect((await search.boundingBox())!.width).toBeGreaterThanOrEqual(d.width * 0.6);

        // Nothing scrolls sideways, and the dialog stays on screen.
        const sideways = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(sideways).toBeLessThanOrEqual(1);
        expect(d.x).toBeGreaterThanOrEqual(0);
        expect(d.x + d.width).toBeLessThanOrEqual(phone.viewport.width + 1);

        // The backdrop's padding carries a safe-area max() on all four sides (an emulated browser reports the insets as 0).
        const rule = await page.evaluate(() => {
          for (const sheet of Array.from(document.styleSheets)) {
            let rules: CSSRuleList;
            try { rules = sheet.cssRules; } catch { continue; }
            for (const r of Array.from(rules)) if (r instanceof CSSStyleRule && /backdrop/.test(r.selectorText) && r.style.padding.includes('safe-area-inset-left')) return r.style.padding;
          }
          return '';
        });
        expect(rule).toContain('env(safe-area-inset-left)');
        expect(rule).toContain('env(safe-area-inset-right)');
        expect(rule).toContain('env(safe-area-inset-top)');
        expect(rule).toContain('env(safe-area-inset-bottom)');
      } finally {
        await ctx.close();
      }
    });
  }
});
