import { describe, it, expect } from 'vitest';
import { defaultAction, gateItems, MAX_EXCEPTIONS, summarize, toBulk, toDecisions, type GateDecision, type GateItem } from './gate';

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

describe('toBulk', () => {
  const many = (n: number, action: GateDecision['action'], from = 0): GateDecision[] => Array.from({ length: n }, (_, i) => ({ id: `id${from + i}`, action }));
  it('carries on by default and lists what to archive', () => {
    expect(toBulk([{ id: 'a', action: 'archive' }, { id: 'b', action: 'carry' }])).toEqual({ default: 'carry', exceptions: ['a'], tooMany: false });
  });
  it('flips to archive-except when more than the limit is archived', () => {
    const d = [...many(MAX_EXCEPTIONS + 5, 'archive'), ...many(3, 'carry', 5000)];
    expect(toBulk(d)).toMatchObject({ default: 'archive', tooMany: false });
    expect(toBulk(d).exceptions).toEqual(['id5000', 'id5001', 'id5002']);
  });
  it('says so when both sides are over the limit', () => {
    expect(toBulk([...many(MAX_EXCEPTIONS + 1, 'archive'), ...many(MAX_EXCEPTIONS + 1, 'carry', 9000)]).tooMany).toBe(true);
  });
});
