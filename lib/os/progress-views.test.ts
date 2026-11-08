import { describe, it, expect } from 'vitest';
import { PRODUCTION_VIEWS, placeHref } from './progress';

describe('PRODUCTION_VIEWS', () => {
  it('lists every view once, including the ones added after the first ten', () => {
    expect(new Set(PRODUCTION_VIEWS).size).toBe(PRODUCTION_VIEWS.length);
    for (const v of ['story', 'schedule', 'onset', 'shots', 'weather', 'dood', 'vfx', 'makeup', 'mediaoffload', 'stills', 'extras', 'editorial', 'claims']) expect(PRODUCTION_VIEWS).toContain(v);
  });
  it('a link to a view carries it, so a reload can land on the same view', () => {
    expect(placeHref({ kind: 'studio', tab: 'production', view: 'vfx' }, 'p1')).toBe('/studio?tab=production&view=vfx');
  });
});
