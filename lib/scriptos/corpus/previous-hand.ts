// The previous-draft measure on the independent, hand-labelled scripts (handwritten/real-conventions.ts). The seeded
// generator and the decoder come from one model of scripts, so the same question is asked of scripts a person labelled
// before the engine saw them: each is pasted with its blank lines removed, and its earlier draft is derived by a fixed
// rule (every 13th action line cut, every 7th speech reworded, a new action line after every 17th action line). Lines the
// labeller marked as a matter of opinion (`?|`) are not scored. See previous.ts for what the three kinds of earlier
// reading are.

import { parseScript } from '../parser';
import { previousDraftFromReading, type PreviousDraft } from '../previous-draft';
import { HAND_SCRIPTS, HAND_SCRIPTS_LAYOUT } from './handwritten/real-conventions';
import type { EarlierKind } from './previous';
import type { TruthLine } from './render';
import { pool, scoreLines, type Score } from './score';

const CODE: Record<string, string> = { S: 'slug', A: 'action', C: 'character', D: 'dialogue', P: 'parenthetical', T: 'transition' };
type Labelled = { type: string; text: string };

function labelled(lines: string[]): Labelled[] {
  return lines.map((raw) => (raw === '' ? { type: 'empty', text: '' } : { type: raw[1] === '|' ? (raw[0] === '?' ? '?' : CODE[raw[0]]) : 'bad', text: raw.slice(2) }));
}

/** The earlier draft of a hand-labelled script, by the fixed rule above. */
export function earlierHandDraft(lines: Labelled[]): Labelled[] {
  const out: Labelled[] = [];
  let actions = 0;
  let speeches = 0;
  for (const l of lines) {
    if (l.type === 'action') {
      actions++;
      if (actions % 13 === 0) continue;
      out.push(l);
      if (actions % 17 === 0) out.push({ type: 'action', text: 'A door closes somewhere in the building.' });
    } else if (l.type === 'dialogue') {
      speeches++;
      out.push(speeches % 7 === 0 ? { ...l, text: `${l.text} Again.` } : l);
    } else out.push(l);
  }
  return out;
}

/** The hand-labelled scripts pasted with no blank lines, read with their earlier draft (or without it: kind 'none'). */
export function measureHandwrittenWithEarlier(kind: EarlierKind): Score {
  const scores: Score[] = [];
  for (const script of [...HAND_SCRIPTS, ...HAND_SCRIPTS_LAYOUT]) {
    const now = labelled(script.lines);
    const tight = now.filter((l) => l.type !== 'empty');
    const earlier = earlierHandDraft(now);
    let previousDraft: PreviousDraft | undefined;
    if (kind === 'corrected') previousDraft = previousDraftFromReading(earlier.filter((l) => l.type !== 'empty' && l.type !== '?').map((l) => ({ text: l.text, type: l.type })));
    else if (kind === 'blanks') previousDraft = previousDraftFromReading(parseScript(earlier.map((l) => l.text).join('\n')).lines);
    else if (kind === 'same') previousDraft = previousDraftFromReading(parseScript(earlier.filter((l) => l.type !== 'empty').map((l) => l.text).join('\n')).lines);
    const read = parseScript(tight.map((l) => l.text).join('\n'), 'screenplay', undefined, { context: { previousDraft } });
    scores.push(scoreLines(tight.map((l) => ({ type: l.type === '?' ? 'empty' : l.type, text: l.text })) as TruthLine[], read.lines));
  }
  return pool(scores);
}
