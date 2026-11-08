import { describe, expect, it } from 'vitest';
import { asLight, dominantColour, WARM } from './palette';

const px = (...rgba: number[][]) => Uint8ClampedArray.from(rgba.flat());

describe('the light from a cover', () => {
  it('takes the colourful part and ignores black, white and grey', () => {
    const [r, g, b] = dominantColour(px([0, 0, 0, 255], [255, 255, 255, 255], [120, 120, 120, 255], [30, 60, 200, 255], [40, 70, 190, 255]));
    expect(b).toBeGreaterThan(r + 80);
    expect(b).toBeGreaterThan(g + 60);
  });
  it('falls back to the warm default for a cover with nothing colourful, and ignores transparent pixels', () => {
    expect(dominantColour(px([0, 0, 0, 255], [200, 200, 200, 255]))).toEqual(WARM);
    expect(dominantColour(px([255, 0, 0, 0]))).toEqual(WARM);
    expect(dominantColour([])).toEqual(WARM);
  });
  it('lifts a dark colour to light, keeping its hue', () => {
    const [r, g, b] = asLight([20, 10, 60]);
    expect(Math.max(r, g, b)).toBeGreaterThanOrEqual(170);
    expect(b).toBeGreaterThan(r);
    expect(asLight([250, 200, 100])).toEqual([250, 200, 100]);
  });
});
