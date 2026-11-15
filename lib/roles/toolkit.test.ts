import { describe, expect, it } from 'vitest';
import { PRODUCTION_VIEWS } from '@/lib/os/progress';
import { DEPARTMENT_DEFAULTS, GENERIC_TOOLKIT, TOOLKITS, VIEW_NEEDS, openableViews, toolkitFor } from './toolkit';

const everyKit = [...Object.entries(TOOLKITS), ...Object.entries(DEPARTMENT_DEFAULTS)];

describe('role toolkits', () => {
  it('only name tools that exist, each at most once', () => {
    for (const [name, kit] of everyKit) {
      for (const v of kit.views) expect(PRODUCTION_VIEWS, `${name}: ${v}`).toContain(v);
      expect(new Set(kit.views).size, `${name} repeats a tool`).toBe(kit.views.length);
    }
  });

  it('give every role a place to work: tools in the Studio, or a call page / client review as its home', () => {
    for (const [name, kit] of everyKit) expect(kit.views.length > 0 || kit.home, `${name} has nowhere to work`).toBeTruthy();
    expect(GENERIC_TOOLKIT.views.length).toBeGreaterThan(0);
  });

  it('a role that is not in the Studio says so, and a role in the Studio is not sent away', () => {
    for (const [name, kit] of everyKit) if (kit.home) expect(kit.views.length, `${name}`).toBeLessThanOrEqual(2);
    expect(TOOLKITS['Actor'].home).toBe('call');
    expect(TOOLKITS['Client'].home).toBe('review');
    expect(TOOLKITS['Gaffer'].home).toBeUndefined();
  });

  it('name what each role still lacks, so a gap is on the record rather than assumed away', () => {
    for (const craft of ['Script supervisor', 'Casting director', 'Music supervisor', 'Editor', 'Actor', 'Investor']) {
      expect(TOOLKITS[craft].gaps.length, craft).toBeGreaterThan(0);
    }
  });

  it('falls back to the craft, then the department, then the generic suite', () => {
    expect(toolkitFor('Gaffer', 'Lighting & grip')).toBe(TOOLKITS['Gaffer']);
    expect(toolkitFor('A craft an admin added', 'Sound')).toBe(DEPARTMENT_DEFAULTS['Sound']);
    expect(toolkitFor('A craft an admin added', 'Unknown department')).toBe(GENERIC_TOOLKIT);
    expect(toolkitFor(null)).toBe(GENERIC_TOOLKIT);
  });

  it('leave out a tool the role could not open, so no tool in a role\'s suite says no', () => {
    const accountant = TOOLKITS['Production accountant'];
    expect(openableViews(accountant, new Set(['budget.read', 'paperwork.read']))).toEqual(['money', 'po', 'paperwork', 'claims']);
    expect(openableViews(accountant, new Set())).toEqual([]);
    expect(Object.keys(VIEW_NEEDS).sort()).toEqual(['claims', 'money', 'paperwork', 'po']);
  });
});
