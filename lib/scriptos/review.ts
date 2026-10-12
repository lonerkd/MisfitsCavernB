// Where the reader is unsure (L7 of the deep-brain plan): the lines a person
// should look at, least certain first, each with what it was read as, what else
// it could be, and — for a name — the one-tap verdicts the project remembers.
// Pure.

import type { LineType, ScriptLine } from './types';

export interface Doubt {
  index: number;
  text: string;
  type: LineType;
  /** 0–100, how likely the reader thinks its own reading is. */
  confidence: number;
  alternative: LineType | null;
  /** For a speaker, or a line that might be one: the name a verdict would be about. */
  name: string | null;
  why: string;
}

/** The part of a line a speaker verdict is about: no extension, upper-case; null when it cannot be a name. */
export function nameOf(text: string): string | null {
  const bare = text.replace(/\s*\([^)]*\)\s*$/, '').replace(/\s*\^\s*$/, '').trim();
  if (!bare || bare.length > 40 || /[.!?…,;:]$/.test(bare)) return null;
  if ([...bare].some((c) => c !== c.toUpperCase())) return null; // a name is in capitals
  return bare.toUpperCase();
}

export function doubtfulReads(lines: ScriptLine[], opts: { below?: number; limit?: number } = {}): Doubt[] {
  const below = opts.below ?? 75;
  const limit = opts.limit ?? 12;
  const out: Doubt[] = [];
  const seen = new Set<string>();
  for (const l of lines) {
    if (!/Decoded as/.test(l.reasoning ?? '') || l.confidence >= below) continue;
    const alternative = ((l.meta as { alternative?: LineType } | undefined)?.alternative ?? null) as LineType | null;
    const once = /Seen speaking only once/.test(l.reasoning ?? '');
    let name: string | null = null;
    let why = '';
    if (l.type === 'character') {
      name = (l.meta?.characterName as string | undefined)?.toUpperCase() ?? nameOf(l.text);
      why = once ? 'Read as a speaker, but only once' : 'Read as a speaker; could be action';
    } else if ((alternative === 'character') && (l.type === 'action' || l.type === 'dialogue')) {
      name = nameOf(l.text);
      why = name ? 'Read as action; could be a speaker' : '';
    } else if (alternative) {
      why = `Read as ${l.type}; could be ${alternative}`;
    }
    if (!why) continue;
    const key = name ? `n:${name}` : `l:${l.index}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ index: l.index, text: l.text.trim(), type: l.type, confidence: l.confidence, alternative, name, why });
  }
  // The genuinely ambiguous first; then the names seen once, by position.
  return out.sort((a, b) => a.confidence - b.confidence || a.index - b.index).slice(0, limit);
}
