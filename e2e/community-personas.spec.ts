import { test, expect, stackEnabled, stackSkipReason, type QaUser } from './support/stack';

// BACKLOG 3.36, the persona spec for /community against a real stack: Sam owns a project with an announcements channel, a
// private channel and a task for Jordan; Jordan is confirmed crew; Riley is an outsider. /community must show Jordan the
// project's items (Your projects, Yours to do, Updates, the Lounge's unread) and only the private channel he belongs to, and
// must show Riley none of it while the public parts (What's new, the section headings) stay. "What's new" is Misfits Cavern's
// own newsletter (hub posts), not the project's: the project's announcement reaches crew as an update and as Lounge unread.
// Opt-in: E2E_LOCAL_STACK=1 (or the staging variables; see e2e/support/stack.ts).

test.describe('Community personas (Sam, Jordan, Riley)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  let sam: QaUser;
  let jordan: QaUser;
  let riley: QaUser;
  let title: string;
  let taskTitle: string;
  let secretName: string;
  let secretId: string;
  let hubTitle: string;
  const announcement = 'Call is moved to 6am';

  test.beforeAll(async ({ stack }) => {
    sam = await stack.createUser({ label: 'cps' });
    jordan = await stack.createUser({ label: 'cpj' });
    riley = await stack.createUser({ label: 'cpr' });
    title = `Breakwater ${stack.tag}`;
    taskTitle = `Book the boat ${stack.tag}`;
    secretName = `secret${stack.tag}`;
    hubTitle = `Newsletter ${stack.tag}`;

    const { id: projectId } = await stack.createProject(sam, { title, status: 'pre-production' });
    await stack.insert('project_crew', { project_id: projectId, user_id: jordan.id, role: 'contributor', craft: 'Gaffer', status: 'confirmed', invited_by: sam.id });
    await stack.insert('project_tasks', { project_id: projectId, title: taskTitle, assigned_to: jordan.id });

    // The announcements channel (everyone on the team may read it) and a private one Jordan is not in.
    const ann = await stack.insert('channels', { project_id: projectId, name: 'announcements', type: 'text', audience: 'team', post_policy: 'managers', created_by: sam.id });
    await stack.insert('messages', { sender_id: sam.id, channel_uuid: ann.id, content: announcement });
    const secret = await stack.insert('channels', { project_id: projectId, name: secretName, type: 'text', audience: 'team', is_private: true, created_by: sam.id });
    secretId = secret.id;
    await stack.insert('channel_members', { channel_id: secretId, user_id: sam.id, can_post: true, can_manage: true });
    await stack.insert('messages', { sender_id: sam.id, channel_uuid: secretId, content: 'Budget talk, owner and invited only' });

    // What postAnnouncement leaves for each confirmed crew member.
    await stack.insert('notifications', { user_id: jordan.id, type: 'announcement', title: `Announcement · ${title}`, body: announcement, link: '/lounge' });

    // A published newsletter post: the public part of the page, for everyone signed in.
    await stack.insert('hub_posts', { kind: 'update', audience: 'everyone', title: hubTitle, body: 'What changed this week.', published_at: new Date(Date.now() - 60_000).toISOString() });
  });

  test('Jordan sees the project in Your day and only the private channel he is in', async ({ page, stack }) => {
    test.setTimeout(120_000);
    await stack.signIn(page, jordan);
    await page.goto('/community');

    const lounge = page.locator('[aria-labelledby="today-lounge"]');
    await expect(lounge.getByRole('link', { name: new RegExp(`#announcements · ${title}`) })).toBeVisible({ timeout: 30_000 });
    await expect(lounge.getByLabel('1 unread')).toHaveCount(1);
    // Not a member of the private channel: no row, no count, no name anywhere.
    await expect(lounge).not.toContainText(secretName);
    await expect(page.locator('#main-content')).not.toContainText(secretName);

    await expect(page.locator('[aria-labelledby="today-tasks"]')).toContainText(taskTitle);
    await expect(page.locator('[aria-labelledby="today-updates"]')).toContainText(`Announcement · ${title}`);
    await expect(page.locator('[aria-labelledby="today-projects"]')).toContainText(title);
    await expect(page.locator('[aria-labelledby="today-roles"]').getByRole('article', { name: `Your role on ${title}` })).toBeVisible();
    // The public newsletter is there too.
    await expect(page.locator('[aria-labelledby="home-hub"]')).toContainText(hubTitle);

    // Made a member of the private channel, its unread appears (checked in the database as well as on screen).
    await stack.insert('channel_members', { channel_id: secretId, user_id: jordan.id, can_post: true, can_manage: false });
    await page.reload();
    await expect(lounge.getByRole('link', { name: new RegExp(`#${secretName} · ${title}`) })).toBeVisible({ timeout: 30_000 });
    await expect(lounge.getByLabel('1 unread')).toHaveCount(2);
  });

  test('Riley sees none of the project and still sees the public parts', async ({ page, stack }) => {
    test.setTimeout(120_000);
    await stack.signIn(page, riley);
    await page.goto('/community');

    // The public parts load: the newsletter post and the section headings.
    const hub = page.locator('[aria-labelledby="home-hub"]');
    await expect(hub).toContainText(hubTitle, { timeout: 30_000 });
    await expect(page.getByRole('heading', { name: 'Crew open to work' })).toBeVisible();

    // Your day for an outsider is empty of Sam's work.
    await expect(page.locator('[aria-labelledby="today-lounge"]')).toContainText(/caught up/);
    await expect(page.locator('[aria-labelledby="today-tasks"]')).toContainText('Nothing assigned to you');
    await expect(page.locator('[aria-labelledby="today-projects"]')).toContainText('No projects yet');
    await expect(page.locator('[aria-labelledby="today-roles"]')).toHaveCount(0);
    await expect(page.locator('[aria-labelledby="today-invites"]')).toHaveCount(0);
    const text = await page.locator('#main-content').innerText();
    for (const secret of [title, taskTitle, secretName, 'Announcement ·', announcement, 'Budget talk']) expect(text).not.toContain(secret);
    // Sam may appear in Crew open to work (a public directory of people); never beside the project.
    const yourDay = await page.locator('#main-content').locator('[aria-labelledby^="today-"]').allInnerTexts();
    for (const block of yourDay) expect(block).not.toContain(sam.username);
  });

  test('Sam, the owner, sees his own project', async ({ page, stack }) => {
    test.setTimeout(120_000);
    await stack.signIn(page, sam);
    await page.goto('/community');
    await expect(page.locator('[aria-labelledby="today-projects"]')).toContainText(title, { timeout: 30_000 });
  });
});
