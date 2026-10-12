

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
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&amp;/g, '&');
}

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

export function importToContent(text: string, filename: string): { content: string; format: ScriptFormat } {
  const lower = filename.toLowerCase();
  const isFdx = lower.endsWith('.fdx') || /<FinalDraft\b/i.test(text) || /<Paragraph\b[^>]*Type=/i.test(text);
  if (isFdx) {
    const content = parseFdx(text);
    if (content) return { content, format: 'screenplay' };
  }
  // A Fountain file is already what the parser reads, natively and losslessly: forced
  // headings, the title page, sections, synopses, notes and boneyard. Only the line endings
  // are made uniform; nothing is rewritten.
  if (lower.endsWith('.fountain')) return { content: text.replace(/\r\n?/g, '\n'), format: 'screenplay' };
  return { content: normalizeScreenplay(text), format: 'screenplay' };
}
