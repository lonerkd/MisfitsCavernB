import { describe, it, expect } from 'vitest';
import { byDepartment, searchCrafts, suggestCraft, type Craft } from './core';

const c = (name: string, department: string, position: number): Craft => ({ name, department, color: '#888888', position });
const CRAFTS = [c('Director', 'Direction', 0), c('Prop master', 'Art', 63), c('Costume designer', 'Wardrobe', 70), c('Gaffer', 'Lighting & grip', 40), c('Editor', 'Editorial', 80), c('Other', 'Other', 111)];

describe('crafts', () => {
  it('groups by department in list order', () => {
    expect(byDepartment(CRAFTS).map((g) => g.department)).toEqual(['Direction', 'Lighting & grip', 'Art', 'Wardrobe', 'Editorial', 'Other']);
  });
  it('searches names and departments', () => {
    expect(searchCrafts(CRAFTS, 'grip').map((x) => x.name)).toEqual(['Gaffer']);
    expect(searchCrafts(CRAFTS, '  ')).toHaveLength(CRAFTS.length);
  });
  it('suggests the craft a budget line or category is about, else Other', () => {
    expect(suggestCraft('Breakdown · Props', CRAFTS)).toBe('Prop master');
    expect(suggestCraft('Wardrobe (3 items)', CRAFTS)).toBe('Costume designer');
    expect(suggestCraft('editor', CRAFTS)).toBe('Editor');
    expect(suggestCraft('Lighting package', CRAFTS)).toBe('Gaffer');
    expect(suggestCraft('Catering', CRAFTS)).toBe('Other');
  });
});
