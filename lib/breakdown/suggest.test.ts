import { describe, it, expect } from 'vitest';
import { suggestFromAction } from './suggest';

describe('breakdown suggest', () => {
  it('suggests prop from action', () => {
    const s = suggestFromAction('He pulls a gun and a phone.');
    expect(s).toContainEqual({ category: 'prop', term: 'gun' });
    expect(s).toContainEqual({ category: 'prop', term: 'phone' });
  });
  it('suggests vehicle', () => {
    const s = suggestFromAction('They escape in a car.');
    expect(s).toContainEqual({ category: 'vehicle', term: 'car' });
  });
  it('empty for no keywords', () => {
    expect(suggestFromAction('She walks slowly.')).toHaveLength(0);
  });
  it('no duplicates', () => {
    const s = suggestFromAction('gun gun gun');
    expect(s.filter((x) => x.term === 'gun')).toHaveLength(1);
  });
});
