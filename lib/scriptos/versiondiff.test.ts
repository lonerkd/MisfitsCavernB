import { describe, it, expect } from 'vitest';
import { lineDiff, changeStats } from './versiondiff';

describe('version diff', () => {
  it('identical', () => {
    const d = lineDiff('a\nb', 'a\nb');
    expect(d.every((x) => x.kind === 'same')).toBe(true);
  });
  it('added line', () => {
    const d = lineDiff('a', 'a\nb');
    expect(d.some((x) => x.kind === 'add' && x.text === 'b')).toBe(true);
  });
  it('removed line', () => {
    const d = lineDiff('a\nb', 'a');
    expect(d.some((x) => x.kind === 'remove' && x.text === 'b')).toBe(true);
  });
  it('stats', () => {
    const d = lineDiff('a\nb', 'a\nc');
    const s = changeStats(d);
    expect(s.added).toBe(1);
    expect(s.removed).toBe(1);
  });
});
