import { describe, it, expect } from 'vitest';
import { scrollEdges } from './scroll-edges';

describe('scrollEdges', () => {
  it('shows nothing when the row fits', () => {
    expect(scrollEdges(0, 400, 400)).toEqual({ left: false, right: false });
  });
  it('shows the right edge at the start of a long row, the left at its end, both in the middle', () => {
    expect(scrollEdges(0, 300, 700)).toEqual({ left: false, right: true });
    expect(scrollEdges(400, 300, 700)).toEqual({ left: true, right: false });
    expect(scrollEdges(150, 300, 700)).toEqual({ left: true, right: true });
  });
  it('ignores sub-pixel rounding', () => {
    expect(scrollEdges(0.5, 300, 301.5)).toEqual({ left: false, right: false });
  });
});
