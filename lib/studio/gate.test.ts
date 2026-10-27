import { describe, it, expect } from 'vitest';
import { defaultAction, gateItems, summarize, toDecisions, type GateItem } from './gate';

const item = (id: string, over: Partial<GateItem> = {}): GateItem => ({ id, title: id, kind: 'link', shared: false, lifecycle: 'working', ...over });

describe('defaultAction', () => {
  it('carries forward from the early phases and archives from production on', () => {
    expect(defaultAction('development')).toBe('carry');
    expect(defaultAction('pre-production')).toBe('carry');
    expect(defaultAction('production')).toBe('archive');
    expect(defaultAction('post-production')).toBe('archive');
  });
});

describe('gateItems', () => {
  it('lists what is not archived, by title', () => {
    expect(gateItems([item('b'), item('a'), item('z', { lifecycle: 'archived' })]).map((m) => m.id)).toEqual(['a', 'b']);
  });
});

describe('toDecisions and summarize', () => {
  const items = [item('a', { shared: true }), item('b'), item('c')];
  it('uses the chosen action, else the phase default', () => {
    expect(toDecisions(items, { a: 'archive' }, 'pre-production')).toEqual([
      { id: 'a', action: 'archive' }, { id: 'b', action: 'carry' }, { id: 'c', action: 'carry' },
    ]);
    expect(toDecisions(items, { b: 'carry' }, 'production').map((d) => d.action)).toEqual(['archive', 'carry', 'archive']);
  });
  it('counts what will be carried, archived and taken off the share link', () => {
    const decisions = toDecisions(items, { a: 'archive', b: 'archive' }, 'pre-production');
    expect(summarize(decisions, items)).toEqual({ carried: 1, archived: 2, unpublished: 1 });
  });
});
