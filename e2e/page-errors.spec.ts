import { chromium, devices } from '@playwright/test';
import { test, expect, stackEnabled, stackSkipReason, type QaUser } from './support/stack';

// No page of the suite throws while it loads, on a phone either way up and on a desk: a script error is a
// bug, and a React hydration error (#418: the server drew one thing, the browser another) quietly rebuilds the
// page on the client and can drop a person's input. Several of those were found by looking (the editor's
// offline chip, every split pane); this makes the next one fail a spec instead.
// Opt-in: E2E_LOCAL_STACK=1 (or the staging variables; see e2e/support/stack.ts).
const SCRIPT = 'INT. DINER - NIGHT\n\nJUNIE stacks chairs.\n\nJUNIE\nWe close at six.\n\nELI\nThen I have till six.\n';
const VIEWPORTS = [
  { name: 'phone', options: { ...devices['iPhone 15 Pro'] } },
  { name: 'phone sideways', options: { ...devices['iPhone 15 Pro'], viewport: { width: 852, height: 393 }, screen: { width: 852, height: 393 } } },
  { name: 'desk', options: { viewport: { width: 1280, height: 800 } } },
] as const;

test.describe('No page errors (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  let me: QaUser;
  let projectId = '';
  let scriptId = '';
  let channelId = '';

  test.beforeAll(async ({ stack }) => {
    me = await stack.createUser({ label: 'errs' });
    projectId = (await stack.createProject(me, { title: `Errors ${stack.tag}`, status: 'pre-production' })).id;
    const script = await stack.insert('scripts', { title: 'Diner', content: SCRIPT, project_id: projectId, created_by: me.id, last_edited_by: me.id });
    scriptId = (script as { id: string }).id;
    const channel = await stack.insert('channels', { project_id: projectId, name: `set-${stack.tag}`, created_by: me.id });
    channelId = (channel as { id: string }).id;
  });

  for (const vp of VIEWPORTS) {
    test(`loads without a page error: ${vp.name}`, async ({ stack }) => {
      test.setTimeout(240_000);
      const routes = [
        '/', '/projects', `/projects/${projectId}`,
        `/editor?script=${scriptId}`, `/studio?project=${projectId}`, `/studio?project=${projectId}&tab=scenes`,
        `/studio?project=${projectId}&tab=library`, `/studio?project=${projectId}&tab=production`,
        `/studio?project=${projectId}&tab=production&view=money`, `/studio?project=${projectId}&tab=share`,
        `/lounge?channel=${channelId}`, '/crew', '/jobs', '/profile', '/settings', '/soundtrack', '/portfolio',
        `/split?project=${projectId}`,
      ];
      const browser = await chromium.launch({ executablePath: process.env.MC_LOCAL_CHROMIUM });
      const ctx = await browser.newContext(vp.options);
      const page = await ctx.newPage();
      const errors: string[] = [];
      let at = '';
      page.on('pageerror', (e) => errors.push(`${at}: ${e.message.slice(0, 160)}`));
      try {
        await stack.signIn(page, me);
        for (const route of routes) {
          at = route.replace(projectId, '<project>').replace(scriptId, '<script>').replace(channelId, '<channel>');
          await page.goto(route, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(2500);
        }
      } finally { await ctx.close(); await browser.close(); }
      expect(errors).toEqual([]);
    });
  }
});
