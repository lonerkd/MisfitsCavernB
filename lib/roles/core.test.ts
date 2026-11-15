import { describe, expect, it } from 'vitest';
import { capabilitySource, describeRole, groupByArea, resolveCapabilities, templatesFrom, type CapabilityDef, type MemberRights } from './core';

const DEFS: CapabilityDef[] = [
  { key: 'budget.read', label: 'See the budget', area: 'Budget', edits: false },
  { key: 'budget.write', label: 'Edit the budget', area: 'Budget', edits: true },
  { key: 'media.write', label: 'Add to the boards', area: 'Media', edits: true },
  { key: 'review.approve', label: 'Approve', area: 'Review', edits: false },
];
const TPL = templatesFrom([
  { craft: 'Production designer', capability: 'media.write' },
  { craft: 'Production designer', capability: 'budget.read' },
  { craft: 'Production accountant', capability: 'budget.read' },
  { craft: 'Production accountant', capability: 'budget.write' },
]);
const member = (over: Partial<MemberRights> = {}): MemberRights => ({ tier: 'contributor', crafts: ['Production designer'], overrides: {}, ...over });

describe('resolveCapabilities (mirrors internal.has_capability)', () => {
  it('a craft grants its template', () => {
    expect([...resolveCapabilities(DEFS, member(), TPL)].sort()).toEqual(['budget.read', 'media.write']);
  });

  it('several crafts hold the union', () => {
    expect([...resolveCapabilities(DEFS, member({ crafts: ['Production designer', 'Production accountant'] }), TPL)].sort()).toEqual(['budget.read', 'budget.write', 'media.write']);
  });

  it('the owner’s override wins either way', () => {
    const held = resolveCapabilities(DEFS, member({ overrides: { 'budget.read': false, 'review.approve': true } }), TPL);
    expect([...held].sort()).toEqual(['media.write', 'review.approve']);
  });

  it('the tier is the ceiling: a view-only member never holds one that edits, but keeps reads and approvals', () => {
    const viewer = member({ tier: 'viewer', overrides: { 'budget.write': true, 'review.approve': true } });
    expect([...resolveCapabilities(DEFS, viewer, TPL)].sort()).toEqual(['budget.read', 'review.approve']);
  });

  it('no craft holds nothing', () => {
    expect(resolveCapabilities(DEFS, member({ crafts: [] }), TPL).size).toBe(0);
  });
});

describe('capabilitySource', () => {
  it('says why', () => {
    const m = member({ overrides: { 'budget.read': false, 'budget.write': true } });
    expect(capabilitySource(DEFS[0], m, TPL)).toBe('removed');
    expect(capabilitySource(DEFS[1], m, TPL)).toBe('granted');
    expect(capabilitySource(DEFS[2], m, TPL)).toBe('craft');
    expect(capabilitySource(DEFS[3], m, TPL)).toBeNull();
    expect(capabilitySource(DEFS[2], member({ tier: 'viewer' }), TPL)).toBe('tier');
  });
});

describe('groupByArea', () => {
  it('keeps the list order', () => {
    expect(groupByArea(DEFS).map((g) => [g.area, g.defs.length])).toEqual([['Budget', 2], ['Media', 1], ['Review', 1]]);
  });
});

describe('describeRole', () => {
  const defs: CapabilityDef[] = [
    { key: 'script.write', label: 'Write the script', area: 'Script', edits: true },
    { key: 'callsheet.issue', label: 'Issue call sheets', area: 'Schedule', edits: true },
    { key: 'budget.read', label: 'See the budget', area: 'Budget', edits: false },
    { key: 'budget.write', label: 'Edit the budget', area: 'Budget', edits: true },
    { key: 'casting.read', label: 'See casting submissions', area: 'Casting', edits: false },
    { key: 'casting.decide', label: 'Decide casting', area: 'Casting', edits: true },
    { key: 'paperwork.read', label: 'See paperwork', area: 'Paperwork', edits: false },
    { key: 'paperwork.write', label: 'Edit paperwork', area: 'Paperwork', edits: true },
  ];
  const held = (...k: string[]) => new Set(k);

  it('says what a crew member with no craft can and cannot do', () => {
    const r = describeRole({ craft: null, tier: 'contributor', held: held(), defs });
    expect(r.text).toBe("Crew member: You can add to and edit the project's tools. You cannot see the budget, casting submissions or paperwork.");
    expect(r.can).toEqual([]);
  });

  it('lists what a craft adds, and says "run" for the budget once they can edit it (not "see" as well)', () => {
    const r = describeRole({ craft: 'Production accountant', tier: 'contributor', held: held('budget.read', 'budget.write', 'paperwork.read', 'paperwork.write'), defs });
    expect(r.can).toEqual(['run the budget', 'run paperwork']);
    expect(r.cannot).toEqual(['see casting submissions']);
    expect(r.text).toBe("Production accountant: You can add to and edit the project's tools, and run the budget and run paperwork. You cannot see casting submissions.");
  });

  it('a department head who only reads the budget can see it and cannot edit it', () => {
    const r = describeRole({ craft: 'Production designer', tier: 'contributor', held: held('budget.read'), defs });
    expect(r.can).toEqual(['see the budget']);
    expect(r.cannot).toContain('edit the budget');
    expect(r.cannot).not.toContain('see the budget');
    expect(r.text).toContain('You cannot see casting submissions or paperwork or edit the budget.');
  });

  it('puts the other capabilities in catalogue order, in lower case', () => {
    const r = describeRole({ craft: '1st AD', tier: 'lead', held: held('callsheet.issue', 'script.write'), defs });
    expect(r.can).toEqual(['write the script', 'issue call sheets']);
  });

  it('a view-only member is told they can read and not change', () => {
    const r = describeRole({ craft: 'Client', tier: 'viewer', held: held('budget.read'), defs });
    expect(r.text.startsWith('Client: You can read the project but not change it, and see the budget.')).toBe(true);
    expect(describeRole({ craft: null, tier: 'viewer', held: held(), defs }).text.startsWith('Viewer: ')).toBe(true);
  });

  it('is the same sentence for someone not yet on the project: resolve their rights from the craft, then describe', () => {
    const templates = new Map([['Production accountant', new Set(['budget.read', 'budget.write'])]]);
    const rights = resolveCapabilities(defs, { tier: 'contributor', crafts: ['Production accountant'], overrides: {} }, templates);
    expect(describeRole({ craft: 'Production accountant', tier: 'contributor', held: rights, defs }).can).toEqual(['run the budget']);
    // the same craft at view-only access cannot edit, so it is only "see the budget"
    const viewOnly = resolveCapabilities(defs, { tier: 'viewer', crafts: ['Production accountant'], overrides: {} }, templates);
    expect(describeRole({ craft: 'Production accountant', tier: 'viewer', held: viewOnly, defs }).can).toEqual(['see the budget']);
  });
});
