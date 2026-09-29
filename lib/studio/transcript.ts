// Transcripts and the paper edit.
//
// A transcript is a list of lines on a library item (an interview, a take, a
// podcast recording): when it starts, who speaks, what they say. People bring
// one in however they have it — subtitles (SRT, WebVTT), a transcription
// service's text ("00:01:23 MARA: …", "[1:02:03] Speaker 2 – …"), or plain
// paragraphs with no times — or type and dictate it against the player.
//
// The paper edit is the story built from those lines before cutting: the
// selects, across every recording, in the order they'll play.

export interface TranscriptLineDraft {
  start_ms: number | null;
  end_ms: number | null;
  speaker: string | null;
  text: string;
}

export const MAX_LINE = 2000;
export const MAX_SPEAKER = 60;
export const MAX_LINES_PER_IMPORT = 2000;

/** "01:23", "1:02:03", "01:02:03,450", "01:02:03.450", "83.5" (seconds) → ms. */
export function parseStamp(raw: string): number | null {
  const t = raw.trim();
  let m = t.match(/^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?:[.,](\d{1,3}))?$/);
  if (m) {
    const [, h, min, sec, frac] = m;
    if (Number(sec) > 59 || (h !== undefined && Number(min) > 59)) return null;
    const ms = frac ? Number(frac.padEnd(3, '0')) : 0;
    return ((Number(h ?? 0) * 60 + Number(min)) * 60 + Number(sec)) * 1000 + ms;
  }
  m = t.match(/^(\d+(?:\.\d+)?)s?$/);
  if (m) return Math.round(Number(m[1]) * 1000);
  return null;
}

/** ms → "1:23" or "1:02:03" (hours only when needed). */
export function formatStamp(ms: number | null): string {
  if (ms === null || ms < 0 || !Number.isFinite(ms)) return '—';
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

const TC = String.raw`(?:\d{1,2}:)?\d{1,2}:\d{2}(?:[.,]\d{1,3})?`;
const CUE = new RegExp(String.raw`^(${TC})\s*-->\s*(${TC})`);
// A leading time, bare or bracketed, then an optional "SPEAKER:" / "Speaker –".
const STAMPED = new RegExp(String.raw`^[\[(]?(${TC})[\])]?\s*(?:[-–—|]\s*)?(.*)$`);
const SPEAKER = /^([A-Z][\p{L}0-9 .'’-]{0,58}?|[\p{Lu}0-9 .'’-]{1,59})\s*(?::|\s[-–—]\s)\s*(.+)$/u;

function clean(s: string): string {
  return s.replace(/<[^>]+>/g, '').replace(/\{\\[^}]*\}/g, '').replace(/\s+/g, ' ').trim();
}

