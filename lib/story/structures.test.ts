import { describe, it, expect } from 'vitest';
import { STRUCTURES, getStructure, checkCoverage } from './structures';

describe('story structures', () => {
  it('has unique ids', () => {
    const ids = STRUCTURES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('getStructure returns none for unknown', () => {
    expect(getStructure('nope')).toBeUndefined();
  });
  it('none has no beats', () => {
    expect(getStructure('none')!.beats).toHaveLength(0);
  });
  it('checkCoverage marks a beat covered when a scene is near', () => {
    const s = getStructure('three-act')!;
    const positions = [0.12, 0.25, 0.5, 0.75, 0.9, 1.0];
    const cov = checkCoverage(s, positions);
    expect(cov.every((c) => c.covered)).toBe(true);
  });
  it('checkCoverage reports missing beats', () => {
    const s = getStructure('three-act')!;
    const cov = checkCoverage(s, [0.5]);
    const missing = cov.filter((c) => !c.covered);
    expect(missing.length).toBeGreaterThan(0);
  });
  it('empty scenes => no beat covered', () => {
    const s = getStructure('three-act')!;
    const cov = checkCoverage(s, []);
    expect(cov.every((c) => !c.covered)).toBe(true);
  });
});
