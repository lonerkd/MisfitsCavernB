import { describe, expect, it } from 'vitest';
import { contextKeywords, freshSearch, generateContextualSearchQuery } from './search';

const kw = ['Action', 'Tense', 'Fast', 'Horror', 'Dark Ambient', 'Eerie', 'Cinematic Score'];

describe('freshSearch', () => {
  it('seed 0 is the plain query on the first page, so what opens by itself stays steady', () => {
    expect(freshSearch(kw, 0)).toEqual({ query: kw.join(' '), offset: 0 });
  });
  it('a new seed gives a different take, deterministically', () => {
    const a = freshSearch(kw, 12345), b = freshSearch(kw, 12345), c = freshSearch(kw, 987654321);
    expect(a).toEqual(b);
    expect(a.query === c.query && a.offset === c.offset).toBe(false);
  });
  it('keeps at least two of the scene’s words, only its own words, and a page start that is a multiple of ten', () => {
    for (let seed = 1; seed < 200; seed++) {
      const { query, offset } = freshSearch(kw, seed * 7919);
      const words = new Set(kw.flatMap((k) => k.split(' ')));
      expect(query.split(' ').every((w) => words.has(w))).toBe(true);
      expect(query.split(' ').length).toBeGreaterThanOrEqual(2);
      expect(offset % 10).toBe(0); expect(offset).toBeLessThan(80);
    }
  });
  it('with no keywords there is nothing to vary', () => {
    expect(freshSearch([], 5)).toEqual({ query: '', offset: 0 });
  });
});

describe('contextKeywords', () => {
  it('reads the mood from the script and defaults to a cinematic score', async () => {
    expect(contextKeywords('He runs, a gun goes off in the chase.')).toContain('Action');
    expect(contextKeywords('Nothing much happens.')).toEqual(['Cinematic', 'Ambient', 'Score']);
    expect(await generateContextualSearchQuery('Nothing much happens.')).toBe('Cinematic Ambient Score');
  });
});
