// Fountain serializer — the "writer" half that makes ScriptOS a formatter, not
// just a reader. Takes the parsed line model and emits canonical, valid Fountain.
//
// Design contract (proven by fountain-roundtrip.test.ts):
//   parse(serializeFountain(parse(content))) === parse(content)
// at the *structural* level — same element-type sequence, same scenes, same
// cast lists, same characters. Content text is canonicalised (forced markers
// resolved to their standard form) but meaning is preserved.

import { parseScript } from './parser';
import type { ScriptLine } from '@/types/screenplay';

const isAllCaps = (s: string): boolean => s.length > 0 && s === s.toUpperCase() && /[A-Z]/.test(s);

export function serializeLine(l: ScriptLine): string {
  const raw = l.text.trim();

  switch (l.type) {
    case 'slug': {
      const heading = ((l.meta?.heading as string) || raw.replace(/^\.\s*/, '').replace(/#[\w.-]+#\s*$/, '')).trim();
      const forced = /^\./.test(raw);
      const num = l.meta?.sceneNumber ? ` #${l.meta.sceneNumber}#` : '';
      return `${forced ? '.' : ''}${heading.toUpperCase()}${num}`;
    }

    case 'character': {
      const name = (l.meta?.characterName as string) || raw.replace(/^[@^]\s*/, '');
      const inline = raw.match(/\([^)]*\)\s*$/);
      return `${name.toUpperCase()}${inline ? ' ' + inline[0] : ''}`;
    }

    case 'dialogue':
    case 'parenthetical':
      return raw;

    case 'transition': {
      const body = raw.replace(/^>\s*/, '').toUpperCase().trim();
      return /^>/.test(raw) ? `> ${body}` : body;
    }

    case 'centered': {
      const inner = raw.replace(/^>\s*/, '').replace(/\s*<$/, '');
      return `> ${inner} <`;
    }

    case 'section': {
      const level = (l.meta?.level as number) || 1;
      return `${'#'.repeat(level)} ${raw.replace(/^#{1,6}\s*/, '')}`;
    }

    case 'synopsis':
      return `= ${raw.replace(/^=\s*/, '')}`;

    case 'lyric':
      return `~${raw.replace(/^~\s*/, '')}`;

    case 'note':
      return `[[ ${raw.replace(/^\[\[\s*/, '').replace(/\s*\]\]$/, '')} ]]`;

    case 'dual':
      return '^';

    case 'pagebreak':
      return '===';

    case 'boneyard': {
      const inner = raw.replace(/^\/\*/, '').replace(/\*\/$/, '').trim();
      return `/* ${inner} */`;
    }

    case 'action': {
      const text = raw.replace(/^!\s*/, '');
      // An ALL-CAPS action would otherwise re-parse as a character cue; the
      // Fountain '!' marker preserves the intended element type.
      return isAllCaps(text) ? `!${text}` : text;
    }

    // shot/text/title/scene/empty and any future type: emit the raw text.
    default:
      return raw;
  }
}

export function serializeFountain(lines: ScriptLine[]): string {
  const out: string[] = [];
  for (const line of lines) {
    if (line.type === 'empty') {
      out.push('');
      continue;
    }
    out.push(serializeLine(line));
  }
  return out.join('\n');
}

/**
 * Canonicalise a Fountain document: parse it, then re-emit in standard form.
 * Idempotent — applying it twice yields the same output.
 */
export function canonicalizeFountain(content: string): string {
  const { lines } = parseScript(content);
  return serializeFountain(lines);
}
