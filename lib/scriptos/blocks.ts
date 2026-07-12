

import { parseScript, type ScriptFormat } from './parser';
import type { ScriptLine } from '@/types/screenplay';

export type BlockType =
  | 'scene'
  | 'action'
  | 'character'
  | 'parenthetical'
  | 'dialogue'
  | 'transition'
  | 'note';

export interface Block {
  id: string;
  type: BlockType;
  text: string;
}

let _seq = 0;
export function newBlockId(): string {
  _seq += 1;
  return `b${Date.now().toString(36)}-${_seq.toString(36)}`;
}

const SCENE_PREFIX = /^(INT\.?\/EXT\.?|EXT\.?\/INT\.?|INT\.?|EXT\.?|EST\.?|I\/E)\b/i;

export function renderBlockText(b: Block): string {
  const t = b.text.replace(/\s+$/g, '').replace(/^\s+/g, '');
  switch (b.type) {
    case 'scene': {

      let s = t.toUpperCase().replace(/\s*(--|—|–)\s*/g, ' - ').replace(/\s{2,}/g, ' ').trim();
      return s;
    }
    case 'character':
      return t.toUpperCase().replace(/\s{2,}/g, ' ').trim();
    case 'transition': {
      let s = t.toUpperCase().trim();

      if (/\bTO$/.test(s) && !s.endsWith(':')) s += ':';
      return s;
    }
    case 'parenthetical': {
      let s = t.trim();
      if (!s.startsWith('(')) s = '(' + s;
      if (!s.endsWith(')')) s = s + ')';
      return s;
    }
    case 'note': {
      let s = t.trim();
      if (!s.startsWith('[[')) s = '[[' + s;
      if (!s.endsWith(']]')) s = s + ']]';
      return s;
    }
    default:
      return t;
  }
}

function needsBlankBefore(prev: BlockType | null, cur: BlockType): boolean {
  if (prev === null) return false;
  switch (cur) {
    case 'scene':
    case 'transition':
    case 'character':
      return true;
    case 'parenthetical':

      return !(prev === 'character' || prev === 'dialogue' || prev === 'parenthetical');
    case 'dialogue':
      return !(prev === 'character' || prev === 'parenthetical' || prev === 'dialogue');
    case 'note':
      return prev !== 'note';
    case 'action':
    default:
      return prev !== 'action';
  }
}

export function serializeBlocks(blocks: Block[]): string {
  const out: string[] = [];
  let prev: BlockType | null = null;
  for (const b of blocks) {
    const text = renderBlockText(b);
    if (text === '' && b.type === 'action') {

      if (out.length && out[out.length - 1] !== '') out.push('');
      prev = 'action';
      continue;
    }
    if (needsBlankBefore(prev, b.type) && out.length && out[out.length - 1] !== '') {
      out.push('');
    }
    out.push(text);
    prev = b.type;
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

function lineToBlockType(line: ScriptLine): BlockType | null {
  switch (line.type) {
    case 'empty':
      return null;
    case 'slug':
      return 'scene';
    case 'character':
      return 'character';
    case 'dialogue':
      return 'dialogue';
    case 'parenthetical':
      return 'parenthetical';
    case 'transition':
      return 'transition';
    case 'shot':
    case 'text':
    case 'title':
    case 'action':
    default: {
      const t = line.text;
      if (t.includes('[[') && t.includes(']]')) return 'note';
      return 'action';
    }
  }
}

export function linesToBlocks(lines: ScriptLine[]): Block[] {
  const blocks: Block[] = [];
  for (const line of lines) {
    const type = lineToBlockType(line);
    if (!type) continue;
    const text = line.text.trim();
    if (!text) continue;
    blocks.push({ id: newBlockId(), type, text });
  }

  if (blocks.length === 0) blocks.push({ id: newBlockId(), type: 'action', text: '' });
  return blocks;
}

export function contentToBlocks(content: string, format: ScriptFormat = 'screenplay'): Block[] {
  if (!content.trim()) return [{ id: newBlockId(), type: 'action', text: '' }];
  const { lines } = parseScript(content, format);
  return linesToBlocks(lines);
}
