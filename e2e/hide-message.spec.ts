import { type Browser } from '@playwright/test';
import { test, expect, stackEnabled, stackSkipReason, type QaUser, type Stack } from './support/stack';

// A reported message: the admin reads it in the queue, hides it, the channel then
// reads a notice instead of the words, and the admin brings it back.
// Opt-in: E2E_LOCAL_STACK=1 (or the staging variables; see e2e/support/stack.ts).
let TAG = '';
let WORDS = '';
let CHANNEL = '';

test.describe.serial('Hiding a reported message (local Supabase)', () => {
  test.skip(!stackEnabled, stackSkipReason);

  const users = {} as Record<'boss' | 'poster' | 'member', QaUser>;
  let channelId = '';
  let messageId = '';

  test.beforeAll(async ({ stack }) => {
    const admin = stack.admin;
    TAG = stack.tag.replace(/[0-9]/g, (d) => 'abcdefghij'[+d]);
    WORDS = `Send me money first ${TAG}`;
    CHANNEL = `hidetest-${TAG}`;
    for (const k of ['boss', 'poster', 'member'] as const) users[k] = await stack.createUser({ label: k });
    await admin.from('profiles').update({ is_admin: true }).eq('id', users.boss.id);
    channelId = (await stack.insert('channels', { name: CHANNEL, project_id: null, type: 'text', audience: 'users', post_policy: 'viewers', created_by: users.boss.id })).id;
    messageId = (await stack.insert('messages', { sender_id: users.poster.id, channel_uuid: channelId, content: WORDS })).id;
    const rep = await admin.from('reports').insert({ reporter_id: users.member.id, kind: 'message', target_id: messageId, reason: 'Scam' });
    expect(rep.error).toBeNull();
    stack.onCleanup('report and audit rows', async () => {
      await admin.from('audit_logs').delete().eq('resource_id', messageId);
      await admin.from('reports').delete().eq('target_id', messageId);
    });
  });

  const signIn = async (stack: Stack, browser: Browser, user: QaUser) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await stack.signIn(page, user);
    return { ctx, page };
  };


  test('the admin reads it in the queue and hides it; the channel reads a notice', async ({ browser, stack }) => {
    test.setTimeout(150_000);
    const boss = await signIn(stack, browser, users.boss);
    await boss.page.goto('/admin/reports');
    await expect(boss.page.getByText(WORDS)).toBeVisible({ timeout: 30_000 });
    await boss.page.getByRole('button', { name: 'Hide the message' }).click();
    await boss.page.getByRole('button', { name: 'Hide it', exact: true }).click();
    await expect(boss.page.getByText('Hidden from everyone.')).toBeVisible({ timeout: 20_000 });
    expect((await stack.admin.from('messages').select('content').eq('id', messageId).single()).data?.content).toBe('[Removed by an admin]');
    await expect(boss.page.getByText(WORDS)).toBeVisible(); // the admin still reads the original

    const member = await signIn(stack, browser, users.member);
    await member.page.goto('/lounge');
    await member.page.getByRole('button', { name: CHANNEL, exact: true }).click({ timeout: 30_000 });
    await expect(member.page.getByText('[Removed by an admin]')).toBeVisible({ timeout: 20_000 });
    await expect(member.page.getByText(WORDS)).toHaveCount(0);
    await member.ctx.close();
    await boss.ctx.close();
  });

  test('the admin brings it back', async ({ browser, stack }) => {
    test.setTimeout(120_000);
    const boss = await signIn(stack, browser, users.boss);
    await boss.page.goto('/admin/reports');
    await boss.page.getByRole('button', { name: 'Bring it back' }).click({ timeout: 30_000 });
    await expect(boss.page.getByText('Visible to the channel.')).toBeVisible({ timeout: 20_000 });
    expect((await stack.admin.from('messages').select('content, hidden_at').eq('id', messageId).single()).data).toEqual({ content: WORDS, hidden_at: null });
    await boss.ctx.close();
  });
});
