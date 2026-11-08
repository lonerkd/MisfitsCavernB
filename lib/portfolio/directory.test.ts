import { describe, expect, it } from 'vitest';
import { DIRECTORY_PAGE_SIZE, directoryHref, parsePage, parseQuery } from './directory';

describe('the portfolio directory request', () => {
  it('reads the search text: trimmed, one value, bounded', () => {
    expect(parseQuery('  gaffer ')).toBe('gaffer');
    expect(parseQuery(['a', 'b'])).toBe('a');
    expect(parseQuery(undefined)).toBe('');
    expect(parseQuery('x'.repeat(200))).toHaveLength(80);
  });

  it('reads the page: a whole number from 1, anything else is page 1, and it is bounded', () => {
    expect(parsePage('3')).toBe(3);
    expect(parsePage('0')).toBe(1);
    expect(parsePage('-2')).toBe(1);
    expect(parsePage('abc')).toBe(1);
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage('99999999')).toBe(1000);
  });

  it('links a page, leaving out the defaults', () => {
    expect(directoryHref('', 1)).toBe('/portfolios');
    expect(directoryHref('gaffer', 1)).toBe('/portfolios?q=gaffer');
    expect(directoryHref('', 3)).toBe('/portfolios?page=3');
    expect(directoryHref('a b&c', 2)).toBe('/portfolios?q=a+b%26c&page=2');
    expect(DIRECTORY_PAGE_SIZE).toBe(24);
  });
});
