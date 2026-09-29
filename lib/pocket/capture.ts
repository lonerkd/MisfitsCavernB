// Capture on the go: a photo, a clip, a voice memo, a note or a link, straight
// into a project's library. Everything captured is written to this device
// first (lib/pocket/outbox) and sent from there, so a basement, a field or a
// dead zone never loses it. Pure helpers here.

import type { TranscriptLineDraft } from '@/lib/studio/transcript';

interface Base { id: string; projectId: string; createdAt: string; error?: string | null }
export type Capture =
  | (Base & { kind: 'file'; blob: Blob; name: string; type: string; title?: string | null; duration?: number | null; lines?: TranscriptLineDraft[] })
  | (Base & { kind: 'note'; title?: string | null; text: string })
  | (Base & { kind: 'link'; url: string });

/** Recording formats in order of preference: Opus in WebM (Chrome, Firefox), then MP4/AAC (Safari). */
const AUDIO_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/ogg'];

export function pickAudioType(isSupported: (t: string) => boolean): string | null {
  return AUDIO_TYPES.find((t) => { try { return isSupported(t); } catch { return false; } }) ?? null;
}

/** The bare type a file is stored under ("audio/webm;codecs=opus" → "audio/webm"). */
export const baseType = (t: string) => t.split(';')[0].trim().toLowerCase();

const EXT: Record<string, string> = { 'audio/webm': 'webm', 'audio/mp4': 'm4a', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/wav': 'wav' };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Voice memo 29 Sep 14.32.webm" — a name that sorts and reads. */
export function voiceMemoName(at: Date, type: string): string {
  const mon = MONTHS[at.getMonth()];
  const hh = String(at.getHours()).padStart(2, '0'), mm = String(at.getMinutes()).padStart(2, '0');
  return `Voice memo ${at.getDate()} ${mon} ${hh}.${mm}.${EXT[baseType(type)] ?? 'webm'}`;
}

/** "0:07", "12:40" — the recording clock. */
export function recClock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Whether a failure means "no connection, try later" rather than "this can't be sent". */
export function isOffline(err: unknown, online: boolean): boolean {
  if (!online) return true;
  const msg = err instanceof Error ? err.message : String(err ?? '');
  return /failed to fetch|network|load failed|timed? ?out|fetch error|offline/i.test(msg);
}

/** A line of dictation, stamped where the phrase began in the recording. */
export function dictationLine(text: string, startedAtMs: number): TranscriptLineDraft | null {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return null;
  const sentence = clean[0].toUpperCase() + clean.slice(1);
  return { start_ms: Math.max(0, Math.round(startedAtMs)), end_ms: null, speaker: null, text: sentence.slice(0, 2000) };
}

/** Oldest first; ones that failed for good wait at the back until retried. */
export function sendOrder(queue: Capture[]): Capture[] {
  return [...queue].sort((a, b) => Number(!!a.error) - Number(!!b.error) || a.createdAt.localeCompare(b.createdAt));
}

export function describe(c: Capture): string {
  if (c.kind === 'note') return c.title || c.text.split('\n')[0].slice(0, 60) || 'Note';
  if (c.kind === 'link') return c.url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 60);
  return c.title || c.name;
}
