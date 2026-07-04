/* =========================================================================
   SCRIPTOS — IMPORT
   Lossless where the format allows it (Final Draft .fdx carries explicit
   element types), best-effort smart-clean for plain .txt / .fountain.
   ========================================================================= */

import { normalizeScreenplay } from './normalize';
import { serializeBlocks, newBlockId, type Block, type BlockType } from './blocks';
import type { ScriptFormat } from './parser';

const FDX_TYPE_MAP: Record<string, BlockType> = {
  'Scene Heading': 'scene',
  'Action': 'action',
  'Character': 'character',
  'Parenthetical': 'parenthetical',
  'Dialogue': 'dialogue',
  'Transition': 'transition',
  'Shot': 'action',
  'General': 'action',
  'Cast List': 'action',
};

function decodeXml(s: string): string {
  return s
    .replace(/<[^>]+>/g, '') // strip any nested inline tags
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&amp;/g, '&');
}

/** Final Draft .fdx — paragraphs carry an explicit Type, so this is lossless. */
export function parseFdx(xml: string): string {
  const blocks: Block[] = [];
  const paraRe = /<Paragraph\b([^>]*)>([\s\S]*?)<\/Paragraph>/g;
  let m: RegExpExecArray | null;
  while ((m = paraRe.exec(xml))) {
    const attrs = m[1] || '';
    const inner = m[2] || '';
    const typeName = (attrs.match(/\bType="([^"]*)"/) || [, 'General'])[1] as string;
    const type = FDX_TYPE_MAP[typeName] || 'action';
    const texts = [...inner.matchAll(/<Text\b[^>]*>([\s\S]*?)<\/Text>/g)]
      .map((t) => decodeXml(t[1]))
      .join('');
    const text = texts.replace(/\s+/g, ' ').trim();
    if (!text) continue;
    blocks.push({ id: newBlockId(), type, text });
  }
  return blocks.length ? serializeBlocks(blocks) : '';
}

/** Strip Fountain-only scaffolding the screenplay parser shouldn't see, then
 *  hand off to the normalizer. Honors forced-element markers (., !, @, >). */
function preprocessFountain(text: string): string {
  let t = text.replace(/\r\n?/g, '\n');
  // Remove boneyard /* ... */ comments.
  t = t.replace(/\/\*[\s\S]*?\*\//g, '');
  const out: string[] = [];
  const lines = t.split('\n');
  // Drop a leading title-page block (Key: Value lines before the first blank).
  let i = 0;
  if (/^[A-Za-z][\w ]*:/.test(lines[0] || '')) {
    while (i < lines.length && lines[i].trim() !== '') i++;
  }
  for (; i < lines.length; i++) {
    let line = lines[i];
    const s = line.trim();
    if (/^={3,}$/.test(s) || /^#{1,6}\s/.test(s) || s.startsWith('=')) continue; // sections/synopsis/page-break
    if (s.startsWith('.') && !s.startsWith('..')) line = s.slice(1).toUpperCase();   // forced scene
    else if (s.startsWith('!')) line = s.slice(1);                                   // forced action
    else if (s.startsWith('@')) line = s.slice(1).toUpperCase();                     // forced character
    else if (s.startsWith('>') && s.endsWith('<')) line = s.slice(1, -1).trim();     // centered
    else if (s.startsWith('>')) line = s.slice(1).trim().toUpperCase();              // forced transition
    out.push(line);
  }
  return out.join('\n');
}

export function importToContent(text: string, filename: string): { content: string; format: ScriptFormat } {
  const lower = filename.toLowerCase();
  const isFdx = lower.endsWith('.fdx') || /<FinalDraft\b/i.test(text) || /<Paragraph\b[^>]*Type=/i.test(text);
  if (isFdx) {
    const content = parseFdx(text);
    if (content) return { content, format: 'screenplay' };
  }
  const source = lower.endsWith('.fountain') ? preprocessFountain(text) : text;
  return { content: normalizeScreenplay(source), format: 'screenplay' };
}
