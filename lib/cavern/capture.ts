// Listening to the computer's sound, opt-in. A web page cannot read Spotify's audio (the stream is protected and Spotify's analysis
// endpoints are closed to new apps), but the browser can analyse whatever the person chooses to share: "share a tab / the screen
// with audio". Nothing is recorded, sent or stored: the stream goes into an analyser and out as a few numbers each frame.
// Whether the share carries Spotify's protected in-page audio is browser- and system-dependent: the caller says what it hears.
import { levelsOf, SILENT, type Levels } from './audio';

export type CaptureFailure = 'unsupported' | 'denied' | 'no-audio';

export class CaptureError extends Error {
  constructor(public reason: CaptureFailure, message: string) { super(message); this.name = 'CaptureError'; }
}

export interface Capture {
  /** The current levels (call each frame). */
  read: () => Levels;
  /** True when sound has come through recently; false after several silent seconds (the share has no audio, or nothing is playing). */
  hearing: () => boolean;
  stop: () => void;
  /** Called once when the person ends the share from the browser's own bar. */
  onEnded: (fn: () => void) => void;
}

/** Whether this browser can offer to share audio at all (desktop Chrome and Edge can; Safari and phones cannot). */
export function captureSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function';
}

const SILENCE_AFTER_MS = 5000;

export async function startCapture(now: () => number = () => performance.now()): Promise<Capture> {
  if (!captureSupported()) throw new CaptureError('unsupported', 'This browser cannot share audio. Desktop Chrome or Edge can.');
  let stream: MediaStream;
  try {
    // Chrome will not offer a share without video; the video is dropped at once. `systemAudio` asks for the computer's sound where offered.
    stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } as MediaTrackConstraints, systemAudio: 'include' } as DisplayMediaStreamOptions);
  } catch (e) {
    throw new CaptureError('denied', e instanceof Error && e.name === 'NotAllowedError' ? 'Sharing was cancelled.' : 'Could not start sharing.');
  }
  for (const v of stream.getVideoTracks()) v.stop();
  if (stream.getAudioTracks().length === 0) {
    stream.getTracks().forEach((t) => t.stop());
    throw new CaptureError('no-audio', 'No audio was shared. Choose a tab or the screen and tick “share audio”.');
  }
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.6;
  ctx.createMediaStreamSource(stream).connect(analyser); // not connected onward: nothing is played back
  const bins = new Uint8Array(analyser.frequencyBinCount);
  let lastSound = now();
  let ended: (() => void) | null = null;
  stream.getAudioTracks()[0].addEventListener('ended', () => ended?.());
  return {
    read() {
      analyser.getByteFrequencyData(bins);
      const lv = levelsOf(bins, ctx.sampleRate, analyser.fftSize);
      if (lv.level > 0.01) lastSound = now();
      return lv;
    },
    hearing: () => now() - lastSound < SILENCE_AFTER_MS,
    stop() { stream.getTracks().forEach((t) => t.stop()); void ctx.close().catch(() => {}); },
    onEnded(fn) { ended = fn; },
  };
}

export { SILENT };
