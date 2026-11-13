import { describe, expect, it } from 'vitest';
import { makeCave } from '@/lib/cavern/cave';
import { WARM } from '@/lib/cavern/palette';
import { newRunner, NO_INPUT, stepRunner } from '@/lib/cavern/runner';
import { makeSpores } from '@/lib/cavern/spores';
import { drawScene, poseOf, RUNNER_AT } from './cavernScene';

// A canvas that records what it was asked to do, so the drawing can be checked without a browser.
function fakeCtx() {
  const calls: string[] = [];
  const gradient = { addColorStop: () => {} };
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (t, k: string) => (k === 'createRadialGradient' || k === 'createLinearGradient' ? () => gradient : k in t ? t[k] : (...a: unknown[]) => { calls.push(k + (typeof a[0] === 'number' && Number.isNaN(a[0]) ? ':NaN' : '')); }),
    set: (t, k: string, v) => { t[k] = v; return true; },
  });
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}

const cave = makeCave(9);
const scene = (r = newRunner(cave)) => ({ cave, far: makeCave(1), mid: makeCave(2), runner: r, t: 1.5, energy: 1, tint: WARM, spores: makeSpores(30, cave, r.x, 3, 1) });

describe('drawing the cavern', () => {
  it('draws the walls, the light, the specks and the runner, with no NaN anywhere', () => {
    const { ctx, calls } = fakeCtx();
    drawScene(ctx, 1280, 720, scene());
    expect(calls.filter((c) => c === 'fill').length).toBeGreaterThan(8);
    expect(calls.filter((c) => c === 'stroke').length).toBeGreaterThan(5);
    expect(calls.some((c) => c.endsWith(':NaN'))).toBe(false);
  });

  it('keeps drawing through a whole run, leaping, crouching and paused music', () => {
    const { ctx } = fakeCtx();
    let r = newRunner(cave);
    for (let i = 0; i < 600; i++) {
      r = stepRunner(r, 1 / 60, i % 200 < 20 ? { ...NO_INPUT, up: true } : NO_INPUT, cave, i < 500);
      drawScene(ctx, 800, 450, { ...scene(r), energy: i < 500 ? 1 : 0.15 });
    }
    expect(r.x).toBeGreaterThan(5);
  });

  it('draws with the music: loud, a bass hit and a beat, with no NaN', () => {
    const { ctx, calls } = fakeCtx();
    for (const [level, bass, pulse] of [[0, 0, 0], [0.6, 0.8, 1], [1, 1, 1], [0.2, 0.1, 0.3]]) drawScene(ctx, 900, 500, { ...scene(), level, bass, pulse });
    expect(calls.some((c) => c.endsWith(':NaN'))).toBe(false);
    expect(calls.filter((c) => c === 'fill').length).toBeGreaterThan(30);
  });

  it('puts the runner left of centre on the ground, with the lantern ahead of it and above the feet', () => {
    const r = newRunner(cave);
    const p = poseOf(r, 1000, 600, 0);
    expect(p.feet[0]).toBeCloseTo(1000 * RUNNER_AT);
    expect(p.feet[1]).toBeCloseTo(r.y * 600);
    expect(p.lantern[0]).toBeGreaterThan(p.hip[0]);
    expect(p.lantern[1]).toBeLessThan(p.hip[1]);
    expect(p.head[1]).toBeLessThan(p.hip[1]);
  });

  it('keeps every joint on screen and finite through the run cycle, in the air and crouched', () => {
    for (const patch of [{}, { grounded: false, vy: -1 }, { crouch: 1 }]) {
      for (let k = 0; k < 40; k++) {
        const r = { ...newRunner(cave), ...patch, phase: k * 0.4 };
        const p = poseOf(r, 1000, 600, k * 0.1);
        for (const pt of [p.hip, p.neck, p.head, p.kneeA, p.footA, p.kneeB, p.footB, p.hand, p.lantern]) {
          expect(Number.isFinite(pt[0]) && Number.isFinite(pt[1])).toBe(true);
          expect(pt[1]).toBeLessThanOrEqual(p.feet[1] + p.unit * 0.1); // nothing sinks through the ground
        }
      }
    }
  });
});
