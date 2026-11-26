import { test, expect, stackEnabled, stackSkipReason, signInAs } from './support/stack';
import { devices } from '@playwright/test';

// The "Categories & rates" sheet on an iPhone 15 Pro, both ways up: every category row reads swatch, name, rate, count, reorder, delete,
// with a readable name field, thumb-sized controls and nothing overlapping. Opt-in: E2E_LOCAL_STACK=1.
const SCRIPT = ['INT. KITCHEN - NIGHT', '', 'MAYA', 'Still up.', '', 'EXT. PIER - DAY', '', 'Boats.', ''].join('\n');
const PHONE = devices['iPhone 15 Pro'];
const SIDEWAYS = { ...PHONE, viewport: { width: 852, height: 393 }, screen: { width: 852, height: 393 } };

test.describe('Categories & rates on a phone (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  for (const [name, device] of [['portrait', PHONE], ['landscape', SIDEWAYS], ['desktop', { viewport: { width: 1280, height: 800 } }]] as const) {
    test(`${name}: a readable row per category, no overlap`, async ({ browser, stack }) => {
      test.setTimeout(120_000);
      const owner = await stack.createUser({ label: 'catphone' });
      const project = await stack.createProject(owner, { title: `Cats ${stack.tag}`, status: 'pre-production' });
      await stack.insert('scripts', { title: 'Cats', content: 'INT. KITCHEN - NIGHT\n\nMAYA\nStill up.\n', project_id: project.id, created_by: owner.id, last_edited_by: owner.id });
      const ctx = await browser.newContext(device);
      const page = await ctx.newPage();
      await signInAs(page, owner);
      await page.goto('/studio?tab=production&view=breakdown');
      const picker = page.getByLabel('Active project');
      await picker.waitFor();
      if ((await picker.inputValue()) !== project.id) await picker.selectOption(project.id);
      await page.getByRole('button', { name: /Categories & rates/ }).click();
      const dialog = page.getByRole('dialog', { name: 'Categories & rates' });
      await expect(dialog).toBeVisible();
      await expect(dialog.locator('input[id^="cl-"]:not(#cl-new)').first()).toBeVisible({ timeout: 30_000 });
      await page.screenshot({ path: test.info().outputPath(`categories-${name}.png`) });

      const rows = await dialog.locator('[data-testid="cat-row"]').count();
      expect(rows).toBeGreaterThan(3);
      const geometry = await dialog.evaluate((root) => {
        const box = (el: Element | null) => { const r = el!.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, r: r.right, b: r.bottom }; };
        return Array.from(root.querySelectorAll('[data-testid="cat-row"]')).map((row) => ({
          name: box(row.querySelector('input[id^="cl-"]')),
          rate: box(row.querySelector('input[id^="cu-"]')),
          count: box(row.querySelector('[data-testid="cat-count"]')),
          buttons: Array.from(row.querySelectorAll('button')).map(box),
          row: box(row),
        }));
      });
      const overlap = (a: { x: number; y: number; r: number; b: number }, b: { x: number; y: number; r: number; b: number }) => a.x < b.r - 1 && b.x < a.r - 1 && a.y < b.b - 1 && b.y < a.b - 1;
      for (const g of geometry) {
        expect(g.name.w, 'the name field is readable').toBeGreaterThanOrEqual(120);
        expect(g.name.h).toBeGreaterThanOrEqual(40);
        expect(g.rate.h).toBeGreaterThanOrEqual(40);
        for (const b of g.buttons) { expect(b.w).toBeGreaterThanOrEqual(40); expect(b.h).toBeGreaterThanOrEqual(40); }
        const parts = [g.name, g.rate, g.count, ...g.buttons];
        for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) expect(overlap(parts[i], parts[j]), `parts ${i} and ${j} overlap`).toBe(false);
        for (const p of parts) expect(p.r).toBeLessThanOrEqual(g.row.r + 1);
      }
      // The dialog never scrolls sideways and Done is compact.
      expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      const done = await dialog.getByRole('button', { name: 'Done' }).boundingBox();
      expect(done!.width).toBeLessThanOrEqual(120);
      await ctx.close();
    });
  }

  test('readiness leads the Breakdown tab: what blocks, with the numbers and the tool that fixes it', async ({ page, stack }) => {
    test.setTimeout(120_000);
    const owner = await stack.createUser({ label: 'bdfocus' });
    const project = await stack.createProject(owner, { title: `Focus ${stack.tag}`, status: 'pre-production' });
    await stack.insert('scripts', { title: 'Focus', content: SCRIPT, project_id: project.id, created_by: owner.id, last_edited_by: owner.id });
    await signInAs(page, owner);
    await page.goto('/studio?tab=production&view=breakdown');
    const picker = page.getByLabel('Active project');
    await picker.waitFor();
    if ((await picker.inputValue()) !== project.id) await picker.selectOption(project.id);
    const panel = page.getByTestId('breakdown-focus');
    // Nothing tagged yet: the panel says so and points at the script.
    await expect(panel.getByText('Break the script down')).toBeVisible({ timeout: 30_000 });
    await expect(panel.getByRole('link', { name: /Tag it in the script/ })).toHaveAttribute('href', /\/editor\?script=/);
    // One element still needed, on one scene.
    const { data: cats } = await stack.admin.from('breakdown_categories').select('id, key').eq('project_id', project.id);
    const props = cats?.find((c) => c.key === 'props')?.id;
    expect(props).toBeTruthy();
    const el = (await stack.admin.from('breakdown_elements').insert({ project_id: project.id, category_id: props, name: 'Lantern', status: 'needed' }).select('id').single()).data!.id;
    const scene = (await stack.admin.from('scenes').select('id').eq('project_id', project.id).order('scene_number').limit(1)).data![0].id;
    await stack.admin.from('scene_elements').insert({ project_id: project.id, scene_id: scene, element_id: el });
    await page.reload();
    await expect(panel.getByText('1 scene with nothing tagged')).toBeVisible({ timeout: 30_000 });
    await expect(panel.getByText('1 element not ready')).toBeVisible();
    await expect(panel.getByText('1 still needed, 0 being sourced, 0 ready.')).toBeVisible();
    await expect(panel.getByRole('link', { name: /Scene by scene/ })).toBeVisible();
    await panel.getByRole('button', { name: /Show what is missing/ }).click();
    await expect(page.getByRole('button', { name: 'Lantern' }).first()).toBeVisible();
  });
});
