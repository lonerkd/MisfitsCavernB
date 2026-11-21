import { describe, it, expect } from 'vitest';
import { groupAboveBelow, parseTemplate, templateLineToItem, templateTotal } from './budget-templates';

const m = (id: string, planned: number, paid = 0) => ({ id, label: id, planned, committed: 0, paid, left: planned - paid });

describe('budget templates', () => {
  it('keeps well-formed lines only and totals them', () => {
    const t = parseTemplate({ id: 't', name: 'Indie', description: '', sort_order: 2, lines: [
      { category: 'Cast', name: 'Lead', amount: 100, above_the_line: true }, { name: ' ' }, { category: 'Crew', name: 'DP', amount: '50.5' }, null, { name: 'Bad', amount: -5 },
    ] });
    expect(t.lines.map((l) => l.name)).toEqual(['Lead', 'DP', 'Bad']);
    expect(t.lines[1]).toMatchObject({ amount: 50.5, above_the_line: false });
    expect(templateTotal(t)).toBe(150.5);
  });
  it('survives a lines value that is not an array', () => {
    expect(parseTemplate({ id: 't', name: 'x', description: '', sort_order: 0, lines: {} }).lines).toEqual([]);
  });
  it('makes the name the line and the group its description', () => {
    expect(templateLineToItem({ category: 'Cast', name: 'Lead', amount: 9, above_the_line: true })).toEqual({ category: 'Lead', description: 'Cast', amount: 9, above_the_line: true });
  });
  it('groups above and below with subtotals, leaving out an empty group', () => {
    const g = groupAboveBelow([m('a', 100, 30), m('b', 40), m('c', 60)], new Set(['a']));
    expect(g.map((x) => x.key)).toEqual(['above', 'below']);
    expect(g[0].subtotal).toEqual({ planned: 100, committed: 0, paid: 30, left: 70 });
    expect(g[1].subtotal.planned).toBe(100);
    expect(groupAboveBelow([m('a', 1)], new Set()).map((x) => x.key)).toEqual(['below']);
  });
});
