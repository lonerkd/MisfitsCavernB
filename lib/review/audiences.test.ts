import { describe, it, expect } from 'vitest';
import { audienceOf, isReviewLayer, layerForCraft, REVIEW_AUDIENCES, REVIEW_LAYERS } from './audiences';

describe('review audiences', () => {
  it('only the client decides; the press cannot even comment', () => {
    expect(REVIEW_LAYERS.filter((l) => REVIEW_AUDIENCES[l].canDecide)).toEqual(['guest']);
    expect(REVIEW_LAYERS.filter((l) => !REVIEW_AUDIENCES[l].canComment)).toEqual(['press']);
  });
  it('an unknown layer gets the least, and layers are recognised', () => {
    expect(audienceOf('nonsense')).toBe(REVIEW_AUDIENCES.press);
    expect(isReviewLayer('investor')).toBe(true);
    expect(isReviewLayer('everyone')).toBe(false);
  });
  it('each outside craft reads through its own audience', () => {
    expect(layerForCraft('Client')).toBe('guest');
    expect(layerForCraft('Investor')).toBe('investor');
    expect(layerForCraft('Distributor or festival guest')).toBe('distributor');
    expect(layerForCraft('Press')).toBe('press');
    expect(layerForCraft('Gaffer')).toBeNull();
    expect(layerForCraft(null)).toBeNull();
  });
});
