

import { contentToBlocks, serializeBlocks, type Block } from './blocks';

function refineBlocks(blocks: Block[]): Block[] {

  const NAME_AGE = /\b[A-Z][A-Z'’]{2,}(?:[-\s][A-Z][A-Z'’]+)*\s*,\s*\d{1,3}\b/;
  const CAPS_NAME_VERB = /\b[A-Z][A-Z'’]{2,}(?:[-\s][A-Z][A-Z'’]+)*\s+(?:[a-z]{2,})/;

  return blocks.map((b) => {
    if (b.type !== 'dialogue') return b;
    const t = b.text.trim();
    if (!t) return b;

    if (t === t.toUpperCase()) return b;
    if (NAME_AGE.test(t) || CAPS_NAME_VERB.test(t)) {
      return { ...b, type: 'action' as const };
    }
    return b;
  });
}

export function preClean(raw: string): string {
  let t = raw
    .replace(/\r\n?/g, '\n')

    .replace(/[‘’‛′]/g, "'")
    .replace(/[“”″]/g, '"')

    .replace(/…/g, '...')
    .replace(/ /g, ' ')

    .replace(/[–—]/g, '--');

  const lines = t.split('\n').map((l) => l.replace(/\s+$/g, ''));
  const kept: string[] = [];

  for (const l of lines) {
    const s = l.trim();
    if (s === '') {
      kept.push('');
      continue;
    }

    if (/^\d{1,4}[A-Z]?\.?$/.test(s)) continue;

    if (/^\(?\s*(CONTINUED|MORE|CONT'D)\s*\)?:?$/i.test(s)) continue;

    kept.push(l);
  }

  const collapsed: string[] = [];
  for (const l of kept) {
    if (l.trim() === '' && collapsed.length && collapsed[collapsed.length - 1].trim() === '') continue;
    collapsed.push(l);
  }
  return collapsed.join('\n').trim();
}

export function normalizeScreenplay(raw: string): string {
  const cleaned = preClean(raw);
  if (!cleaned) return '';
  const blocks = refineBlocks(contentToBlocks(cleaned, 'screenplay'));
  return serializeBlocks(blocks);
}

export function looksLikeScreenplay(text: string): boolean {
  const sceneHeads = (text.match(/^\s*(INT\.?|EXT\.?|INT\.?\/EXT\.?|EST\.?)\b/gim) || []).length;
  const lineCount = text.split('\n').length;
  return sceneHeads >= 2 || (sceneHeads >= 1 && lineCount > 12);
}
