// What the cavern can hear, when the person lets it: levels and a beat from a frequency spectrum. Pure (a spectrum in, numbers out),
// so it is tested without a browser; the capture that produces the spectrum is lib/cavern/capture.ts.

export interface Levels {
  /** 0..1: the low end (kick and bass), the middle (voices, guitars) and the top (hats, air); `level` is all of it. */
  bass: number;
  mid: number;
  treble: number;
  level: number;
}
export const SILENT: Levels = { bass: 0, mid: 0, treble: 0, level: 0 };

/** Frequency bin → Hz for an analyser: bin * sampleRate / fftSize. */
export const binHz = (bin: number, sampleRate: number, fftSize: number) => (bin * sampleRate) / fftSize;

/** Averages a byte spectrum (an AnalyserNode's getByteFrequencyData) into bass (20–250 Hz), mid (250–2000 Hz) and treble (2–12 kHz). */
export function levelsOf(spectrum: ArrayLike<number>, sampleRate: number, fftSize: number): Levels {
  const band = (lo: number, hi: number) => {
    const from = Math.max(1, Math.floor((lo * fftSize) / sampleRate));
    const to = Math.min(spectrum.length - 1, Math.ceil((hi * fftSize) / sampleRate));
    if (to < from) return 0;
    let sum = 0;
    for (let i = from; i <= to; i++) sum += spectrum[i];
    return sum / (to - from + 1) / 255;
  };
  const bass = band(20, 250), mid = band(250, 2000), treble = band(2000, 12000);
  return { bass, mid, treble, level: Math.min(1, bass * 0.5 + mid * 0.3 + treble * 0.2) };
}

export interface BeatTracker {
  /** Feed the bass level each frame; returns the pulse: 1 on a beat, then decaying toward 0. */
  update: (bass: number, dt: number) => number;
}

/**
 * Finds beats as sudden rises of the bass above its own recent average (an onset), no more often than a fast song could have them,
 * and lets the pulse fall away smoothly. A steady drone makes no beats; silence makes none.
 */
export function createBeatTracker(): BeatTracker {
  let avg = -1, pulse = 0, since = 1;
  return {
    update(bass, dt) {
      if (avg < 0) avg = bass; // start from what is there, so a drone that is already playing is not a beat
      since += dt;
      const onset = bass > 0.08 && bass > avg * 1.22 + 0.04 && since > 0.2;
      if (onset) { pulse = 1; since = 0; }
      else pulse = Math.max(0, pulse - dt * 5);
      avg += (bass - avg) * Math.min(1, dt * 2.5);
      return pulse;
    },
  };
}

/** Eases a level toward a new reading: quick to rise, slower to fall, so the light does not flicker like a strobe. */
export function smoothLevel(prev: number, next: number, dt: number): number {
  const rate = next > prev ? 18 : 5;
  return prev + (next - prev) * Math.min(1, rate * dt);
}
