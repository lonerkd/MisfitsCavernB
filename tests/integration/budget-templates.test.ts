import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { adminClient, createCast, createPersona, destroyCast, type Cast, type Persona } from './support/personas';
import { createCrewedProject } from './support/project';

// Budget templates as personas. Any signed-in person reads the templates; only an admin writes them. Starting a budget from one is
// the ordinary budget write (no function): Sam (owner) can; Jordan with the budget craft can; Casey, a designer with no budget
// capability, cannot, and Riley (outsider) can neither read nor write a project's budget lines.
let cast: Cast;
let casey: Persona;
let admin: Persona;
let projectId: string;
const NAME = 'Test template';

beforeAll(async () => {
  cast = await createCast();
  casey = await createPersona('casey');
  admin = await createPersona('admin');
  await adminClient().from('profiles').update({ is_admin: true }).eq('id', admin.id);
  ({ projectId } = await createCrewedProject(cast, 'Templates'));
  await adminClient().from('project_crew').insert({ project_id: projectId, user_id: casey.id, role: 'contributor', status: 'confirmed', craft: 'Production designer' });
  await adminClient().from('project_crew').update({ craft: 'Production accountant' }).eq('project_id', projectId).eq('user_id', cast.jordan.id);
});
afterAll(async () => {
  await adminClient().from('budget_templates').delete().eq('name', NAME);
  await destroyCast({ ...cast, casey, admin });
});

describe('the templates', () => {
  it('ships micro, low, indie and studio, each with above and below the line lines, in plain dollars', async () => {
    const { data } = await cast.riley.client.from('budget_templates').select('name, lines').order('sort_order');
    expect(data!.map((t) => t.name)).toEqual(expect.arrayContaining(['Micro', 'Low', 'Indie', 'Studio']));
    for (const t of data!) {
      const lines = t.lines as Array<{ above_the_line: boolean; amount: number }>;
      expect(lines.length).toBeGreaterThanOrEqual(12);
      expect(lines.length).toBeLessThanOrEqual(20);
      expect(lines.some((l) => l.above_the_line)).toBe(true);
      expect(lines.some((l) => !l.above_the_line)).toBe(true);
    }
    const total = (n: string) => (data!.find((t) => t.name === n)!.lines as Array<{ amount: number }>).reduce((s, l) => s + l.amount, 0);
    expect(total('Micro')).toBeLessThan(total('Low'));
    expect(total('Low')).toBeLessThan(total('Indie'));
    expect(total('Indie')).toBeLessThan(total('Studio'));
  });

  it('is read by anyone signed in, written only by an admin', async () => {
    expect((await cast.riley.client.from('budget_templates').insert({ name: NAME, lines: [] })).error).not.toBeNull();
    expect((await cast.sam.client.from('budget_templates').insert({ name: NAME, lines: [] })).error).not.toBeNull();
    expect((await admin.client.from('budget_templates').insert({ name: NAME, description: 'x', sort_order: 9, lines: [{ category: 'Cast', name: 'Lead', amount: 1, above_the_line: true }] })).error).toBeNull();
    // A non-admin can neither change nor remove it (RLS hides the row from the write: nothing is affected).
    await cast.sam.client.from('budget_templates').update({ description: 'hacked' }).eq('name', NAME);
    await cast.sam.client.from('budget_templates').delete().eq('name', NAME);
    const row = (await cast.jordan.client.from('budget_templates').select('description').eq('name', NAME).single()).data;
    expect(row?.description).toBe('x');
    expect((await admin.client.from('budget_templates').update({ description: 'y' }).eq('name', NAME).select('description').single()).data?.description).toBe('y');
    // A line list that is not an array is refused.
    expect((await admin.client.from('budget_templates').update({ lines: { a: 1 } }).eq('name', NAME)).error).not.toBeNull();
  });

  it('a signed-out visitor cannot read them', async () => {
    const { anonClient } = await import('./support/personas');
    expect((await anonClient().from('budget_templates').select('id')).data ?? []).toEqual([]);
  });
});

describe('starting a budget from a template', () => {
  const rows = (above: boolean) => ({ project_id: projectId, category: 'Lead', description: 'Cast', amount: 100, above_the_line: above });

  it('Sam adds the lines, and moves one above the line', async () => {
    const { data: t } = await cast.sam.client.from('budget_templates').select('lines').eq('name', 'Indie').single();
    const lines = t!.lines as Array<{ category: string; name: string; amount: number; above_the_line: boolean }>;
    const ins = await cast.sam.client.from('budget_items').insert(lines.map((l) => ({ project_id: projectId, category: l.name, description: l.category, amount: l.amount, above_the_line: l.above_the_line })));
    expect(ins.error).toBeNull();
    const { data: items } = await cast.sam.client.from('budget_items').select('id, above_the_line').eq('project_id', projectId);
    expect(items).toHaveLength(lines.length);
    expect(items!.filter((i) => i.above_the_line).length).toBe(lines.filter((l) => l.above_the_line).length);
    const below = items!.find((i) => !i.above_the_line)!;
    expect((await cast.sam.client.from('budget_items').update({ above_the_line: true }).eq('id', below.id)).error).toBeNull();
    expect((await adminClient().from('budget_items').select('above_the_line').eq('id', below.id).single()).data?.above_the_line).toBe(true);
  });

  it('Jordan, whose craft holds the budget, can add a line', async () => {
    expect((await cast.jordan.client.from('budget_items').insert(rows(true))).error).toBeNull();
  });

  it('a crew member who can read the budget but not write it (a designer) cannot add a line or move one', async () => {
    expect((await casey.client.from('budget_items').insert(rows(false))).error).not.toBeNull();
    expect((await casey.client.from('budget_items').update({ above_the_line: true }).eq('project_id', projectId).select('id')).data ?? []).toEqual([]);
  });

  it('Riley, an outsider, cannot read or add the project’s budget lines', async () => {
    expect((await cast.riley.client.from('budget_items').select('id').eq('project_id', projectId)).data).toEqual([]);
    expect((await cast.riley.client.from('budget_items').insert(rows(false))).error).not.toBeNull();
    expect((await cast.riley.client.from('budget_items').update({ above_the_line: true }).eq('project_id', projectId).select('id')).data ?? []).toEqual([]);
  });
});
