import { describe, expect, it } from 'vitest';
import { closeTopOverlay, overlayDepth, pushOverlay } from './overlayStack';

describe('the overlay stack the back chevron consults', () => {
  it('closes the topmost layer first, then the one under it', () => {
    const closed: string[] = [];
    pushOverlay(() => closed.push('search'));
    pushOverlay(() => closed.push('thread'));
    expect(overlayDepth()).toBe(2);
    expect(closeTopOverlay()).toBe(true);
    expect(closed).toEqual(['thread']);
    expect(closeTopOverlay()).toBe(true);
    expect(closed).toEqual(['thread', 'search']);
    expect(overlayDepth()).toBe(0);
  });

  it('a layer that unregisters is skipped, and an empty stack closes nothing', () => {
    const closed: string[] = [];
    const off = pushOverlay(() => closed.push('gone'));
    pushOverlay(() => closed.push('staying'));
    off();
    expect(overlayDepth()).toBe(1);
    expect(closeTopOverlay()).toBe(true);
    expect(closed).toEqual(['staying']);
    expect(closeTopOverlay()).toBe(false);
  });
});
