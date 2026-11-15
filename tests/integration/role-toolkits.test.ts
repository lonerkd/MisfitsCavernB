import { describe, it, expect } from 'vitest';
import { adminClient } from './support/personas';
import { DEPARTMENT_DEFAULTS, TOOLKITS, toolkitFor } from '@/lib/roles/toolkit';
import { DEPARTMENT_WORKFLOWS, WORKFLOWS, workflowFor } from '@/lib/roles/workflows';

// Role model, step 6: every role in the real catalogue has a working suite, and a role that holds a permission has the tool
// that uses it. Reads the catalogue and the capability templates from the database, so a craft an admin adds, or a template
// changed in a migration, cannot leave a role without its tool.
const USES: Record<string, string> = {
  'budget.write': 'money',
  'paperwork.write': 'paperwork',
  'casting.decide': 'crew',
  'schedule.write': 'schedule',
  'callsheet.issue': 'schedule',
  'locations.write': 'locations',
  'breakdown.write': 'breakdown',
};

describe('role toolkits against the real catalogue', () => {
  it('every craft resolves to a suite, and every department has a default', async () => {
    const { data, error } = await adminClient().from('crafts').select('name, department');
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThanOrEqual(58);
    for (const c of data!) {
      const kit = toolkitFor(c.name, c.department);
      expect(kit.views.length > 0 || kit.home, `${c.name} has nowhere to work`).toBeTruthy();
      expect(DEPARTMENT_DEFAULTS[c.department], `department ${c.department} has no default suite`).toBeDefined();
    }
  });

  it('has no toolkit for a craft that does not exist (a renamed craft cannot leave a stale suite)', async () => {
    const { data } = await adminClient().from('crafts').select('name');
    const names = new Set(data!.map((c) => c.name));
    for (const name of Object.keys(TOOLKITS)) expect(names.has(name), `${name} is not a craft`).toBe(true);
  });

  it('gives a role the tool for every permission its craft holds', async () => {
    const { data, error } = await adminClient().from('craft_capabilities').select('craft, capability');
    expect(error).toBeNull();
    const crafts = await adminClient().from('crafts').select('name, department');
    const dept = new Map(crafts.data!.map((c) => [c.name, c.department]));
    const missing: string[] = [];
    for (const row of data!) {
      const view = USES[row.capability];
      if (!view) continue;
      if (!toolkitFor(row.craft, dept.get(row.craft)).views.includes(view as never)) missing.push(`${row.craft} holds ${row.capability} but its suite has no ${view}`);
    }
    expect(missing).toEqual([]);
  });

  it('every craft has a written workflow with a step in a tool its suite holds (and no workflow names a craft or department that does not exist)', async () => {
    const { data, error } = await adminClient().from('crafts').select('name, department');
    expect(error).toBeNull();
    const names = new Set(data!.map((c) => c.name));
    const departments = new Set(data!.map((c) => c.department));
    for (const name of Object.keys(WORKFLOWS)) expect(names.has(name), `${name} is not a craft`).toBe(true);
    for (const d of Object.keys(DEPARTMENT_WORKFLOWS)) expect(departments.has(d) || d === 'Other', `${d} is not a department`).toBe(true);
    const bad: string[] = [];
    for (const c of data!) {
      const kit = toolkitFor(c.name, c.department);
      if (kit.home) continue; // performers and outside roles work away from the Studio
      const w = workflowFor(c.name, c.department);
      const tools = Object.values(w.stages).flat().map((st) => st?.tool).filter(Boolean);
      if (!tools.some((t) => kit.views.includes(t!))) bad.push(`${c.name} (${c.department}): no step in a tool its suite holds`);
    }
    expect(bad).toEqual([]);
  });
});
