import { describe, expect, it } from 'vitest';
import { sceneCosts, type CostCategory, type CostElement, type CostScene, type CostTag } from './scene-cost';

const cats: CostCategory[] = [{ id: 'props', unit_cost: 0 }, { id: 'wardrobe', unit_cost: 40 }];
const scenes: CostScene[] = [
  { id: 's1', shoot_day: 1 }, { id: 's2', shoot_day: 1 }, { id: 's3', shoot_day: 2 }, { id: 's4', shoot_day: null },
];
const tag = (scene_id: string, element_id: string): CostTag => ({ scene_id, element_id });

describe('sceneCosts', () => {
  it('a scene’s cost is its own elements: the figure entered, else the category’s default', () => {
    const elements: CostElement[] = [
      { id: 'gun', category_id: 'props', cost: 120 },
      { id: 'coat', category_id: 'wardrobe', cost: null }, // 40 by default
      { id: 'hat', category_id: 'wardrobe', cost: 15.5 },
    ];
    const r = sceneCosts({ scenes, categories: cats, elements, tags: [tag('s1', 'gun'), tag('s1', 'coat'), tag('s2', 'hat')] });
    expect(r.byScene.get('s1')).toMatchObject({ own: 160, shared: 0, total: 160, estimated: 40, unpriced: 0, elements: 2 });
    expect(r.byScene.get('s2')?.total).toBe(15.5);
    expect(r.byScene.get('s3')?.total).toBe(0);
  });

  it('an element used in several scenes is paid once: its cost is split, and the scenes add up to the whole', () => {
    const elements: CostElement[] = [{ id: 'car', category_id: 'props', cost: 100 }, { id: 'lamp', category_id: 'props', cost: 10 }];
    const r = sceneCosts({ scenes, categories: cats, elements, tags: [tag('s1', 'car'), tag('s2', 'car'), tag('s3', 'car'), tag('s1', 'lamp')] });
    const totals = ['s1', 's2', 's3'].map((id) => r.byScene.get(id)!.total);
    expect(totals.reduce((a, b) => a + b, 0)).toBeCloseTo(110, 10);
    expect(r.byScene.get('s1')).toMatchObject({ own: 10, shared: 33.34 }); // the odd cent goes to the first scene
    expect(r.byScene.get('s2')?.shared).toBe(33.33);
    expect(r.projectTotal).toBe(110);
  });

  it('a day is the sum of its scenes; unscheduled scenes come last', () => {
    const elements: CostElement[] = [{ id: 'a', category_id: 'props', cost: 50 }, { id: 'b', category_id: 'props', cost: 30 }, { id: 'c', category_id: 'props', cost: 5 }];
    const r = sceneCosts({ scenes, categories: cats, elements, tags: [tag('s1', 'a'), tag('s2', 'b'), tag('s3', 'a'), tag('s4', 'c')] });
    expect(r.byDay.map((d) => [d.day, d.scenes, d.total])).toEqual([[1, 2, 25 + 30], [2, 1, 25], [null, 1, 5]]);
    expect(r.byDay.reduce((n, d) => n + d.total, 0)).toBe(r.projectTotal);
  });

  it('says what rests on a default and what has no price at all', () => {
    const elements: CostElement[] = [{ id: 'coat', category_id: 'wardrobe', cost: null }, { id: 'mystery', category_id: 'props', cost: null }];
    const r = sceneCosts({ scenes, categories: cats, elements, tags: [tag('s1', 'coat'), tag('s1', 'mystery')] });
    expect(r.byScene.get('s1')).toMatchObject({ total: 40, estimated: 40, unpriced: 1 });
    expect(r.byDay[0]).toMatchObject({ day: 1, estimated: 40, unpriced: 1 });
  });

  it('an element in no scene is reported, not hidden, and a tag for an element that is gone is ignored', () => {
    const elements: CostElement[] = [{ id: 'idle', category_id: 'props', cost: 70 }, { id: 'x', category_id: 'props', cost: 5 }];
    const r = sceneCosts({ scenes, categories: cats, elements, tags: [tag('s1', 'ghost')] });
    expect(r.unplaced).toBe(75);
    expect(r.placed).toBe(0);
    expect(r.projectTotal).toBe(75);
    expect(r.byScene.get('s1')?.total).toBe(0);
  });

  it('scenes this call was not given (another script’s) take their share; placed + elsewhere + unplaced is the project total', () => {
    const elements: CostElement[] = [{ id: 'car', category_id: 'props', cost: 100 }, { id: 'solo', category_id: 'props', cost: 30 }, { id: 'idle', category_id: 'props', cost: 7 }];
    // The car is in s1 and in two scenes of another script; solo only in the other script; idle nowhere.
    const r = sceneCosts({ scenes, categories: cats, elements, tags: [tag('s1', 'car'), tag('other-a', 'car'), tag('other-b', 'car'), tag('other-a', 'solo')] });
    expect(r.byScene.get('s1')?.total).toBe(33.33); // a third of the car, not all of it (the odd cent goes to the first scene in id order)
    expect(r.placed).toBe(33.33);
    expect(r.elsewhere).toBe(96.67); // two thirds of the car and all of solo
    expect(r.unplaced).toBe(7);
    expect(r.placed + r.elsewhere + r.unplaced).toBeCloseTo(r.projectTotal, 10);
    expect(r.projectTotal).toBe(137);
  });

  it('copes with strings from the database, blanks and nonsense', () => {
    const elements: CostElement[] = [{ id: 'a', category_id: 'props', cost: '12.50' }, { id: 'b', category_id: 'props', cost: '' }, { id: 'c', category_id: 'nope', cost: 'abc' }];
    const r = sceneCosts({ scenes, categories: [{ id: 'props', unit_cost: '3' }], elements, tags: [tag('s1', 'a'), tag('s1', 'b'), tag('s1', 'c')] });
    expect(r.byScene.get('s1')?.total).toBe(15.5); // 12.50 + 3 (default for the blank) + 0 (unknown figure and category)
  });

  it('a tag listed twice counts once', () => {
    const r = sceneCosts({ scenes, categories: cats, elements: [{ id: 'a', category_id: 'props', cost: 9 }], tags: [tag('s1', 'a'), tag('s1', 'a')] });
    expect(r.byScene.get('s1')).toMatchObject({ own: 9, elements: 1 });
  });
});
