import { describe, expect, it } from 'vitest';
import { autoSteer, newDive, stepDive } from '@/lib/cavern/dive';
import { WARM } from '@/lib/cavern/palette';
import { drawDive } from './cavernDive';

// A canvas that records what it was asked to do, so the drawing can be checked without a browser.
function fakeCtx() {
  const calls: string[] = [];
  const gradient = { addColorStop: () => {} };
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (t, k: string) => (k === 'createRadialGradient' || k === 'createLinearGradient' ? () => gradient : k in t ? t[k] : (...a: unknown[]) => { calls.push(k + (a.some((x) => typeof x === 'number' && Number.isNaN(x)) ? ':NaN' : '')); }),
    set: (t, k: string, v) => { t[k] = v; return true; },
  });
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}

describe('drawing the dive', () => {
  it('draws the shaft, the tiles and the blob, with no NaN anywhere', () => {
    const { ctx, calls } = fakeCtx();
    drawDive(ctx, newDive(3), 1280, 720, { tint: WARM });
    expect(calls.filter((c) => c === 'fill').length).toBeGreaterThan(3);
    expect(calls.filter((c) => c === 'stroke').length).toBeGreaterThan(3);
    expect(calls.some((c) => c.endsWith(':NaN'))).toBe(false);
  });

  it('keeps drawing through a minute of the autopilot, in a big window and a small one, with music on', () => {
    const { ctx, calls } = fakeCtx();
    const g = newDive(8);
    for (let i = 0; i < 3600; i++) {
      stepDive(g, 1 / 60, autoSteer(g));
      if (i % 3 === 0) drawDive(ctx, g, i % 2 ? 1280 : 240, i % 2 ? 720 : 135, { tint: WARM, level: 0.5, pulse: i % 90 === 0 ? 1 : 0, compact: i % 2 === 0 });
    }
    expect(g.bounces).toBeGreaterThan(20);
    expect(calls.some((c) => c.endsWith(':NaN'))).toBe(false);
  });
});
