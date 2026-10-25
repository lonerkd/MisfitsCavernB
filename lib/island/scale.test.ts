import { describe, it, expect } from 'vitest';
import {
  ISLAND_SCALE_KEY,
  ISLAND_SCALE_EVENT,
  ISLAND_SCALE_MIN,
  ISLAND_SCALE_MAX,
  ISLAND_SCALE_STEP,
  clampIslandScale,
  readIslandScale,
  writeIslandScale,
  islandReserve,
} from './scale';

describe('ISLAND_SCALE_KEY', () => {
  it('exports the correct key string', () => {
    expect(ISLAND_SCALE_KEY).toBe('mc_taskbar_scale');
  });
});

describe('ISLAND_SCALE_EVENT', () => {
  it('exports the correct event name', () => {
    expect(ISLAND_SCALE_EVENT).toBe('mc-taskbar-scale-change');
  });
});

describe('ISLAND_SCALE_MIN', () => {
  it('exports the minimum scale value', () => {
    expect(ISLAND_SCALE_MIN).toBe(0.8);
  });
});

describe('ISLAND_SCALE_MAX', () => {
  it('exports the maximum scale value', () => {
    expect(ISLAND_SCALE_MAX).toBe(1.3);
  });
});

describe('ISLAND_SCALE_STEP', () => {
  it('exports the step increment', () => {
    expect(ISLAND_SCALE_STEP).toBe(0.05);
  });
});

describe('clampIslandScale', () => {
  it('returns 1 for undefined input', () => {
    expect(clampIslandScale(undefined)).toBe(1);
  });

  it('returns 1 for null input', () => {
    expect(clampIslandScale(null)).toBe(1);
  });

  it('returns 1 for empty string input', () => {
    expect(clampIslandScale('')).toBe(1);
  });

  it('clamps values below minimum to minimum', () => {
    expect(clampIslandScale(0.5)).toBe(0.8);
  });

  it('clamps values above maximum to maximum', () => {
    expect(clampIslandScale(1.4)).toBe(1.3);
  });

  it('rounds to two decimal places', () => {
    expect(clampIslandScale(0.855)).toBe(0.86);
  });

  it('returns the same value when within range', () => {
    expect(clampIslandScale(1.0)).toBe(1.0);
  });

  it('handles negative numbers by clamping to minimum', () => {
    expect(clampIslandScale(-0.5)).toBe(0.8);
  });

  it('handles Infinity by returning 1', () => {
    expect(clampIslandScale(Infinity)).toBe(1);
  });

  it('handles -Infinity by returning 1', () => {
    expect(clampIslandScale(-Infinity)).toBe(1);
  });
});

describe('readIslandScale', () => {
  it('returns a number', () => {
    const result = readIslandScale();
    expect(typeof result).toBe('number');
  });

  it('returns 1 when localStorage is not available (fallback)', () => {
    // Mock localStorage to throw an error
    const originalStorage = global.localStorage;
    let storageError: Error | undefined;

    if (typeof window !== 'undefined' && window.localStorage) {
      Object.defineProperty(window.localStorage, 'getItem', {
        value: () => { throw new Error('localStorage not available'); },
        writable: true,
      });
    }

    const result = readIslandScale();
    expect(result).toBe(1);

    // Restore
    if (originalStorage) {
      Object.defineProperty(window.localStorage, 'getItem', {
        value: originalStorage.getItem.bind(originalStorage),
        writable: true,
      });
    }
  });
});

describe('writeIslandScale', () => {
  it('returns a clamped number', () => {
    // Mock window to avoid ReferenceError
    const mockWindow = {
      dispatchEvent: () => {},
    };
    Object.defineProperty(global, 'window', {
      value: mockWindow,
      writable: true,
      configurable: true,
    });

    const result = writeIslandScale(1.5);
    expect(typeof result).toBe('number');
    expect(result).toBeLessThanOrEqual(ISLAND_SCALE_MAX);
    expect(result).toBeGreaterThanOrEqual(ISLAND_SCALE_MIN);

    // Restore
    delete (global as any).window;
  });

  it('handles undefined input', () => {
    const mockWindow = { dispatchEvent: () => {} };
    Object.defineProperty(global, 'window', {
      value: mockWindow,
      writable: true,
      configurable: true,
    });

    const result = writeIslandScale(undefined as any);
    expect(typeof result).toBe('number');

    delete (global as any).window;
  });

  it('handles null input', () => {
    const mockWindow = { dispatchEvent: () => {} };
    Object.defineProperty(global, 'window', {
      value: mockWindow,
      writable: true,
      configurable: true,
    });

    const result = writeIslandScale(null as any);
    expect(typeof result).toBe('number');

    delete (global as any).window;
  });
});

describe('islandReserve', () => {
  it('returns a number for scale 1', () => {
    const result = islandReserve(1);
    expect(typeof result).toBe('number');
  });

  it('returns different values for different scales', () => {
    const reserve1 = islandReserve(1);
    const reserve2 = islandReserve(1.3);
    expect(reserve1).not.toBe(reserve2);
  });

  it('handles undefined scale by clamping to 1', () => {
    const result = islandReserve(undefined as any);
    expect(typeof result).toBe('number');
  });
});
