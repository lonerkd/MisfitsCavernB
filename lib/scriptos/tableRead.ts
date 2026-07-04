// Table-read engine — reads a parsed screenplay aloud with the browser's
// SpeechSynthesis API, voicing dialogue as whichever character last spoke and
// narrating everything else (slugs/action/parentheticals/transitions) flat.
// Purely additive: it only observes already-parsed lines, never mutates the
// script, so it has no interaction with useScriptSync or the write surface.

export interface TableReadLine {
  type: string;
  text: string;
}

export interface TableReadOptions {
  /** Fires right before the line at this index starts being spoken. */
  onLineStart?: (index: number) => void;
  onComplete?: () => void;
  rate?: number;
}

// Deterministic voice assignment per character name — hash the name into an
// index over the available voice list so the same character always gets the
// same voice across a session (and across replays).
function voiceForCharacter(name: string, voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  if (!voices.length) return undefined;
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return voices[hash % voices.length];
}

export function isTableReadSupported(): boolean {
  return typeof window !== 'undefined' && !!window.speechSynthesis;
}

export class TableReadEngine {
  private lines: TableReadLine[];
  private idx = 0;
  private playing = false;
  private stopped = true;
  private currentCharacter: string | null = null;
  private opts: TableReadOptions;

  constructor(lines: TableReadLine[], opts: TableReadOptions = {}) {
    this.lines = lines;
    this.opts = opts;
  }

  get isReading() {
    return this.playing;
  }

  play(fromIndex = 0) {
    if (!isTableReadSupported()) return;
    window.speechSynthesis.cancel();
    this.stopped = false;
    this.playing = true;
    this.idx = fromIndex;
    this.speakNext();
  }

  pause() {
    if (!isTableReadSupported()) return;
    window.speechSynthesis.pause();
    this.playing = false;
  }

  resume() {
    if (!isTableReadSupported()) return;
    window.speechSynthesis.resume();
    this.playing = true;
  }

  stop() {
    this.stopped = true;
    this.playing = false;
    if (isTableReadSupported()) window.speechSynthesis.cancel();
  }

  private speakNext = () => {
    if (this.stopped) return;
    if (this.idx >= this.lines.length) {
      this.playing = false;
      this.opts.onComplete?.();
      return;
    }
    const line = this.lines[this.idx];
    if (!line.text.trim()) {
      this.idx++;
      this.speakNext();
      return;
    }
    if (line.type === 'character') this.currentCharacter = line.text.trim();

    this.opts.onLineStart?.(this.idx);

    const voices = window.speechSynthesis.getVoices();
    const narratorVoice = voices.find(v => /en/i.test(v.lang)) || voices[0];
    const utter = new SpeechSynthesisUtterance(line.text);
    utter.rate = this.opts.rate ?? 1;
    utter.voice =
      (line.type === 'dialogue' && this.currentCharacter
        ? voiceForCharacter(this.currentCharacter, voices)
        : undefined) || narratorVoice || null;

    utter.onend = () => {
      if (this.stopped) return;
      this.idx++;
      this.speakNext();
    };
    utter.onerror = () => {
      if (this.stopped) return;
      this.idx++;
      this.speakNext();
    };
    window.speechSynthesis.speak(utter);
  };
}

export function getTableReadEngine(lines: TableReadLine[], opts?: TableReadOptions) {
  return new TableReadEngine(lines, opts);
}
