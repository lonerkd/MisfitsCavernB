import { describe, expect, it } from 'vitest';
import { capabilitySource, groupByArea, resolveCapabilities, templatesFrom, type CapabilityDef, type MemberRights } from './core';

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
