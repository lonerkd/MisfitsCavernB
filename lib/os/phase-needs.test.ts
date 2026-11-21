import { describe, expect, it } from 'vitest';
import { EARLY_OPENS, MILESTONE_ROLES, lockNeeds, rolesUsing } from './phase-needs';
import { MILESTONES, TOOLS, EMPTY_SIGNALS, computeProgress, toolState } from './progress';
import { TOOLKITS } from '@/lib/roles/toolkit';

describe('phase needs', () => {
  it('every milestone names who does it, and every name is a real craft in the role model', () => {
    for (const m of MILESTONES) expect(MILESTONE_ROLES[m.id]?.length, m.id).toBeGreaterThan(0);
    for (const [id, roles] of Object.entries(MILESTONE_ROLES)) {
      expect(MILESTONES.some((m) => m.id === id), `${id} is a milestone`).toBe(true);
      for (const r of roles) expect(TOOLKITS[r], `${r} (${id}) is in the toolkits`).toBeTruthy();
    }
  });
  it('every early-open sentence is for a tool that really has an early rule', () => {
    for (const id of Object.keys(EARLY_OPENS)) expect(TOOLS.find((t) => t.id === id)?.early, id).toBeTypeOf('function');
    for (const t of TOOLS.filter((x) => x.early)) expect(EARLY_OPENS[t.id], `${t.id} says how it opens early`).toBeTruthy();
  });
  it('a locked tool lists what is left before its phase, the current phase first', () => {
    const progress = computeProgress({ ...EMPTY_SIGNALS, status: 'development', logline: true, scripts: 1 });
    const needs = lockNeeds(progress, toolState(progress, 'post')!);
    expect(needs.phaseLabel).toMatch(/post/i);
    expect(needs.steps[0].current).toBe(true);
    expect(needs.steps.find((s) => s.id === 'logline')?.done).toBe(true);
    expect(needs.steps.some((s) => s.id === 'cut')).toBe(false); // the cut is in the tool's own phase, not before it
    expect(needs.ready).toBe(false);
    expect(needs.earlyOpens).toMatch(/cut/i);
    expect(needs.roles).toEqual(expect.arrayContaining(['Editor']));
  });
  it('production tools list the crafts whose suite holds them', () => {
    expect(rolesUsing('budget')).toEqual(expect.arrayContaining(['Producer', 'Production accountant']));
    expect(rolesUsing('script')).toEqual([]);
  });
});
