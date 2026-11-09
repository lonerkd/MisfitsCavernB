import { describe, expect, it } from 'vitest';
import { OFFER_MIN_WIDTH, shouldOffer } from './offer';

describe('the two-panes offer', () => {
  it('is made once, on a wide screen, outside a pane', () => {
    expect(shouldOffer(OFFER_MIN_WIDTH, false, null)).toBe(true);
    expect(shouldOffer(OFFER_MIN_WIDTH - 1, false, null)).toBe(false);
    expect(shouldOffer(1600, true, null)).toBe(false);
    expect(shouldOffer(1600, false, 'declined')).toBe(false);
    expect(shouldOffer(1600, false, 'accepted')).toBe(false);
  });
});
