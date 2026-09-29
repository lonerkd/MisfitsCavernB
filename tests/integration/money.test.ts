import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { adminClient, createCast, createPersona, destroyCast, type Cast, type Persona } from './support/personas';
import { createCrewedProject } from './support/project';

// Money as personas: Sam (owner) and Jordan (contributor) run spend and
// vendors; paid spend keeps the budget line's actual in step. Casey (a
// viewer on the crew) logs their own hours and sees no money; only the owner
// and leads approve hours and set the rate. Riley sees nothing.
let cast: Cast;
let casey: Persona;
let projectId: string;
let lineId: string;

const actual = async () => (await adminClient().from('budget_items').select('actual_cost').eq('id', lineId).single()).data?.actual_cost;

beforeAll(async () => {
  cast = await createCast();
  casey = await createPersona('casey');
  ({ projectId } = await createCrewedProject(cast, 'Money'));
  await adminClient().from('project_crew').insert({ project_id: projectId, user_id: casey.id, role: 'viewer', status: 'confirmed' });
  lineId = (await cast.sam.client.from('budget_items').insert({ project_id: projectId, category: 'Camera', amount: 1000, actual_cost: 50 }).select('id').single()).data!.id;
});
afterAll(async () => { await destroyCast({ ...cast, casey }); });

describe('vendors and spend', () => {
  it('committed, then paid — and the budget line’s actual follows what’s paid', async () => {
    const vendor = (await cast.sam.client.from('vendors').insert({ project_id: projectId, name: 'Lens House', category: 'Rentals' }).select('id').single()).data!;
    // Names are unique per project, whatever the case.
    expect((await cast.jordan.client.from('vendors').insert({ project_id: projectId, name: ' lens house ' })).error).not.toBeNull();

    const po = (await cast.jordan.client.from('expenses')
      .insert({ project_id: projectId, budget_item_id: lineId, vendor_id: vendor.id, description: 'Lens package', amount: 400, po_number: 'PO-001' })
      .select('id, status, paid_at').single()).data!;
    expect(po).toMatchObject({ status: 'committed', paid_at: null });
    // Spend exists against the line, none paid yet: the manual 50 gives way.
    expect(await actual()).toBeNull();

    const paid = (await cast.sam.client.from('expenses').update({ status: 'paid' }).eq('id', po.id).select('paid_at').single()).data!;
    expect(paid.paid_at).not.toBeNull();
    expect(Number(await actual())).toBe(400);

    const extra = (await cast.sam.client.from('expenses')
      .insert({ project_id: projectId, budget_item_id: lineId, description: 'Filters', amount: 100, status: 'paid' }).select('id').single()).data!;
    expect(Number(await actual())).toBe(500);
    await cast.sam.client.from('expenses').delete().eq('id', extra.id);
    expect(Number(await actual())).toBe(400);
  });

  it('is for the people who shape the project', async () => {
    for (const who of [casey, cast.riley]) {
      expect((await who.client.from('expenses').select('id').eq('project_id', projectId)).data).toEqual([]);
      expect((await who.client.from('vendors').select('id').eq('project_id', projectId)).data).toEqual([]);
      expect((await who.client.from('expenses').insert({ project_id: projectId, description: 'Sneaky', amount: 1 })).error).not.toBeNull();
    }
  });

  it('a budget line from another project can’t be charged', async () => {
    const other = (await adminClient().from('projects').insert({ title: 'Other', creator_id: cast.sam.id }).select('id').single()).data!;
    const otherLine = (await adminClient().from('budget_items').insert({ project_id: other.id, category: 'X', amount: 1 }).select('id').single()).data!;
    const { error } = await cast.sam.client.from('expenses').insert({ project_id: projectId, budget_item_id: otherLine.id, description: 'Wrong line', amount: 5 });
    expect(error).not.toBeNull();
    await adminClient().from('projects').delete().eq('id', other.id);
  });
});

describe('timesheets', () => {
  it('the crew log their own hours; the owner approves and sets the rate', async () => {
    const mine = (await casey.client.from('timesheets')
      .insert({ project_id: projectId, work_date: '2026-11-03', hours: 10, rate: 999 }).select('id, rate, status').single()).data!;
    // A crew member can't set their own rate or approve themselves.
    expect(mine).toMatchObject({ rate: null, status: 'submitted' });
    expect((await casey.client.from('timesheets').update({ status: 'approved' }).eq('id', mine.id)).error).not.toBeNull();

    // Only their own, and not Riley's business.
    expect((await cast.jordan.client.from('timesheets').select('id').eq('id', mine.id)).data).toHaveLength(1);
    expect((await cast.riley.client.from('timesheets').select('id').eq('project_id', projectId)).data).toEqual([]);
    expect((await cast.riley.client.from('timesheets').insert({ project_id: projectId, work_date: '2026-11-03', hours: 1 })).error).not.toBeNull();

    const approved = (await cast.sam.client.from('timesheets').update({ status: 'approved', rate: 30 }).eq('id', mine.id)
      .select('status, rate, decided_by, decided_at').single()).data!;
    expect(approved).toMatchObject({ status: 'approved', rate: 30, decided_by: cast.sam.id });
    expect(approved.decided_at).not.toBeNull();

    // Approved hours are settled: the crew member can't change them now.
    const { data: changed } = await casey.client.from('timesheets').update({ hours: 12 }).eq('id', mine.id).select('id');
    expect(changed ?? []).toEqual([]);
    // If the owner corrects the hours, it goes back for approval.
    const corrected = (await cast.sam.client.from('timesheets').update({ hours: 11 }).eq('id', mine.id).select('status, decided_by').single()).data!;
    expect(corrected).toEqual({ status: 'submitted', decided_by: null });
  });
});
