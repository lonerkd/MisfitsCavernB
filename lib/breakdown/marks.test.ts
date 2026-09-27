import { describe, it, expect } from 'vitest';
import { buildBreakdownView, sceneRanges, segments, actionTextOf, type EditorLine } from './marks';
import type { BreakdownCategory, BreakdownElement, SceneElementTag } from './core';

const cats: BreakdownCategory[] = [
  { id: 'props', project_id: 'p', key: 'props', label: 'Props', color: '#8e4ec6', position: 3, unit_cost: 0, created_at: '' },
  { id: 'sound', project_id: 'p', key: 'sound', label: 'Sound', color: '#a18072', position: 10, unit_cost: 0, created_at: '' },
];
const el = (id: string, name: string): BreakdownElement =>
  ({ id, project_id: 'p', category_id: 'props', name, notes: null, status: 'needed', cost: null, assigned_to: null, created_by: null, created_at: '', updated_at: '' });
const tag = (scene_id: string, element_id: string): SceneElementTag => ({ scene_id, element_id, project_id: 'p', created_by: null, created_at: '' });

const lines: EditorLine[] = [
  { text: 'INT. CAVE - NIGHT', type: 'slug' },
  { text: 'Sam lights the lantern and hears a GUNSHOT.', type: 'action' },
  { text: 'SAM', type: 'character' },
  { text: 'Where is the lantern?', type: 'dialogue' },
  { text: 'EXT. RIDGE - DAWN', type: 'slug' },
  { text: 'The lantern gutters.', type: 'action' },
];

describe('sceneRanges', () => {
  it('runs each heading to the line before the next', () => {
    const r = sceneRanges(lines, ['s1', null], [['SAM'], []]);
    expect(r.map((x) => [x.start, x.end, x.sceneId])).toEqual([[0, 3, 's1'], [4, 5, null]]);
    expect(actionTextOf(lines, r[0])).toBe('Sam lights the lantern and hears a GUNSHOT.');
  });
});

describe('buildBreakdownView', () => {
  const ranges = sceneRanges(lines, ['s1', 's2'], [['SAM'], []]);

  it('marks tagged elements in action only, and suggests untagged mentions and CAPS', () => {
    const v = buildBreakdownView({ lines, ranges, tags: [tag('s1', 'e1')], elements: [el('e1', 'Lantern')], categories: cats, dismissed: new Set() });
    const line1 = v.marks.get(1)!;
    expect(line1.map((m) => [m.kind, lines[1].text.slice(m.start, m.end)])).toEqual([['tag', 'lantern'], ['suggestion', 'GUNSHOT']]);
    expect(v.marks.has(3)).toBe(false); // dialogue is not breakdown material
    // Scene 2 mentions the lantern but hasn't tagged it.
    expect(v.suggestions.get(1)).toEqual([{ name: 'Lantern', categoryId: 'props', reason: 'mentioned', elementId: 'e1' }]);
    expect(v.marks.get(5)![0]).toMatchObject({ kind: 'suggestion', elementId: 'e1' });
    expect(v.suggestions.get(0)!.find((s) => s.name === 'Gunshot')?.categoryId).toBe('sound');
  });

  it('suggests nothing for a scene the index has not saved yet', () => {
    const v = buildBreakdownView({ lines, ranges: sceneRanges(lines, [null, null], [[], []]), tags: [], elements: [], categories: cats, dismissed: new Set() });
    expect(v.suggestions.get(0)).toEqual([]);
    expect(v.marks.size).toBe(0);
  });
});

describe('segments', () => {
  it('splits a line into plain and marked runs', () => {
    const text = 'a lantern here';
    const out = segments(text, [{ start: 2, end: 9, kind: 'tag', color: '#fff', name: 'Lantern', categoryId: 'props' }]);
    expect(out.map((s) => [s.text, !!s.mark])).toEqual([['a ', false], ['lantern', true], [' here', false]]);
    expect(segments(text, undefined)).toEqual([{ text }]);
  });
});
