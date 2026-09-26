import { describe, it, expect } from 'vitest';
import { nextShotNumber } from './api';

describe('nextShotNumber', () => {
  it('starts at 1 and follows the highest numeric shot', () => {
    expect(nextShotNumber([])).toBe('1');
    expect(nextShotNumber([{ shot_number: '1' }, { shot_number: '4' }, { shot_number: '2' }])).toBe('5');
  });

  it('ignores lettered pickups when numbering', () => {
    expect(nextShotNumber([{ shot_number: '3' }, { shot_number: 'A' }])).toBe('4');
    expect(nextShotNumber([{ shot_number: '3A' }])).toBe('4');
  });
});
