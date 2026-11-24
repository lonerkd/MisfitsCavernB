import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { releaseHeld, toBatchPayload } from './dispatch';

type Row = Record<string, unknown>;
/** A tiny stand-in for the query builder: select/eq/is/gt/in/order filter the table, update records the patch for the rows matched. */
function fakeDb(tables: Record<string, Row[]>) {
  const updates: { table: string; patch: Row; ids: unknown[] }[] = [];
  const db = {
    from(table: string) {
      let rows = tables[table] ?? [];
      let patch: Row | null = null;
      const q: Record<string, unknown> = {
        select: () => q,
        update: (p: Row) => { patch = p; return q; },
        delete: () => { rows = []; return q; },
        eq: (c: string, v: unknown) => { rows = rows.filter((r) => r[c] === v); return q; },
        is: (c: string, v: unknown) => { rows = rows.filter((r) => (r[c] ?? null) === v); return q; },
        gt: () => q,
        in: (c: string, vs: unknown[]) => { rows = rows.filter((r) => vs.includes(r[c])); return q; },
        order: () => q,
        maybeSingle: () => Promise.resolve({ data: rows[0] ?? null, error: null }),
        then: (res: (v: unknown) => unknown) => {
          if (patch) updates.push({ table, patch, ids: rows.map((r) => r.id) });
          return Promise.resolve({ data: rows, error: null }).then(res);
        },
      };
      return q;
    },
  } as unknown as SupabaseClient;
  return { db, updates };
}

const U = 'u1';
const held = (id: string, type = 'note', title = `T${id}`) => ({ id, user_id: U, type, title, link: '/x', push_skipped: 'quiet-hours', pushed_at: null, created_at: new Date().toISOString() });
const quiet = { on: true, start: '22:00', end: '07:00', tz: 'UTC' };
const noon = new Date('2026-11-23T12:00:00Z');
const night = new Date('2026-11-23T23:00:00Z');
const base = (rows: Row[], prefs: Row = { quiet }) => ({
  profiles: [{ id: U, notification_prefs: prefs }],
  notifications: rows,
  push_subscriptions: [{ id: 's1', user_id: U, endpoint: 'https://e', p256dh: 'p', auth: 'a' }],
});

describe('toBatchPayload', () => {
  it('one held notification goes as itself', () => {
    expect(toBatchPayload([held('1')]).title).toBe('T1');
  });
  it('several say how many and name the first three', () => {
    const p = toBatchPayload(['1', '2', '3', '4', '5'].map((i) => held(i)));
    expect(p.title).toBe('5 things while you were away');
    expect(p.body).toBe('T1 · T2 · T3 · and 2 more');
    expect(p.tag).toBe('held-digest');
  });
});

describe('releaseHeld', () => {
  it('sends ONE push for everything held, then clears the markers', async () => {
    const { db, updates } = fakeDb(base([held('1'), held('2'), held('3')]));
    const sent: string[] = [];
    const r = await releaseHeld(db, U, async (_t, payload) => { sent.push(payload); return { statusCode: 201 }; }, noon);
    expect(sent).toHaveLength(1);
    expect(r).toMatchObject({ released: 3, sent: 1 });
    const done = updates.find((u) => u.table === 'notifications' && u.patch.push_skipped === null);
    expect(done?.ids).toEqual(['1', '2', '3']);
  });
  it('waits while the person is still in quiet hours', async () => {
    const { db } = fakeDb(base([held('1')]));
    let calls = 0;
    const r = await releaseHeld(db, U, async () => { calls++; return { statusCode: 201 }; }, night);
    expect(r.skipped).toBe('quiet-hours');
    expect(calls).toBe(0);
  });
  it('does nothing when nothing is held', async () => {
    const { db } = fakeDb(base([]));
    expect((await releaseHeld(db, U, async () => ({ statusCode: 201 }), noon)).skipped).toBe('nothing-held');
  });
  it('a failed send keeps nothing marked as delivered', async () => {
    const { db, updates } = fakeDb(base([held('1')]));
    const r = await releaseHeld(db, U, async () => { throw Object.assign(new Error('boom'), { statusCode: 500 }); }, noon);
    expect(r.sent).toBe(0);
    expect(updates.some((u) => u.patch.pushed_at)).toBe(false);
    expect(updates.some((u) => u.patch.push_skipped === 'failed')).toBe(true);
  });
});
