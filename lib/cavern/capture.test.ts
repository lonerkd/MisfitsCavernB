// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CaptureError, captureSupported, startCapture } from './capture';

let ended: (() => void) | null = null;
const track = (kind: 'audio' | 'video') => ({ kind, stop: vi.fn(), addEventListener: (_: string, fn: () => void) => { if (kind === 'audio') ended = fn; } });
const stream = (withAudio: boolean) => { const a = track('audio'), v = track('video'); return { a, v, s: { getVideoTracks: () => [v], getAudioTracks: () => (withAudio ? [a] : []), getTracks: () => (withAudio ? [a, v] : [v]) } }; };
const fill = { value: 0 };
class FakeCtx {
  sampleRate = 48000; close = vi.fn(async () => {});
  createAnalyser() { return { fftSize: 0, frequencyBinCount: 512, smoothingTimeConstant: 0, getByteFrequencyData: (b: Uint8Array) => b.fill(fill.value) }; }
  createMediaStreamSource() { return { connect: vi.fn() }; }
}

beforeEach(() => { fill.value = 0; ended = null; vi.stubGlobal('AudioContext', FakeCtx); Object.defineProperty(window, 'AudioContext', { value: FakeCtx, configurable: true }); });
afterEach(() => { vi.unstubAllGlobals(); });
const share = (impl: () => Promise<unknown>) => Object.defineProperty(navigator, 'mediaDevices', { value: { getDisplayMedia: vi.fn(impl) }, configurable: true });

describe('listening to shared audio', () => {
  it('says plainly when the browser cannot share audio', async () => {
    Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true });
    expect(captureSupported()).toBe(false);
    await expect(startCapture()).rejects.toMatchObject({ reason: 'unsupported' });
  });

  it('is refused politely when the person cancels', async () => {
    share(() => Promise.reject(Object.assign(new Error('no'), { name: 'NotAllowedError' })));
    await expect(startCapture()).rejects.toMatchObject({ reason: 'denied', message: 'Sharing was cancelled.' });
  });

  it('refuses a share with no audio, and lets go of it', async () => {
    const { s, v } = stream(false);
    share(() => Promise.resolve(s));
    await expect(startCapture()).rejects.toBeInstanceOf(CaptureError);
    await expect(startCapture()).rejects.toMatchObject({ reason: 'no-audio' });
    expect(v.stop).toHaveBeenCalled();
  });

  it('drops the video at once, hears the sound, and notices silence and the share ending', async () => {
    const { s, a, v } = stream(true);
    share(() => Promise.resolve(s));
    let clock = 0;
    const cap = await startCapture(() => clock);
    expect(v.stop).toHaveBeenCalled(); // only the audio is wanted
    fill.value = 200;
    expect(cap.read().level).toBeGreaterThan(0.1);
    expect(cap.hearing()).toBe(true);
    fill.value = 0; clock = 6000; cap.read();
    expect(cap.hearing()).toBe(false);
    const done = vi.fn(); cap.onEnded(done); ended?.(); expect(done).toHaveBeenCalled();
    cap.stop(); expect(a.stop).toHaveBeenCalled();
  });
});
