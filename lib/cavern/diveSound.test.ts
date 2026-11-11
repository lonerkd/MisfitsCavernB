import { describe, expect, it, vi } from 'vitest';
import { createDiveSound } from './diveSound';

function fakeContext() {
  const made: string[] = [];
  const node = () => { const n: Record<string, unknown> = { connect: (x: unknown) => x ?? n, start: vi.fn(), stop: vi.fn(), frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), value: 0 }, gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), value: 0 } }; n.connect = () => n; return n; };
  let t = 0;
  const ctx = {
    get currentTime() { return t; }, sampleRate: 8000, state: 'suspended' as string, destination: {},
    resume: vi.fn(async () => { ctx.state = 'running'; }), close: vi.fn(async () => {}),
    createOscillator: () => { made.push('osc'); return node(); }, createGain: () => node(), createBiquadFilter: () => node(),
    createBuffer: (_c: number, n: number) => { made.push('noise'); return { getChannelData: () => new Float32Array(n) }; },
    createBufferSource: () => node(),
  };
  return { ctx: ctx as unknown as AudioContext, raw: ctx, made, advance: (s: number) => { t += s; } };
}

describe('the dive’s sounds', () => {
  it('is nothing where the browser has no Web Audio', () => {
    expect(createDiveSound(() => null)).toBeNull();
  });

  it('makes a tone for a landing and a spring, noise for a broken tile, two chimes for a set-back', () => {
    const f = fakeContext();
    const s = createDiveSound(() => f.ctx)!;
    s.play('land'); expect(f.made).toEqual(['osc']);
    s.play('spring'); expect(f.made).toEqual(['osc', 'osc']);
    s.play('break'); expect(f.made).toEqual(['osc', 'osc', 'noise']);
    s.play('rescue'); expect(f.made.filter((m) => m === 'osc')).toHaveLength(4);
  });

  it('wakes a suspended context the first time it plays (a browser holds it until the person has interacted)', () => {
    const f = fakeContext();
    createDiveSound(() => f.ctx)!.play('land');
    expect(f.raw.resume).toHaveBeenCalled();
  });

  it('does not buzz: the same sound is not repeated within a few milliseconds', () => {
    const f = fakeContext();
    const s = createDiveSound(() => f.ctx)!;
    s.play('land'); s.play('land');
    expect(f.made).toEqual(['osc']);
    f.advance(0.1); s.play('land');
    expect(f.made).toEqual(['osc', 'osc']);
  });

  it('lets go of the audio device when closed', () => {
    const f = fakeContext();
    createDiveSound(() => f.ctx)!.close();
    expect(f.raw.close).toHaveBeenCalled();
  });
});
