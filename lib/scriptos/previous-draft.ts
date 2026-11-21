// The previous draft as evidence (B7b of the deep-brain plan). When a script has an earlier saved version, a line of the
// later draft that is the same line (or a lightly edited one) was already read in that draft, and where a person looked
// at it (a Force type, a "Read as") the earlier reading is what they decided. The decoder takes that as a bounded prior
// (decode.ts `previousDraft`), never over a person's line override and never over what the line plainly is.
// Pure: this file only turns "the earlier text, read" into "what each line of the later text was last time".

import * as Diff from 'diff';
import type { State } from './decode';
import { THRESHOLDS } from './thresholds';

/** The labels the decoder chooses between; the previous draft's other line types (title page, notes, boneyard) say nothing about them. */
export type PriorType = State;
const PRIOR_TYPES: ReadonlySet<string> = new Set(['slug', 'transition', 'character', 'parenthetical', 'dialogue', 'action']);

/** The non-blank lines of an earlier draft with the type each was read as (after the person's corrections). */
export interface PreviousDraft {
  lines: ReadonlyArray<{ text: string; type: PriorType }>;
}

/**
 * The earlier draft's reading, kept to what the decoder can use: the types it chooses between, and only the lines the
 * earlier reading was sure of (or a person settled: a forced line is read at 100). A guess carried forward is the same
 * guess twice, so a doubtful line of the earlier draft says nothing about this one. `confidence` absent means settled.
 */
export function previousDraftFromReading(read: ReadonlyArray<{ text: string; type: string; confidence?: number }>, minConfidence = THRESHOLDS.previousDraftMinConfidence.value): PreviousDraft {
  const lines: Array<{ text: string; type: PriorType }> = [];
  for (const l of read) if (l.text.trim() && PRIOR_TYPES.has(l.type) && (l.confidence ?? 100) >= minConfidence) lines.push({ text: l.text, type: l.type as PriorType });
  return { lines };
}

const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
const tokens = (s: string) => new Set(s.toLowerCase().split(/[^\p{L}\p{N}']+/u).filter(Boolean));

/** How alike two lines are (0–1): the share of words they have in common. */
export function lineSimilarity(a: string, b: string): number {
  const x = tokens(a);
  const y = tokens(b);
  if (!x.size || !y.size) return a === b ? 1 : 0;
  let common = 0;
  for (const t of x) if (y.has(t)) common++;
  return common / (x.size + y.size - common);
}

/** An edited line is "the same line" when this much of it is unchanged. */
export const NEAR_IDENTICAL = 0.7;
/** The longest edit script the alignment will look for; a rewrite beyond this is a new draft, not a revision. */
const MAX_EDITS = 2500;

/**
 * For each raw line of the later draft, the type that line (or its lightly edited ancestor) had in the earlier one, or
 * undefined. Lines are aligned in order (an insertion, a deletion or a reword shifts everything below it, so the
 * alignment is a diff, not a line number): identical lines pair first, then, inside a changed stretch, lines in order
 * that still share most of their words. A line that repeats ("Yes.") pairs with its own counterpart, not any other.
 */
export function alignPreviousDraft(rawLines: readonly string[], previous: PreviousDraft | undefined): Array<PriorType | undefined> {
  const out: Array<PriorType | undefined> = new Array(rawLines.length).fill(undefined);
  if (!previous?.lines.length || !rawLines.length) return out;
  const now: Array<{ at: number; text: string }> = [];
  rawLines.forEach((raw, at) => { const text = norm(raw); if (text) now.push({ at, text }); });
  if (!now.length) return out;
  const was = previous.lines.map((l) => ({ text: norm(l.text), type: l.type }));

  const parts = Diff.diffArrays(was.map((l) => l.text), now.map((l) => l.text), { maxEditLength: MAX_EDITS });
  if (!parts) {
    // Too different to align: only a line that was always read the same way, and is the same line, carries over.
    const seen = new Map<string, PriorType | null>();
    for (const l of was) seen.set(l.text, seen.has(l.text) && seen.get(l.text) !== l.type ? null : l.type);
    for (const n of now) { const t = seen.get(n.text); if (t) out[n.at] = t; }
    return out;
  }

  let w = 0; // next unread line of the earlier draft
  let n = 0; // next unread line of the later one
  for (let k = 0; k < parts.length; k++) {
    const part = parts[k];
    const count = part.value.length;
    if (!part.added && !part.removed) {
      for (let i = 0; i < count; i++) out[now[n + i].at] = was[w + i].type;
      w += count; n += count;
    } else if (part.removed) {
      const next = parts[k + 1];
      if (next?.added) {
        // A reword: pair the removed lines with the added ones, in order, while they still read as the same line.
        let from = w;
        for (let i = 0; i < next.value.length; i++) {
          for (let j = from; j < w + count; j++) {
            if (lineSimilarity(was[j].text, now[n + i].text) >= NEAR_IDENTICAL) { out[now[n + i].at] = was[j].type; from = j + 1; break; }
          }
        }
        n += next.value.length;
        k++;
      }
      w += count;
    } else {
      n += count; // lines added with nothing removed beside them: new
    }
  }
  return out;
}

/** How much of a reading came from the previous draft: lines read as it read them, and lines it read as something else (parser.ts explainFromContext). */
export function previousDraftUse(lines: ReadonlyArray<{ meta?: unknown }>): { same: number; differs: number } {
  let same = 0;
  let differs = 0;
  for (const l of lines) {
    const meta = l.meta as { fromPreviousDraft?: string; previousDraftRead?: string } | undefined;
    if (meta?.fromPreviousDraft) same++;
    else if (meta?.previousDraftRead) differs++;
  }
  return { same, differs };
}
