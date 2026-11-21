import { describe, it, expect } from 'vitest';
import { adminClient } from './support/personas';

// L6 (BACKLOG 3.28): guides live in the hub's Learn; the guide channel type is gone and none is left.
describe('guide channels are retired', () => {
  it('no guide channel is left, and the type is refused', async () => {
    const admin = adminClient();
    expect((await admin.from('channels').select('id').eq('type', 'guide')).data).toEqual([]);
    const r = await admin.from('channels').insert({ name: `guide-${Date.now().toString(36)}`, type: 'guide', topic: 'x', post_policy: 'managers', audience: 'users' });
    expect(r.error).not.toBeNull();
  });
  it('the other community channels are still there', async () => {
    const names = ((await adminClient().from('channels').select('name').is('project_id', null)).data ?? []).map((c: { name: string }) => c.name);
    expect(names).toEqual(expect.arrayContaining(['general', 'announcements']));
  });
});
