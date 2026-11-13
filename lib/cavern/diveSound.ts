// The dive's sounds: a soft thud on a landing, a rising chirp off a spring, a crackle when a fragile tile goes, a falling chime when
// the cave sets you back. Made with the Web Audio API (no files), quiet on purpose so it sits under the person's own music, and
// never played by the corner window. The person turns it on; nothing here starts on its own.
import type { DiveEvent } from './dive';

export interface DiveSound {
  play: (e: DiveEvent) => void;
  close: () => void;
}

type Ctor = typeof AudioContext;
const ctorOf = (): Ctor | null => {
  if (typeof window === 'undefined') return null;
  return window.AudioContext ?? (window as unknown as { webkitAudioContext?: Ctor }).webkitAudioContext ?? null;
};

export const soundSupported = (): boolean => ctorOf() !== null;

/** No sound of one kind sooner than this after the last of that kind, so a burst of events is not a buzz. */
const GAP_S = 0.06;
const LEVEL = 0.12;

export function createDiveSound(make: () => AudioContext | null = () => { const C = ctorOf(); return C ? new C() : null; }): DiveSound | null {
  const ctx = make();
  if (!ctx) return null;
  const last = new Map<DiveEvent, number>();

  const tone = (type: OscillatorType, from: number, to: number, start: number, length: number, level: number) => {
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, start);
    osc.frequency.exponentialRampToValueAtTime(to, start + length);
    gain.gain.setValueAtTime(level, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start); osc.stop(start + length + 0.02);
  };
  const crackle = (start: number, length: number, level: number) => {
    const frames = Math.max(1, Math.floor(ctx.sampleRate * length));
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const src = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
    src.buffer = buffer;
    filter.type = 'bandpass'; filter.frequency.value = 1400;
    gain.gain.value = level;
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(start);
  };

  return {
    play(e) {
      const now = ctx.currentTime;
      if (now - (last.get(e) ?? -1) < GAP_S) return;
      last.set(e, now);
      if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
      if (e === 'land') tone('sine', 150, 60, now, 0.16, LEVEL);
      else if (e === 'spring') tone('sine', 240, 720, now, 0.2, LEVEL * 0.8);
      else if (e === 'break') crackle(now, 0.14, LEVEL * 0.6);
      else if (e === 'rescue') { tone('sine', 523, 440, now, 0.3, LEVEL * 0.5); tone('sine', 392, 330, now + 0.14, 0.34, LEVEL * 0.5); }
    },
    close() { void ctx.close().catch(() => {}); },
  };
}
