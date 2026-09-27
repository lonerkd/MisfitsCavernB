import { describe, it, expect } from 'vitest';
import {
  categoryKey, costByCategory, findMentions, groupForScene, indexMemory, nameKey, suggestForScene, titleCase,
  type BreakdownCategory, type BreakdownElement, type SceneElementTag,
} from './core';

const cat = (id: string, key: string, position: number, unit_cost = 0): BreakdownCategory =>
  ({ id, project_id: 'p', key, label: key, color: '#888888', position, unit_cost, created_at: '' });
const el = (id: string, name: string, category_id: string, cost: number | null = null): BreakdownElement =>
  ({ id, project_id: 'p', category_id, name, notes: null, status: 'needed', cost, assigned_to: null, created_by: null, created_at: '', updated_at: '' });
const tag = (scene_id: string, element_id: string): SceneElementTag => ({ scene_id, element_id, project_id: 'p', created_by: null, created_at: '' });

const CATS = [cat('c-props', 'props', 3, 50), cat('c-ward', 'wardrobe', 4), cat('c-sound', 'sound', 10), cat('c-cast', 'cast', 0)];

describe('findMentions', () => {
  it('finds whole words in any case, with plurals and possessives', () => {
    const text = "Maya grabs the REVOLVER. The revolver's chamber is empty. Two revolvers. Revolverish.";
    expect(findMentions(text, ['Revolver']).map((m) => text.slice(m.start, m.end))).toEqual(['REVOLVER', "revolver's", 'revolvers']);
  });

  it('prefers the longer name where names overlap, and spans line breaks in multi-word names', () => {
    const text = 'She ties the red\nscarf. The scarf flutters.';
    const found = findMentions(text, ['scarf', 'red scarf']);
    expect(found.map((m) => [m.name, text.slice(m.start, m.end)])).toEqual([['red scarf', 'red\nscarf'], ['scarf', 'scarf']]);
  });

  it('treats special characters in names literally', () => {
    expect(findMentions('A C-4 charge (live).', ['C-4', '(live)']).length).toBe(2);
  });
});

