import { describe, it, expect } from 'vitest';
import { shouldDismiss } from './sheetDrag';

describe('shouldDismiss', () => {
  it('closes on a long pull, however slow', () => { expect(shouldDismiss(130, 2000)).toBe(true); });
  it('closes on a short quick flick', () => { expect(shouldDismiss(60, 80)).toBe(true); });
  it('stays on a short slow drag, and on a tiny jitter', () => {
    expect(shouldDismiss(60, 900)).toBe(false);
    expect(shouldDismiss(20, 10)).toBe(false);
  });
  it('never closes on an upward or zero drag', () => {
    expect(shouldDismiss(-200, 50)).toBe(false);
    expect(shouldDismiss(0, 50)).toBe(false);
  });
});
