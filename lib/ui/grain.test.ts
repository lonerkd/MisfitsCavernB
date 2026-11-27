import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  GRAIN_AMOUNT_KEY,
  GRAIN_SPEED_KEY,
  GRAIN_EVENT,
  GRAIN_AMOUNT_MIN,
  GRAIN_AMOUNT_MAX,
  GRAIN_AMOUNT_STEP,
  GRAIN_AMOUNT_DEFAULT,
  GRAIN_SPEED_MIN,
  GRAIN_SPEED_MAX,
  GRAIN_SPEED_STEP,
  GRAIN_SPEED_DEFAULT,
  GRAIN_CYCLE_SECONDS,
  clampGrainAmount,
  clampGrainSpeed,
  grainCycleSeconds,
  readGrainAmount,
  readGrainSpeed,
  readGrain,
  writeGrainAmount,
  writeGrainSpeed,
} from './grain';

describe('grain constants', () => {
  it('exports the storage keys and the change event', () => {
    expect(GRAIN_AMOUNT_KEY).toBe('mc_grain_amount');
    expect(GRAIN_SPEED_KEY).toBe('mc_grain_speed');
    expect(GRAIN_EVENT).toBe('mc-grain-change');
  });

  it('the amount range runs from gone to full strength', () => {
    expect(GRAIN_AMOUNT_MIN).toBe(0);
    expect(GRAIN_AMOUNT_MAX).toBe(0.08);
    expect(GRAIN_AMOUNT_STEP).toBe(0.0025);
  });

  it('the speed range runs from a slow drift to frantic', () => {
    expect(GRAIN_SPEED_MIN).toBe(0.25);
    expect(GRAIN_SPEED_MAX).toBe(3);
    expect(GRAIN_SPEED_STEP).toBe(0.05);
  });

  it('the defaults reproduce the look the suite has always shipped', () => {
    expect(GRAIN_AMOUNT_DEFAULT).toBe(0.025);
    expect(GRAIN_SPEED_DEFAULT).toBe(1);
    expect(GRAIN_CYCLE_SECONDS).toBe(0.5);
    expect(grainCycleSeconds(GRAIN_SPEED_DEFAULT)).toBe(0.5);
  });
});

describe('clampGrainAmount', () => {
  it('returns the default for missing or junk input', () => {
    expect(clampGrainAmount(undefined)).toBe(GRAIN_AMOUNT_DEFAULT);
    expect(clampGrainAmount(null)).toBe(GRAIN_AMOUNT_DEFAULT);
    expect(clampGrainAmount('')).toBe(GRAIN_AMOUNT_DEFAULT);
    expect(clampGrainAmount('thick')).toBe(GRAIN_AMOUNT_DEFAULT);
    expect(clampGrainAmount(Infinity)).toBe(GRAIN_AMOUNT_DEFAULT);
  });

  it('clamps below the minimum to 0 — the grain is gone', () => {
    expect(clampGrainAmount(-0.02)).toBe(0);
  });

  it('clamps above the maximum to full strength', () => {
    expect(clampGrainAmount(0.5)).toBe(GRAIN_AMOUNT_MAX);
  });

  it('passes values in range through, including a stored string', () => {
    expect(clampGrainAmount(0.04)).toBe(0.04);
    expect(clampGrainAmount('0.025')).toBe(0.025);
  });
});

describe('clampGrainSpeed', () => {
  it('returns 1 for missing or junk input', () => {
    expect(clampGrainSpeed(undefined)).toBe(1);
    expect(clampGrainSpeed(null)).toBe(1);
    expect(clampGrainSpeed('fast')).toBe(1);
    expect(clampGrainSpeed(-Infinity)).toBe(1);
  });

  it('clamps to the slider range', () => {
    expect(clampGrainSpeed(0)).toBe(GRAIN_SPEED_MIN);
    expect(clampGrainSpeed(9)).toBe(GRAIN_SPEED_MAX);
  });

  it('rounds to two decimal places', () => {
    expect(clampGrainSpeed(1.234)).toBe(1.23);
  });
});

describe('grainCycleSeconds', () => {
  it('speed 1 is the stock 0.5s cycle', () => {
    expect(grainCycleSeconds(1)).toBe(0.5);
  });

  it('the slowest speed drifts at 2s', () => {
    expect(grainCycleSeconds(GRAIN_SPEED_MIN)).toBe(2);
  });

  it('the fastest speed runs at about 0.17s', () => {
    expect(grainCycleSeconds(GRAIN_SPEED_MAX)).toBe(0.167);
  });

  it('junk speed falls back to the stock cycle', () => {
    expect(grainCycleSeconds('junk')).toBe(0.5);
  });
});

describe('read and write', () => {
  // The lib suites run without a browser: stand in a device — a Map for
  // storage, a window that records what it is told to announce.
  let store: Map<string, string>;
  let dispatched: Event[];

  beforeEach(() => {
    store = new Map();
    dispatched = [];
    const storage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, String(v)); },
      removeItem: (k: string) => { store.delete(k); },
    };
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('window', {
      localStorage: storage,
      dispatchEvent: (e: Event) => { dispatched.push(e); return true; },
    });
  });

  afterEach(() => { vi.unstubAllGlobals(); });

  it('reads the defaults when nothing is stored', () => {
    expect(readGrainAmount()).toBe(GRAIN_AMOUNT_DEFAULT);
    expect(readGrainSpeed()).toBe(GRAIN_SPEED_DEFAULT);
    expect(readGrain()).toEqual({ amount: GRAIN_AMOUNT_DEFAULT, speed: GRAIN_SPEED_DEFAULT });
  });

  it('a write is what the next read sees', () => {
    writeGrainAmount(0.05);
    writeGrainSpeed(2);
    expect(readGrainAmount()).toBe(0.05);
    expect(readGrainSpeed()).toBe(2);
    expect(readGrain()).toEqual({ amount: 0.05, speed: 2 });
  });

  it('writes are clamped before they are stored', () => {
    expect(writeGrainAmount(1)).toBe(GRAIN_AMOUNT_MAX);
    expect(store.get(GRAIN_AMOUNT_KEY)).toBe(String(GRAIN_AMOUNT_MAX));
    expect(writeGrainSpeed(0)).toBe(GRAIN_SPEED_MIN);
    expect(store.get(GRAIN_SPEED_KEY)).toBe(String(GRAIN_SPEED_MIN));
  });

  it('a write announces itself on the grain event', () => {
    writeGrainAmount(0.03);
    writeGrainSpeed(1.5);
    expect(dispatched.map(e => e.type)).toEqual([GRAIN_EVENT, GRAIN_EVENT]);
  });
});
