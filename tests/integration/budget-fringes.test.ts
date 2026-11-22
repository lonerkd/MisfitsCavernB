import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { adminClient, anonClient, createCast, createPersona, destroyCast, type Cast, type Persona } from './support/personas';
import { createCrewedProject } from './support/project';

// Budget fringes and per diems (parity gap 3). Sam owns; Jordan is a production accountant (budget.read and write, contributor);
// Dana is a contributor designer (shapes the project, no budget capability); Riley is an outsider. A line's base `amount` stays what was
// typed; `fringe_amount` is the database's own figure and is what the totals, the over-budget alert and the approval read.
let cast: Cast;
let dana: Persona;
let projectId: string;
let otherProject: string;

const told = async (who: Persona) =>
  (await adminClient().from('notifications').select('id').eq('user_id', who.id).eq('type', 'budget')).data ?? [];
const line = async (id: string) => (await cast.sam.client.from('budget_items').select('amount, fringe_amount, kind').eq('id', id).single()).data!;
const addLine = async (category: string, amount: number, extra: Record<string, unknown> = {}) => {
  const r = await cast.sam.client.from('budget_items').insert({ project_id: projectId, category, amount, ...extra }).select('id').single();
  expect(r.error).toBeNull();
  return r.data!.id;
};
const addFringe = async (name: string, percent: number, cap: number | null = null, client = cast.sam.client, project = projectId) =>
  client.from('budget_fringes').insert({ project_id: project, name, percent, cap_per_line: cap }).select('id').single();
const apply = async (item: string, fringe: string, client = cast.sam.client, project = projectId) =>
  client.from('budget_item_fringes').insert({ budget_item_id: item, fringe_id: fringe, project_id: project });

beforeAll(async () => {
  cast = await createCast();
  dana = await createPersona('dana');
  ({ projectId } = await createCrewedProject(cast, 'Fringes'));
  ({ projectId: otherProject } = await createCrewedProject(cast, 'Fringes elsewhere'));
  await adminClient().from('project_crew').update({ craft: 'Production accountant', role: 'contributor' }).eq('project_id', projectId).eq('user_id', cast.jordan.id);
  await adminClient().from('project_crew').insert({ project_id: projectId, user_id: dana.id, role: 'contributor', craft: 'Production designer', status: 'confirmed' });
});
afterAll(async () => { await destroyCast({ ...cast, dana }); });

describe('a project with no fringes', () => {
  it('behaves as before: the fringe is 0 and the client cannot set it', async () => {
    const id = await addLine('Camera', 1000, { fringe_amount: 999 });
    expect(await line(id)).toMatchObject({ amount: 1000, fringe_amount: 0, kind: 'line' });
    await cast.sam.client.from('budget_items').update({ fringe_amount: 5 }).eq('id', id);
    expect((await line(id)).fringe_amount).toBe(0);
  });
});

describe('fringes on a line', () => {
  it('the database computes the fringe: percent of the base, capped per line, summed, and follows every change', async () => {
    const id = await addLine('Gaffer', 10000);
    const pension = (await addFringe('Pension', 10, 400)).data!.id;
    const payroll = (await addFringe('Payroll tax', 7.65)).data!.id;
    expect((await apply(id, pension)).error).toBeNull();
    expect((await line(id)).fringe_amount).toBe(400);            // 10% = 1000, capped at 400
    expect((await apply(id, payroll)).error).toBeNull();
    expect((await line(id)).fringe_amount).toBe(1165);           // + 7.65% = 765
    await cast.sam.client.from('budget_items').update({ amount: 2000 }).eq('id', id);
    expect((await line(id)).fringe_amount).toBe(353);            // 200 + 153
    await cast.sam.client.from('budget_fringes').update({ cap_per_line: null, percent: 12 }).eq('id', pension);
    expect((await line(id)).fringe_amount).toBe(393);            // 240 + 153
    await cast.sam.client.from('budget_item_fringes').delete().eq('budget_item_id', id).eq('fringe_id', pension);
    expect((await line(id)).fringe_amount).toBe(153);
    await cast.sam.client.from('budget_fringes').delete().eq('id', payroll);
    expect(await line(id)).toMatchObject({ amount: 2000, fringe_amount: 0 });
  });

  it('a fringe name is unique per project, a rate stays within 0-100, and a fringe cannot be applied across projects', async () => {
    expect((await addFringe('Vacation', 4)).error).toBeNull();
    expect((await addFringe('vacation ', 5)).error).not.toBeNull();
    expect((await addFringe('Too much', 101)).error).not.toBeNull();
    const foreign = (await addFringe('Elsewhere', 5, null, cast.sam.client, otherProject)).data!.id;
    const id = await addLine('Grip', 100);
    expect((await apply(id, foreign)).error).not.toBeNull();
    expect((await apply(id, foreign, cast.sam.client, otherProject)).error).not.toBeNull();
  });
});