function splitSpeaker(text: string): { speaker: string | null; text: string } {
  // WebVTT voice span: <v Mara>line
  const v = text.match(/^<v(?:\.[^ >]+)?\s+([^>]+)>(.*)$/);
  if (v) return { speaker: clean(v[1]).slice(0, MAX_SPEAKER) || null, text: clean(v[2]) };
  const t = clean(text);
  const m = t.match(SPEAKER);
  // Sentences with a colon mid-way stay text: a speaker is a short name, each
  // word capitalised ("MARA", "Ana Ruiz", "Speaker 2").
  const words = m ? m[1].trim().split(/\s+/) : [];
  if (m && words.length <= 4 && words.every((w) => /^[\p{Lu}0-9][\p{L}0-9.'’-]*$/u.test(w))) return { speaker: m[1].trim().slice(0, MAX_SPEAKER), text: m[2].trim() };
  return { speaker: null, text: t };
}

function push(out: TranscriptLineDraft[], line: TranscriptLineDraft) {
  if (!line.text) return;
  if (out.length >= MAX_LINES_PER_IMPORT) return;
  out.push({ ...line, text: line.text.slice(0, MAX_LINE) });
}

/** Subtitle cues (SRT or WebVTT): blocks with "start --> end" and text. */
function parseCues(lines: string[]): TranscriptLineDraft[] {
  const out: TranscriptLineDraft[] = [];
  let i = 0;
  while (i < lines.length) {
    const cue = lines[i].trim().match(CUE);
    if (!cue) { i++; continue; }
    const start = parseStamp(cue[1]), end = parseStamp(cue[2]);
    const body: string[] = [];
    i++;
    while (i < lines.length && lines[i].trim() !== '' && !CUE.test(lines[i].trim())) body.push(lines[i++].trim());
    // SRT numbers the next cue on the line before its times; drop a trailing bare number.
    if (body.length && /^\d+$/.test(body[body.length - 1]) && i < lines.length && CUE.test((lines[i] ?? '').trim())) body.pop();
    const { speaker, text } = splitSpeaker(body.join(' '));
    push(out, { start_ms: start, end_ms: end !== null && start !== null && end >= start ? end : null, speaker, text });
  }
  return out;
}

/**
 * Whatever transcript someone pastes, as lines. Subtitles keep their cue
 * times; "time speaker: text" lines keep theirs; anything else becomes one
 * line per paragraph (or per line, when there are no blank lines), untimed.
 * A line that is only a time stamps the text under it.
 */
export function parseTranscript(input: string): TranscriptLineDraft[] {
  const text = input.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const lines = text.split('\n');
  if (lines.some((l) => CUE.test(l.trim()))) return parseCues(lines);

  const out: TranscriptLineDraft[] = [];
  const paragraphs = /\n\s*\n/.test(text.trim());
  let pending: { start: number | null; parts: string[] } | null = null;
  let carriedTime: number | null = null;
  const flush = () => {
    if (!pending) return;
    const { speaker, text: body } = splitSpeaker(pending.parts.join(' '));
    push(out, { start_ms: pending.start, end_ms: null, speaker, text: body });
    pending = null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { if (paragraphs) flush(); continue; }
    if (/^WEBVTT/.test(line)) continue;
    const st = line.match(STAMPED);
    const time = st ? parseStamp(st[1]) : null;
    if (st && time !== null) {
      flush();
      const rest = st[2].trim();
      if (!rest) { carriedTime = time; continue; }
      pending = { start: time, parts: [rest] };
      if (!paragraphs) flush();
      continue;
    }
    if (pending && paragraphs) { pending.parts.push(line); continue; }
    flush();
    pending = { start: carriedTime, parts: [line] };
    carriedTime = null;
    if (!paragraphs) flush();
  }
  flush();

  // Each timed line ends where the next begins.
  for (let i = 0; i < out.length - 1; i++) {
    const a = out[i], b = out[i + 1];
    if (a.start_ms !== null && b.start_ms !== null && b.start_ms >= a.start_ms) a.end_ms = b.start_ms;
  }
  return out;
}

// ── The paper edit ──────────────────────────────────────────────────────────

export interface PaperLine {
  id: string;
  media_id: string;
  start_ms: number | null;
  end_ms: number | null;
  speaker: string | null;
  text: string;
  paper_order: number | null;
}

/** The selects, in play order. */
export function paperEdit<T extends Pick<PaperLine, 'paper_order'>>(lines: T[]): T[] {
  return lines.filter((l) => l.paper_order !== null).sort((a, b) => (a.paper_order as number) - (b.paper_order as number));
}

/** How long the paper edit runs, from the lines that have both times; and how many don't. */
export function paperRuntime(lines: Pick<PaperLine, 'start_ms' | 'end_ms'>[]): { ms: number; untimed: number } {
  let ms = 0, untimed = 0;
  for (const l of lines) {
    if (l.start_ms !== null && l.end_ms !== null && l.end_ms > l.start_ms) ms += l.end_ms - l.start_ms;
    else untimed++;
  }
  return { ms, untimed };
}

/** Move one select up or down; returns the new id order. */
export function moveSelect(ids: string[], id: string, by: -1 | 1): string[] {
  const i = ids.indexOf(id), j = i + by;
  if (i < 0 || j < 0 || j >= ids.length) return ids;
  const next = ids.slice();
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

/** The paper edit as text an editor can work from (or paste into a doc). */
export function paperEditText(lines: PaperLine[], titleOf: (mediaId: string) => string): string {
  const { ms, untimed } = paperRuntime(lines);
  const head = `Paper edit — ${lines.length} select${lines.length === 1 ? '' : 's'}, about ${formatStamp(ms)}${untimed ? ` (+${untimed} untimed)` : ''}`;
  const body = lines.map((l, i) => {
    const when = l.start_ms === null ? 'untimed' : `${formatStamp(l.start_ms)}${l.end_ms !== null ? `–${formatStamp(l.end_ms)}` : ''}`;
    return `${i + 1}. ${titleOf(l.media_id)} · ${when}\n   ${l.speaker ? `${l.speaker}: ` : ''}${l.text}`;
  });
  return [head, '', ...body].join('\n');
}
