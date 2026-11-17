import { describe, expect, it, vi } from 'vitest';
import { scrollToHash } from './scrollToHash';

function fakeDoc(found: Record<string, { scrollIntoView: () => void; querySelector: () => { focus: () => void } | null }>) {
  return { getElementById: (id: string) => found[id] ?? null } as unknown as Document;
}

describe('scrollToHash', () => {
  it('scrolls to the element the hash names and focuses its first field', () => {
    const focus = vi.fn();
    const scrollIntoView = vi.fn();
    const doc = fakeDoc({ brief: { scrollIntoView, querySelector: () => ({ focus }) } });
    expect(scrollToHash(doc, '#brief')).toBe(true);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });
  it('says no for an empty hash or an element that has not drawn', () => {
    expect(scrollToHash(fakeDoc({}), '')).toBe(false);
    expect(scrollToHash(fakeDoc({}), '#')).toBe(false);
    expect(scrollToHash(fakeDoc({}), '#production')).toBe(false);
  });
});
