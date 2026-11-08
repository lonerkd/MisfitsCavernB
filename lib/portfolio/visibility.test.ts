import { describe, expect, it } from 'vitest';
import { hasLiveLink, isVisibility, VISIBILITIES, VISIBILITY_LABEL, VISIBILITY_NOTE, visibilityOf } from './visibility';

describe('who may see a piece', () => {
  it('has three states, private first, each with words', () => {
    expect(VISIBILITIES).toEqual(['private', 'unlisted', 'public']);
    for (const v of VISIBILITIES) { expect(VISIBILITY_LABEL[v].length).toBeGreaterThan(0); expect(VISIBILITY_NOTE[v].length).toBeGreaterThan(10); }
  });
  it('has a working link unless it is private', () => {
    expect(hasLiveLink('public')).toBe(true); expect(hasLiveLink('unlisted')).toBe(true);
    expect(hasLiveLink('private')).toBe(false); expect(hasLiveLink(null)).toBe(false); expect(hasLiveLink(undefined)).toBe(false);
  });
  it('never trusts an unknown value: it is private', () => {
    expect(visibilityOf('public')).toBe('public');
    for (const bad of [null, undefined, '', 'Public', 'friends', 3]) expect(visibilityOf(bad)).toBe('private');
    expect(isVisibility('unlisted')).toBe(true); expect(isVisibility('x')).toBe(false);
  });
});
