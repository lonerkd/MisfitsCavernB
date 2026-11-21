import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { adminClient, createCast, createPersona, destroyCast, type Cast, type Persona } from './support/personas';
import { createCrewedProject } from './support/project';

// Over-budget alert: when committed + paid spend first exceeds the planned budget (> 0), the owner (Sam) and people who hold
// budget.write (Jordan, a production accountant) are told once; a designer (Dana) without it and an outsider (Riley) are not.
// Spend dropping back to the plan re-arms it, so the next crossing tells them again.
let cast: Cast;
let dana: Persona;
let projectId: string;
let lineId: string;

const told = async (who: Persona) =>
  (await adminClient().from('notifications').select('title, body, link').eq('user_id', who.id).eq('type', 'budget').order('created_at')).data ?? [];
const spend = async (amount: number, status = 'committed') => {
  const { data, error } = await cast.sam.client.from('expenses').insert({ project_id: projectId, budget_item_id: lineId, description: 'Gear', amount, status }).select('id').single();
  expect(error).toBeNull();
  return data!.id;
};

beforeAll(async () => {
  cast = await createCast();
  dana = await createPersona('dana');
  ({ projectId } = await createCrewedProject(cast, 'Over budget'));
  await adminClient().from('project_crew').update({ craft: 'Production accountant' }).eq('project_id', projectId).eq('user_id', cast.jordan.id);
  await adminClient().from('project_crew').insert({ project_id: projectId, user_id: dana.id, role: 'contributor', craft: 'Production designer', status: 'confirmed' });
  lineId = (await cast.sam.client.from('budget_items').insert({ project_id: projectId, category: 'Camera', amount: 1000 }).select('id').single()).data!.id;
});
afterAll(async () => { await destroyCast({ ...cast, dana }); });

describe('over-budget alert', () => {
  it('stays quiet within the plan, even exactly at it', async () => {
    await spend(600);
    await spend(400, 'paid');
    for (const who of [cast.sam, cast.jordan, dana, cast.riley]) expect(await told(who)).toEqual([]);
  });

  it('tells the owner and the budget writers once when spend crosses the plan; not a designer, not an outsider', async () => {
    const over = await spend(50);
    for (const who of [cast.sam, cast.jordan]) {
      const rows = await told(who);
      expect(rows).toHaveLength(1);
      expect(rows[0].title).toMatch(/^Over budget: Over budget/);
      expect(rows[0].body).toContain('$1,050.00');
      expect(rows[0].body).toContain('$1,000.00');
      expect(rows[0].link).toBe(`/studio?project=${projectId}&tab=production&view=money`);
    }
    for (const who of [dana, cast.riley]) expect(await told(who)).toEqual([]);

    // Already over: more spend, or changing a status, does not tell them again.
    await spend(25);
    await cast.sam.client.from('expenses').update({ status: 'paid' }).eq('id', over);
    expect(await told(cast.sam)).toHaveLength(1);
    expect(await told(cast.jordan)).toHaveLength(1);
  });

  it('re-arms when spend drops back under, and the next crossing tells them again', async () => {
    const { data } = await adminClient().from('expenses').select('id, amount').eq('project_id', projectId).in('amount', [50, 25]);
    for (const e of data!) await cast.sam.client.from('expenses').delete().eq('id', e.id);
    const state = (await adminClient().from('budget_alerts').select('alerted').eq('project_id', projectId).single()).data;
    expect(state?.alerted).toBe(false);
    await spend(10);
    expect(await told(cast.sam)).toHaveLength(2);
    expect(await told(cast.jordan)).toHaveLength(2);
    expect(await told(dana)).toEqual([]);
  });

  it('raising the plan re-arms it too (a budget line edit), and no plan never alerts', async () => {
    await cast.sam.client.from('budget_items').update({ amount: 5000 }).eq('id', lineId);
    expect((await adminClient().from('budget_alerts').select('alerted').eq('project_id', projectId).single()).data?.alerted).toBe(false);
    await cast.sam.client.from('budget_items').update({ amount: 0 }).eq('id', lineId);
    expect(await told(cast.sam)).toHaveLength(2);
  });

  it('the alert state is nobody’s to read or write through the API', async () => {
    for (const who of [cast.sam, cast.jordan, cast.riley]) {
      expect((await who.client.from('budget_alerts').select('project_id').eq('project_id', projectId)).data ?? []).toEqual([]);
      expect((await who.client.from('budget_alerts').update({ alerted: false }).eq('project_id', projectId)).error).not.toBeNull();
    }
  });

  it('deleting a project with lines and spend still works', async () => {
    const p = await createCrewedProject(cast, 'Doomed');
    const line = (await cast.sam.client.from('budget_items').insert({ project_id: p.projectId, category: 'X', amount: 10 }).select('id').single()).data!;
    await cast.sam.client.from('expenses').insert({ project_id: p.projectId, budget_item_id: line.id, description: 'Y', amount: 99 });
    expect((await adminClient().from('projects').delete().eq('id', p.projectId)).error).toBeNull();
  });
});