describe('suggestForScene', () => {
  const base = { characters: ['MAYA'], categories: CATS, dismissed: new Set<string>(), taggedElementIds: new Set<string>() };

  it('offers project elements the scene mentions but has not tagged', () => {
    const s = suggestForScene({ ...base, actionText: 'Maya checks the revolver.', elements: [el('e1', 'Revolver', 'c-props')] });
    expect(s).toEqual([{ name: 'Revolver', categoryId: 'c-props', reason: 'mentioned', elementId: 'e1' }]);
    expect(suggestForScene({ ...base, actionText: 'Maya checks the revolver.', elements: [el('e1', 'Revolver', 'c-props')], taggedElementIds: new Set(['e1']) })).toEqual([]);
  });

  it('offers CAPITALISED things the writer flagged, with a category hint, never characters', () => {
    const s = suggestForScene({ ...base, actionText: 'MAYA pulls on a LEATHER JACKET. A GUNSHOT echoes. She lifts the LANTERN.', elements: [] });
    const byName = Object.fromEntries(s.map((x) => [x.name, x.categoryId]));
    expect(byName).not.toHaveProperty('Maya');
    expect(s.every((x) => x.reason === 'detected')).toBe(true);
    expect(byName['Lantern']).toBe('c-props');
  });

  it('remembers how you filed things in other projects — by name, even when not in caps', () => {
    const memory = indexMemory([
      { name: 'Brass lantern', category_key: 'props', projects: 2 },
      { name: 'Trench coat', category_key: 'wardrobe', projects: 1 },
      { name: 'Maya', category_key: 'props', projects: 1 },
      { name: 'Hovercraft', category_key: 'vehicles', projects: 1 },
    ]);
    const s = suggestForScene({ ...base, actionText: 'Maya lights two brass lanterns. A TRENCH COAT hangs by the door.', elements: [], memory });
    expect(s).toEqual([
      { name: 'Brass lantern', categoryId: 'c-props', reason: 'remembered' },
      { name: 'Trench coat', categoryId: 'c-ward', reason: 'remembered' },
    ]);
  });

  it('a capitalised word is filed where you filed it before, not where the word list guesses', () => {
    const memory = indexMemory([{ name: 'Sparks', category_key: 'sound', projects: 3 }]);
    const s = suggestForScene({ ...base, actionText: 'SPARKS fly.', elements: [], memory });
    expect(s).toEqual([{ name: 'Sparks', categoryId: 'c-sound', reason: 'remembered' }]);
  });

  it('memory never overrides this project or what was dismissed', () => {
    const memory = indexMemory([{ name: 'Revolver', category_key: 'wardrobe', projects: 5 }, { name: 'Lantern', category_key: 'props', projects: 1 }]);
    const s = suggestForScene({
      ...base, actionText: 'Maya checks the revolver and the lantern.', memory,
      elements: [el('e1', 'Revolver', 'c-props')], dismissed: new Set([nameKey('Lantern')]),
    });
    expect(s).toEqual([{ name: 'Revolver', categoryId: 'c-props', reason: 'mentioned', elementId: 'e1' }]);
  });

  it('never re-offers what someone dismissed', () => {
    const s = suggestForScene({ ...base, actionText: 'She lifts the LANTERN.', elements: [], dismissed: new Set([nameKey('Lantern')]) });
    expect(s).toEqual([]);
  });

  it('offers nothing without categories or action', () => {
    expect(suggestForScene({ ...base, categories: [], actionText: 'The LANTERN.', elements: [] })).toEqual([]);
    expect(suggestForScene({ ...base, actionText: '   ', elements: [] })).toEqual([]);
  });
});

describe('costByCategory', () => {
  it('uses each element’s cost, else the category unit cost, and counts what is unpriced', () => {
    const costs = costByCategory(CATS, [el('1', 'Revolver', 'c-props', 120), el('2', 'Lantern', 'c-props'), el('3', 'Jacket', 'c-ward')]);
    expect(costs.map((c) => [c.category.key, c.elements, c.amount, c.unpriced])).toEqual([
      ['props', 2, 170, 0],
      ['wardrobe', 1, 0, 1],
    ]);
  });
});

describe('groupForScene', () => {
  it('groups a scene’s elements by category in project order', () => {
    const els = [el('1', 'Revolver', 'c-props'), el('2', 'Jacket', 'c-ward'), el('3', 'Anvil', 'c-props'), el('4', 'Elsewhere', 'c-props')];
    const groups = groupForScene('s1', [tag('s1', '1'), tag('s1', '2'), tag('s1', '3'), tag('s2', '4')], els, CATS);
    expect(groups.map((g) => [g.category.key, g.elements.map((e) => e.name)])).toEqual([['props', ['Anvil', 'Revolver']], ['wardrobe', ['Jacket']]]);
  });
});

describe('names and keys', () => {
  it('title-cases shouted names and keeps written ones', () => {
    expect(titleCase('LEATHER JACKET')).toBe('Leather Jacket');
    expect(titleCase('iPhone')).toBe('iPhone');
  });
  it('makes a unique category key from a label', () => {
    expect(categoryKey('Hair & Makeup', new Set())).toBe('hair-makeup');
    expect(categoryKey('Props', new Set(['props']))).toBe('props-2');
    expect(categoryKey('!!!', new Set())).toBe('category');
  });
});

describe('nameKey', () => {
  it('keeps letters in any script and drops case, spaces and punctuation', () => {
    expect(nameKey("The Revolver's")).toBe('therevolvers');
    expect(nameKey('Катана')).toBe('катана');
    expect(nameKey('刀')).not.toBe(nameKey('剣'));
  });
});
