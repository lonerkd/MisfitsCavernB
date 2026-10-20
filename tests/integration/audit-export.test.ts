import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, adminClient, anonClient, type Cast } from './support/personas';
import { fetchAllAuditLogs } from '@/lib/audit/export';

// "Export all matches" on /admin/audit-logs: every row the filters match,
// across pages, read from the database in batches as the signed-in person.
// Sam is the platform admin, Jordan an ordinary member whose actions are on
// the record, Riley an ordinary member who must read none of it.
let cast: Cast;
const marker = `exp${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

beforeAll(async () => {
  cast = await createCast();
  await adminClient().from('profiles').update({ is_admin: true }).eq('id', cast.sam.id);
  const at = (i: number) => new Date(Date.UTC(2026, 9, 18, 12, 0, i)).toISOString();
  const rows = [
    // Five of one action — more than two batches of two.
    ...[0, 1, 2, 3, 4].map(i => ({ user_id: cast.jordan.id, action: 'admin_action', resource_type: 'test', resource_id: `${marker}-a${i}`, created_at: at(i) })),
    ...[5, 6].map(i => ({ user_id: cast.jordan.id, action: 'job_closed', resource_type: 'job', resource_id: `${marker}-j${i}`, created_at: at(i) })),
    // An account that is gone.
    { user_id: null, action: 'job_closed', resource_type: 'job', resource_id: `${marker}-gone`, created_at: at(7) },
  ];
  const { error } = await adminClient().from('audit_logs').insert(rows.map(r => ({ ...r, details: { marker } })));
  if (error) throw error;
});
afterAll(async () => {
  await adminClient().from('audit_logs').delete().like('resource_id', `${marker}%`);
  await adminClient().from('audit_logs').delete().eq('user_id', cast.jordan.id);
  await destroyCast(cast);
});

const ours = (ids: (string | undefined)[]) => ids.filter(id => id?.startsWith(marker)).sort();

describe('fetchAllAuditLogs', () => {
  it('reads every match across batches, with the action filter applied in the database', async () => {
    const logs = await fetchAllAuditLogs(cast.sam.client, { action: 'admin_action', search: marker }, 2);
    expect(ours(logs.map(l => l.resource_id))).toEqual([0, 1, 2, 3, 4].map(i => `${marker}-a${i}`));
    expect(logs.every(l => l.action === 'admin_action')).toBe(true);
    expect(logs.map(l => l.created_at)).toEqual([...logs.map(l => l.created_at)].sort().reverse());
  });

  it('searches the resource id across every action, and names an account that is gone', async () => {
    const logs = await fetchAllAuditLogs(cast.sam.client, { search: marker.toUpperCase() }, 3);
    expect(ours(logs.map(l => l.resource_id))).toHaveLength(8);
    expect(logs.find(l => l.resource_id === `${marker}-gone`)?.username).toBe('Deleted account');
    expect(new Set(logs.map(l => l.id)).size).toBe(logs.length);
  });

  it('searches the username in the database (a join), not only rows already loaded', async () => {
    const logs = await fetchAllAuditLogs(cast.sam.client, { search: cast.jordan.username }, 2);
    expect(ours(logs.map(l => l.resource_id))).toHaveLength(7);
    expect(logs.every(l => l.username === cast.jordan.username)).toBe(true);
  });

  it('takes the search literally: a wildcard in it matches nothing of ours', async () => {
    const logs = await fetchAllAuditLogs(cast.sam.client, { search: `${marker}%a` });
    expect(ours(logs.map(l => l.resource_id))).toEqual([]);
  });

  it('an ordinary member exports nothing (RLS)', async () => {
    for (const p of [cast.riley, cast.jordan]) {
      const logs = await fetchAllAuditLogs(p.client, { search: marker });
      expect(logs).toEqual([]);
    }
  });

  it('anon exports nothing', async () => {
    const logs = await fetchAllAuditLogs(anonClient(), { search: marker }).catch(() => []);
    expect(logs).toEqual([]);
  });
});
