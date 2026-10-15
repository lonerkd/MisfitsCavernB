import { describe, it, expect } from 'vitest';
import { moveTarget } from './reorderKeys';

describe('moveTarget', () => {
  it('moves one place with Alt and an arrow', () => {
    expect(moveTarget('ArrowUp', true, 2, 5)).toBe(1);
    expect(moveTarget('ArrowDown', true, 2, 5)).toBe(3);
    expect(moveTarget('ArrowLeft', true, 2, 5)).toBe(1);
    expect(moveTarget('ArrowRight', true, 2, 5)).toBe(3);
  });
  it('sends to the ends with Home and End', () => {
    expect(moveTarget('Home', true, 3, 5)).toBe(0);
    expect(moveTarget('End', true, 1, 5)).toBe(4);
  });
  it('does nothing without Alt, at the edge, or for other keys', () => {
    expect(moveTarget('ArrowUp', false, 2, 5)).toBeNull();
    expect(moveTarget('ArrowUp', true, 0, 5)).toBeNull();
    expect(moveTarget('ArrowDown', true, 4, 5)).toBeNull();
    expect(moveTarget('Home', true, 0, 5)).toBeNull();
    expect(moveTarget('a', true, 2, 5)).toBeNull();
    expect(moveTarget('ArrowUp', true, 0, 1)).toBeNull();
  });
});

import { stepTarget } from './reorderKeys';

describe('stepTarget', () => {
  const phases = ['development', 'pre-production', 'production'];
  it('steps one along with Alt + ←/→ only', () => {
    expect(stepTarget(phases, 'pre-production', 'ArrowRight', true)).toBe('production');
    expect(stepTarget(phases, 'pre-production', 'ArrowLeft', true)).toBe('development');
    expect(stepTarget(phases, 'production', 'ArrowRight', true)).toBeNull();
    expect(stepTarget(phases, 'development', 'ArrowLeft', true)).toBeNull();
    expect(stepTarget(phases, 'pre-production', 'ArrowRight', false)).toBeNull();
    expect(stepTarget(phases, 'pre-production', 'Home', true)).toBeNull();
    expect(stepTarget(phases, 'unknown', 'ArrowRight', true)).toBeNull();
  });
});
