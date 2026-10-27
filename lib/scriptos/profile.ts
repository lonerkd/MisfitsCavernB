export type CueStyle = 'uppercase' | 'title-case' | 'lowercase' | 'uncased' | 'mixed' | 'unknown';
export type HeadingNumberStyle = 'unnumbered' | 'number' | 'number-period' | 'letter' | 'letter-period';
export type TransitionEnding = 'colon' | 'period' | 'bare' | 'other';

export interface DocumentProfile {
  cueNames: string[];
  cueStyle: CueStyle;
  cueStyleEvidence: number;
  headingNumberStyles: Record<HeadingNumberStyle, number>;
  transitionEndings: Record<TransitionEnding, number>;
}

const TRANSITIONS = [
  'CUT TO BLACK', 'FINAL FADE OUT', 'FADE TO BLACK', 'SMASH CUT TO', 'MATCH CUT TO',
  'JUMP CUT TO', 'DISSOLVE TO', 'CROSSFADE TO', 'HARD CUT TO', 'QUICK CUT',
  'FLASH CUT TO', 'CUT TO', 'FADE IN', 'FADE OUT', 'FADE TO', 'DISSOLVE',
  'SMASH CUT', 'MATCH CUT', 'JUMP CUT', 'FLASH CUT', 'WIPE TO', 'IRIS IN',
  'IRIS OUT', 'INTERCUT', 'BACK TO', 'TIME CUT', 'MORPH TO', 'BLACKOUT',
  'SLAM TO BLACK', 'RESET TO',
];

const HEADING_PREFIX = String.raw`(?:INTERIOR|EXTERIOR|INT\.?\/EXT\.?|EXT\.?\/INT\.?|INT|EXT|EST|I\/E|E\/I)\b`;
const NUMBERED_HEADING = new RegExp(String.raw`^\s*(\d+[A-Z]?)(\.?)\s+(?=${HEADING_PREFIX})`, 'i');
const SCENE_HEADING = new RegExp(String.raw`^\s*(?:\d+[A-Z]?\.?\s+)?${HEADING_PREFIX}`, 'i');

function cueCase(name: string): Exclude<CueStyle, 'unknown'> {
  const cased = [...name].filter((c) => c.toLowerCase() !== c.toUpperCase());
  if (!cased.length) return 'uncased';
  if (cased.every((c) => c === c.toUpperCase())) return 'uppercase';
  if (cased.every((c) => c === c.toLowerCase())) return 'lowercase';
  if (name.trim().split(/\s+/).every((word) => /^\p{Lu}[\p{Ll}\p{M}'’.-]*$/u.test(word))) return 'title-case';
  return 'mixed';
}

function headingNumberStyle(text: string): HeadingNumberStyle {
  const match = NUMBERED_HEADING.exec(text);
  if (!match) return 'unnumbered';
  const hasLetter = /[A-Z]$/i.test(match[1]);
  if (hasLetter) return match[2] ? 'letter-period' : 'letter';
  return match[2] ? 'number-period' : 'number';
}

function isHeading(text: string): boolean {
  return SCENE_HEADING.test(text);
}

function transitionEnding(text: string): TransitionEnding | null {
  const match = TRANSITIONS.find((phrase) => new RegExp(`^${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[:.!?]?$`, 'i').test(text.trim()));
  if (!match) return null;
  if (text.trim().endsWith(':')) return 'colon';
  if (text.trim().endsWith('.')) return 'period';
  if (text.trim().endsWith('!') || text.trim().endsWith('?')) return 'other';
  return 'bare';
}

function nameFromForcedCue(line: string): string {
  return line
    .trim()
    .slice(1)
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/\s*\^\s*$/, '')
    .replace(/[^\p{L}\p{N}\s'’\-.]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+|\.+$/g, '');
}

export function inferDocumentProfile(source: string): DocumentProfile {
  const cueNames = new Set<string>();
  const cueStyles = new Map<CueStyle, number>();
  const headingNumberStyles: DocumentProfile['headingNumberStyles'] = {
    unnumbered: 0,
    number: 0,
    'number-period': 0,
    letter: 0,
    'letter-period': 0,
  };
  const transitionEndings: DocumentProfile['transitionEndings'] = {
    colon: 0,
    period: 0,
    bare: 0,
    other: 0,
  };

  for (const raw of source.split(/\r?\n/)) {
    const text = raw.trim();
    if (!text) continue;

    if (text.startsWith('@') && text.length > 1) {
      const name = nameFromForcedCue(text);
      if (name) {
        cueNames.add(name.toUpperCase());
        const style = cueCase(name);
        cueStyles.set(style, (cueStyles.get(style) ?? 0) + 1);
      }
    }

    if (isHeading(text)) headingNumberStyles[headingNumberStyle(text)]++;

    const ending = transitionEnding(text);
    if (ending) transitionEndings[ending]++;
  }

  const styles = [...cueStyles.entries()].sort((a, b) => b[1] - a[1]);
  const cueStyle: CueStyle = styles.length === 0
    ? 'unknown'
    : styles.length > 1 && styles[0][1] === styles[1][1]
      ? 'mixed'
      : styles[0][0];

  return { cueNames: [...cueNames], cueStyle, cueStyleEvidence: styles[0]?.[1] ?? 0, headingNumberStyles, transitionEndings };
}
