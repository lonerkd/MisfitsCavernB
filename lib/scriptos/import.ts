

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

const textOf = (inner: string): string =>
  [...inner.matchAll(/<Text\b[^>]*>([\s\S]*?)<\/Text>/g)].map((t) => decodeXml(t[1])).join('');
const PARA = String.raw`<Paragraph\b([^>]*[^>/])?>([\s\S]*?)<\/Paragraph>`;

/**
 * The Fountain title-page lines from a <TitlePage>. Our own export labels each paragraph with a
 * `<!--cavern:key=Title-->` comment ('+' continues the key above, an empty key is a generated page that is not
 * imported). A file from Final Draft has no labels: the first paragraph is the title, then credit and author when
 * three or more are centered, and anything else is the contact.
 */
function titlePageLines(xml: string): string[] {
  const tp = xml.match(/<TitlePage\b[\s\S]*?<\/TitlePage>/);
  if (!tp) return [];
  const content = (tp[0].match(/<Content\b[\s\S]*?<\/Content>/) || [''])[0];
  const labelled = /<!--cavern:key=/.test(content);
  const out: string[] = [];
  if (labelled) {
    const re = new RegExp(String.raw`<!--cavern:key=([^>]*?)-->\s*` + PARA, 'g');
    let skipping = false;
    for (const m of content.matchAll(re)) {
      const key = m[1];
      const text = textOf(m[3] || '').replace(/[\r\n\t]+/g, ' ').trim();
      if (key === '') { skipping = true; continue; }
      if (key === '+') { if (!skipping) out.push(`  ${text}`); continue; }
      skipping = false;
      out.push(`${key}:${text ? ' ' + text : ''}`);
    }
    return out;
  }
  const paras = [...content.matchAll(new RegExp(PARA, 'g'))]
    .map((m) => ({ text: textOf(m[2] || '').replace(/[\r\n\t]+/g, ' ').trim(), center: /\bAlignment="Center"/.test(m[1] || '') }))
    .filter((p) => p.text);
  const centered = paras.filter((p) => p.center);
  const keys = ['Title', 'Credit', 'Author'];
  const named = centered.length >= 3 ? centered.slice(0, 3) : centered.length ? centered.slice(0, 1) : [];
  if (centered.length === 2) named.push(centered[1]);
  named.forEach((p, i) => out.push(`${centered.length === 2 && i === 1 ? 'Author' : keys[i]}: ${p.text}`));
  const rest = paras.filter((p) => !named.includes(p));
  rest.forEach((p, i) => out.push(i === 0 ? `Contact: ${p.text}` : `  ${p.text}`));
  return out;
}

export function parseFdx(xml: string): string {
  const blocks: Block[] = [];
  const title = titlePageLines(xml);
  // The title page is not body text: its keys go to the top of the script (above), the paragraphs never into the body.
  xml = xml.replace(/<TitlePage\b[\s\S]*?<\/TitlePage>/g, '');
  const tokenRe = new RegExp(String.raw`<DualDialogue\b[^>]*>([\s\S]*?)<\/DualDialogue>|` + PARA, 'g');
  const push = (attrs: string, inner: string, dualSecond: { on: boolean }) => {
    const typeName = (attrs.match(/\bType="([^"]*)"/) || [, 'General'])[1] as string;
    const type = FDX_TYPE_MAP[typeName] || 'action';
    let text = textOf(inner).replace(/[\r\n\t]+/g, ' ').trim();
    if (!text) return;
    if (type === 'character' && dualSecond.on) text += ' ^';
    // Centered text is a real FDX alignment; Fountain writes it > like this <.
    if (/\bAlignment="Center"/.test(attrs) && type === 'action' && !/^>.*<$/.test(text)) text = `> ${text} <`;
    // Centered text and Fountain sections and synopses are paragraphs of their own, as the writer set them apart.
    const alone = type === 'action' && (/^>.*<$/.test(text) || (typeName === 'General' && /^(#|=(?![=\s]))/.test(text)));
    if (alone && blocks.length) blocks.push({ id: newBlockId(), type: 'action', text: '' });
    blocks.push({ id: newBlockId(), type, text });
    if (alone) blocks.push({ id: newBlockId(), type: 'action', text: '' });
  };
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(xml))) {
    if (m[1] !== undefined) {
      // Both speakers of a dual dialogue: the second cue is the one that carries the caret.
      let cues = 0;
      for (const p of m[1].matchAll(new RegExp(PARA, 'g'))) {
        const isCue = /\bType="Character"/.test(p[1] || '');
        if (isCue) cues++;
        push(p[1] || '', p[2] || '', { on: isCue && cues === 2 });
      }
    } else {
      push(m[2] || '', m[3] || '', { on: false });
    }
  }
  const bodyText = blocks.length ? serializeBlocks(blocks) : '';
  if (!title.length) return bodyText;
  return `${title.join('\n')}\n${bodyText ? '\n' + bodyText : ''}`;
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
