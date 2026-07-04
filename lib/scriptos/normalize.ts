/* =========================================================================
   SCRIPTOS — SMART NORMALIZER
   Turns messy, real-world pasted/imported text (PDF extractions, Word
   exports, Final Draft copy/paste) into clean, properly-spaced, re-parseable
   screenplay text.

   What it CAN do reliably:
     • strip stray page numbers / scene numbers that PDF extraction leaves behind
     • fix smart quotes, em/en dashes, ellipses, non-breaking spaces
     • normalize scene-heading separators ("--"/"—" -> " - ")
     • re-establish canonical element spacing so the parser & preview render right
     • uppercase scene headings, character cues and transitions

   What NO tool can do (and we don't pretend to): perfectly reconstruct reading
   order from a PDF that extracted columns/lines out of order. For that, the
   lossless path is Import of Fountain/FDX.
   ========================================================================= */

import { contentToBlocks, serializeBlocks, type Block } from './blocks';

/** PDF extractions strip the blank lines that separate a dialogue run from the
 *  action that follows it, so the parser swallows that action into the dialogue
 *  block. This pass pulls obvious stage-direction back out — high precision
 *  only (we'd rather miss a few than turn real dialogue into action). */
function refineBlocks(blocks: Block[]): Block[] {
  // "KI-TEK, 49," / "IRIS BEAUMONT comes up" — an ALL-CAPS proper noun token of
  // 3+ letters embedded in an otherwise mixed-case sentence is a near-certain
  // action cue (character intro / blocking), never dialogue.
  const NAME_AGE = /\b[A-Z][A-Z'’]{2,}(?:[-\s][A-Z][A-Z'’]+)*\s*,\s*\d{1,3}\b/;
  const CAPS_NAME_VERB = /\b[A-Z][A-Z'’]{2,}(?:[-\s][A-Z][A-Z'’]+)*\s+(?:[a-z]{2,})/;

  return blocks.map((b) => {
    if (b.type !== 'dialogue') return b;
    const t = b.text.trim();
    if (!t) return b;
    // All-caps short lines inside dialogue are usually a new (mis-joined) cue —
    // leave those for the parser; we only rescue mixed-case action here.
    if (t === t.toUpperCase()) return b;
    if (NAME_AGE.test(t) || CAPS_NAME_VERB.test(t)) {
      return { ...b, type: 'action' as const };
    }
    return b;
  });
}

/** First pass: pure-text hygiene + noise removal. Keeps blank lines (the
 *  parser uses them as element separators) but drops extraction garbage. */
export function preClean(raw: string): string {
  let t = raw
    .replace(/\r\n?/g, '\n')
    // smart quotes -> straight
    .replace(/[‘’‛′]/g, "'")
    .replace(/[“”″]/g, '"')
    // ellipsis, nbsp
    .replace(/…/g, '...')
    .replace(/ /g, ' ')
    // en/em dash -> "--" (scene-heading separators get tidied in renderBlockText)
    .replace(/[–—]/g, '--');

  const lines = t.split('\n').map((l) => l.replace(/\s+$/g, ''));
  const kept: string[] = [];

  for (const l of lines) {
    const s = l.trim();
    if (s === '') {
      kept.push('');
      continue;
    }
    // Stray page / scene numbers: "12", "12.", "12A", "12A." on their own line.
    if (/^\d{1,4}[A-Z]?\.?$/.test(s)) continue;
    // Continuation artifacts produced by paginated PDFs.
    if (/^\(?\s*(CONTINUED|MORE|CONT'D)\s*\)?:?$/i.test(s)) continue;
    // Bare "FOR YOUR CONSIDERATION" award-screener banners etc. are harmless;
    // leave them — they become action and the writer can delete.
    kept.push(l);
  }

  // Collapse runs of blank lines to a single blank.
  const collapsed: string[] = [];
  for (const l of kept) {
    if (l.trim() === '' && collapsed.length && collapsed[collapsed.length - 1].trim() === '') continue;
    collapsed.push(l);
  }
  return collapsed.join('\n').trim();
}

/** Full normalize: clean -> classify (via the parser) -> canonical serialize. */
export function normalizeScreenplay(raw: string): string {
  const cleaned = preClean(raw);
  if (!cleaned) return '';
  const blocks = refineBlocks(contentToBlocks(cleaned, 'screenplay'));
  return serializeBlocks(blocks);
}

/** Heuristic: does this pasted chunk look like a whole screenplay (worth
 *  normalizing) versus a short snippet the writer is pasting mid-line? */
export function looksLikeScreenplay(text: string): boolean {
  const sceneHeads = (text.match(/^\s*(INT\.?|EXT\.?|INT\.?\/EXT\.?|EST\.?)\b/gim) || []).length;
  const lineCount = text.split('\n').length;
  return sceneHeads >= 2 || (sceneHeads >= 1 && lineCount > 12);
}
