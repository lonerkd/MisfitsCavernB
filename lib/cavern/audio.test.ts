import { describe, expect, it } from 'vitest';
import { createBeatTracker, levelsOf, smoothLevel, SILENT } from './audio';

const SR = 48000, FFT = 1024;
const spectrum = (fill: (hz: number) => number) => Uint8Array.from({ length: FFT / 2 }, (_, i) => fill((i * SR) / FFT));

describe('what the cavern hears', () => {
  it('reads bass, mid and treble from a spectrum', () => {
    const kick = levelsOf(spectrum((hz) => (hz < 300 ? 255 : 0)), SR, FFT);
    expect(kick.bass).toBeGreaterThan(0.6); expect(kick.mid).toBeLessThan(0.1); expect(kick.treble).toBe(0);
    const hats = levelsOf(spectrum((hz) => (hz > 5000 ? 255 : 0)), SR, FFT);
    expect(hats.treble).toBeGreaterThan(0.6); expect(hats.bass).toBeLessThan(0.05);
    const voice = levelsOf(spectrum((hz) => (hz > 400 && hz < 1500 ? 200 : 0)), SR, FFT);
    expect(voice.mid).toBeGreaterThan(0.4); expect(voice.bass).toBeLessThan(0.1);
  });
  it('is silent for silence, and never above 1', () => {
    expect(levelsOf(new Uint8Array(512), SR, FFT)).toEqual(SILENT);
    expect(levelsOf(new Uint8Array(512).fill(255), SR, FFT).level).toBeLessThanOrEqual(1);
    expect(levelsOf([], SR, FFT)).toEqual(SILENT);
  });
});

describe('finding the beat', () => {
  const run = (bassAt: (t: number) => number, seconds: number) => {
    const tr = createBeatTracker(); const dt = 1 / 60; let beats = 0, wasUp = false;
    for (let t = 0; t < seconds; t += dt) { const p = tr.update(bassAt(t), dt); if (p > 0.95 && !wasUp) beats++; wasUp = p > 0.95; }
    return beats;
  };
  it('counts the kicks of a steady 120 bpm pulse', () => {
    const beats = run((t) => ((t % 0.5) < 0.08 ? 0.9 : 0.15), 10);
    expect(beats).toBeGreaterThanOrEqual(17); expect(beats).toBeLessThanOrEqual(21);
  });
  it('finds none in a steady drone or in silence', () => {
    expect(run(() => 0.6, 10)).toBe(0);
    expect(run(() => 0, 10)).toBe(0);
  });
  it('lets the pulse fall away after a beat', () => {
    const tr = createBeatTracker();
    for (let i = 0; i < 30; i++) tr.update(0.1, 1 / 60);
    expect(tr.update(0.95, 1 / 60)).toBe(1);
    let p = 1; for (let i = 0; i < 30; i++) p = tr.update(0.1, 1 / 60);
    expect(p).toBe(0);
  });
});

describe('smoothing', () => {
  it('rises faster than it falls', () => {
    const up = smoothLevel(0, 1, 1 / 60), down = 1 - smoothLevel(1, 0, 1 / 60);
    expect(up).toBeGreaterThan(down);
    expect(smoothLevel(0.5, 0.5, 1 / 60)).toBe(0.5);
  });
});