describe('per diems', () => {
  it('the amount is days x rate x people whatever the client sent, and fringes apply to it too', async () => {
    const id = await addLine('Per diem', 1, { kind: 'per_diem', pd_days: 12, pd_rate: 55, pd_people: 4 });
    expect(await line(id)).toMatchObject({ amount: 2640, kind: 'per_diem', fringe_amount: 0 });
    await cast.sam.client.from('budget_items').update({ pd_days: 10, amount: 1 }).eq('id', id);
    expect((await line(id)).amount).toBe(2200);
    const f = (await addFringe('Admin', 10)).data!.id;
    await apply(id, f);
    expect((await line(id)).fringe_amount).toBe(220);
    expect((await cast.sam.client.from('budget_items').insert({ project_id: projectId, category: 'Bad', amount: 0, kind: 'per_diem' })).error).not.toBeNull();
    expect((await cast.sam.client.from('budget_items').insert({ project_id: projectId, category: 'Bad', amount: 0, kind: 'weird' })).error).not.toBeNull();
  });
});

describe('the over-budget alert and the approval read the fringed total', () => {
  it('fringes raise the plan: spend that was over is now under, and crossing the fringed plan alerts', async () => {
    const { projectId: p } = await createCrewedProject(cast, 'Fringed alert');
    const item = (await cast.sam.client.from('budget_items').insert({ project_id: p, category: 'Camera', amount: 1000 }).select('id').single()).data!.id;
    const spend = (amount: number) => cast.sam.client.from('expenses').insert({ project_id: p, budget_item_id: item, description: 'Gear', amount, status: 'committed' });
    const before = (await told(cast.sam)).length;
    expect((await spend(1100)).error).toBeNull();            // over the 1000 base: the alert fires
    expect(await told(cast.sam)).toHaveLength(before + 1);
    const f = (await addFringe('Fringe', 21.5, null, cast.sam.client, p)).data!.id;
    await apply(item, f, cast.sam.client, p);                // plan is now 1215: back under, re-armed
    expect((await adminClient().from('budget_alerts').select('alerted').eq('project_id', p).single()).data?.alerted).toBe(false);
    expect((await spend(100)).error).toBeNull();             // 1200 <= 1215: quiet
    expect(await told(cast.sam)).toHaveLength(before + 1);
    expect((await spend(50)).error).toBeNull();              // 1250 > 1215: tells them again
    expect(await told(cast.sam)).toHaveLength(before + 2);
    await cast.sam.client.from('budget_fringes').update({ percent: 30 }).eq('id', f);   // plan 1300: re-armed by the fringe moving
    expect((await adminClient().from('budget_alerts').select('alerted').eq('project_id', p).single()).data?.alerted).toBe(false);

    // The owner's approval stamps the fringed total.
    await cast.sam.client.from('projects').update({ budget_approved_at: new Date().toISOString() }).eq('id', p);
    const a = (await cast.sam.client.from('projects').select('budget_approved_total').eq('id', p).single()).data!;
    expect(Number(a.budget_approved_total)).toBe(1300);
  });
});

describe('who can see and write them', () => {
  let fringeId: string;
  let itemId: string;
  beforeAll(async () => {
    fringeId = (await addFringe('Visible', 3)).data!.id;
    itemId = await addLine('Visible line', 500);
    await apply(itemId, fringeId);
  });

  it('the owner and the crew who read the budget see them; an outsider and anon see nothing', async () => {
    for (const t of ['budget_fringes', 'budget_item_fringes'] as const) {
      expect(((await cast.sam.client.from(t).select('*').eq('project_id', projectId)).data ?? []).length).toBeGreaterThan(0);
      expect(((await cast.jordan.client.from(t).select('*').eq('project_id', projectId)).data ?? []).length).toBeGreaterThan(0);
      expect(((await dana.client.from(t).select('*').eq('project_id', projectId)).data ?? []).length).toBeGreaterThan(0);
      expect((await cast.riley.client.from(t).select('*').eq('project_id', projectId)).data ?? []).toEqual([]);
      expect((await anonClient().from(t).select('*')).data ?? []).toEqual([]);
    }
  });

  it('only the budget crew who shape the project write them; others cannot add, change, apply or remove', async () => {
    for (const who of [dana, cast.riley]) {
      expect((await addFringe('Nope ' + who.username, 1, null, who.client)).error).not.toBeNull();
      expect((await apply(itemId, fringeId, who.client)).error).not.toBeNull();
      await who.client.from('budget_fringes').update({ percent: 99 }).eq('id', fringeId);
      await who.client.from('budget_fringes').delete().eq('id', fringeId);
      await who.client.from('budget_item_fringes').delete().eq('budget_item_id', itemId);
    }
    const intact = (await cast.sam.client.from('budget_fringes').select('percent').eq('id', fringeId).single()).data;
    expect(Number(intact?.percent)).toBe(3);
    expect((await line(itemId)).fringe_amount).toBe(15);
    const jordan = await addFringe('Jordan adds', 2, null, cast.jordan.client);
    expect(jordan.error).toBeNull();
    expect((await anonClient().from('budget_fringes').insert({ project_id: projectId, name: 'Anon', percent: 1 })).error).not.toBeNull();
  });

  it('a budget line carries its fringe to the crew that reads it, and not to anyone else', async () => {
    expect((await cast.jordan.client.from('budget_items').select('fringe_amount').eq('id', itemId).single()).data?.fringe_amount).toBe(15);
    expect((await cast.riley.client.from('budget_items').select('fringe_amount').eq('id', itemId)).data ?? []).toEqual([]);
  });
});
