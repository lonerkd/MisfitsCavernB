import { describe, it, expect } from 'vitest';
import { generateShootingSchedule } from './schedule';
import { parseScript } from './parser';

const SCRIPT = `INT. COFFEE SHOP - DAY

SAM sits at a corner table.

SAM
You're late again.

EXT. PARKING LOT - DAY

Jordan runs to a car.

INT. COFFEE SHOP - NIGHT

The shop is empty now.

EXT. WAREHOUSE - NIGHT

A silhouette moves in the dark.`;

describe('generateShootingSchedule', () => {
  const { lines, scenes } = parseScript(SCRIPT);
  const result = generateShootingSchedule(lines, scenes);

  it('groups scenes by location, merging repeated locations', () => {
    const coffeeShop = result.byLocation.find((g) => g.label.includes('COFFEE SHOP'));
    expect(coffeeShop).toBeDefined();
    expect(coffeeShop!.scenes).toHaveLength(2);
  });

  it('groups scenes by time of day', () => {
    const day = result.byTimeOfDay.find((g) => g.label === 'DAY');
    const night = result.byTimeOfDay.find((g) => g.label === 'NIGHT');
    expect(day?.scenes.length).toBe(2);
    expect(night?.scenes.length).toBe(2);
  });

  it('groups scenes by INT/EXT', () => {
    const int = result.byIntExt.find((g) => g.label === 'INT');
    const ext = result.byIntExt.find((g) => g.label === 'EXT');
    expect(int?.scenes.length).toBe(2);
    expect(ext?.scenes.length).toBe(2);
  });

  it('groups are sorted with the most scenes first', () => {
    for (const group of [result.byLocation, result.byTimeOfDay, result.byIntExt]) {
      for (let i = 1; i < group.length; i++) {
        expect(group[i - 1].scenes.length).toBeGreaterThanOrEqual(group[i].scenes.length);
      }
    }
  });

  it('summary totals match the scene count', () => {
    expect(result.summary.totalScenes).toBe(scenes.length);
    expect(result.summary.uniqueLocations).toBe(result.byLocation.length);
  });

  it('every group scene index is a valid 1-based scene number', () => {
    for (const group of [...result.byLocation, ...result.byTimeOfDay, ...result.byIntExt]) {
      for (const s of group.scenes) {
        expect(s.index).toBeGreaterThanOrEqual(1);
        expect(s.index).toBeLessThanOrEqual(scenes.length);
      }
    }
  });

  it('handles a script with no scenes without throwing', () => {
    const empty = generateShootingSchedule([], []);
    expect(empty.summary.totalScenes).toBe(0);
    expect(empty.byLocation).toHaveLength(0);
  });

  it('handles a slug with no clear location without throwing, still producing one group', () => {
    const { lines: l, scenes: s } = parseScript('INT. - DAY\n\nSomething happens.');
    const r = generateShootingSchedule(l, s);
    expect(r.byLocation).toHaveLength(1);
    expect(r.byLocation[0].scenes).toHaveLength(1);
  });
});
