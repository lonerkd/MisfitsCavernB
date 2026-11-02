// The parser reference: every word list, pattern and weight the reading engine uses, written out from the
// code itself so it cannot drift (`reference.test.ts` fails if the committed copy is stale). Pure.

import { KNOWLEDGE, TRANSITION_TO_COLOUR } from './parser';
import { DEFAULT_PARAMS, TIME_CARD, type Params } from './decode';
import { TIMES, FILLER, NUMBER_WORDS, MONTHS, DAYS_OF_WEEK, FRAME_TAG, YEAR, CLOCK } from './heading';
import { SYNONYMS, VERBS } from './languages';

/** What each decoder weight means. A new weight with no line here fails the test, so the reference stays whole. */
export const PARAM_DOCS: Record<keyof Params, string> = {
  cue: 'a line that looks like a character cue (capitals, short, followed by speech)',
  knownName: 'a cue whose name was already seen speaking, or told to us by the project (a discount)',
  rejectedName: 'a cue whose name a person said is not a character (a heavy penalty)',
  extension: 'a cue with an extension such as (V.O.) or (CONT\'D) (a discount)',
  noSpeechUnder: 'a cue with nothing after it to speak',
  cueSentence: 'a "cue" that reads as a sentence',
  cueLong: 'a "cue" that is too long to be a name',
  dialogue: 'ordinary speech',
  dialogueCaps: 'speech written in capitals (shouting)',
  action: 'ordinary action',
  actionProse: 'action that reads as prose',
  actionCaps: 'action written in capitals',
  actionNamesSomeone: 'action that opens with a known speaker\'s name and a verb ("Maya ducks.")',
  dialogueOutsideSpeech: 'speech with no cue before it',
  parentheticalOutsideSpeech: 'a parenthetical with no speech around it',
  parentheticalAfterParenthetical: 'two parentheticals in a row',
  cueAfterCue: 'a cue straight after a cue',
  cueAfterSpeechNoBlank: 'a cue straight after speech with no blank line between',
  actionInsideSpeech: 'action in the middle of a speech',
  impossible: 'a sequence the grammar forbids',
  temperature: 'how sharply costs become certainty (lower is more decisive)',
};

// Code-point order, never a locale's collation: the committed file must come out the same on every machine.
const byCodePoint = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const sorted = (set: ReadonlySet<string>) => Array.from(set).sort(byCodePoint);
const list = (items: string[]) => items.map((i) => `\`${i}\``).join(' · ');

export function buildReference(): string {
  const out: string[] = [];
  out.push('# The parser reference');
  out.push('');
  out.push('> **Generated** by `npm run parser:reference` from the code in `lib/scriptos/` — never edit by hand. `lib/scriptos/reference.test.ts` fails when this file is stale. How the engine works: [`scriptos-engine.md`](scriptos-engine.md).');
  out.push('');
  out.push('## Word lists (`KNOWLEDGE`, `lib/scriptos/parser.ts`)');
  out.push('');
  for (const [name, set] of Object.entries(KNOWLEDGE)) {
    out.push(`### ${name} (${(set as Set<string>).size})`);
    out.push('');
    out.push(list(sorted(set as Set<string>)));
    out.push('');
  }
  out.push('## Heading vocabulary (`lib/scriptos/heading.ts`)');
  out.push('');
  for (const [name, set] of Object.entries({ TIMES, FILLER, NUMBER_WORDS, MONTHS, DAYS_OF_WEEK })) {
    out.push(`### ${name} (${set.size})`);
    out.push('');
    out.push(list(sorted(set)));
    out.push('');
  }
  out.push('### Patterns');
  out.push('');
  out.push(`- \`FRAME_TAG\` — layers of a story told in layers: \`${FRAME_TAG.source}\``);
  out.push(`- \`YEAR\` — a year or a decade in a heading: \`${YEAR.source}\``);
  out.push(`- \`CLOCK\` — a clock time standing in for a time of day: \`${CLOCK.source}\``);
  out.push('');
  out.push('## Patterns in the reader');
  out.push('');
  out.push(`- \`TRANSITION_TO_COLOUR\` (\`parser.ts\`) — a transition written without its colon: \`${TRANSITION_TO_COLOUR.source}\``);
  out.push(`- \`TIME_CARD\` (\`decode.ts\`) — a time card that narrates and ends a speech ("TWO HOURS LATER"): \`${TIME_CARD.source}\``);
  out.push('');
  out.push('## Languages (`lib/scriptos/languages.ts`)');
  out.push('');
  out.push(`Names are read from the platform's own language table (\`Intl.DisplayNames\`); \`SYNONYMS\` adds what that table lacks (${Object.keys(SYNONYMS).length} entries):`);
  out.push('');
  out.push(Object.entries(SYNONYMS).sort(([a], [b]) => byCodePoint(a, b)).map(([k, v]) => `\`${k}\` → ${v}`).join(' · '));
  out.push('');
  out.push(`A language is named after a verb phrase: \`${VERBS.source}\``);
  out.push('');
  out.push('## Decoder weights (`DEFAULT_PARAMS`, `lib/scriptos/decode.ts`)');
  out.push('');
  out.push('Costs: lower is a better fit. Tuned on the corpus (`lib/scriptos/corpus`); change one, re-measure (`npm run test` runs the ratchet).');
  out.push('');
  out.push('| Weight | Cost | What it prices |');
  out.push('| --- | ---: | --- |');
  for (const key of Object.keys(DEFAULT_PARAMS) as Array<keyof Params>) {
    out.push(`| \`${key}\` | ${DEFAULT_PARAMS[key]} | ${PARAM_DOCS[key]} |`);
  }
  out.push('');
  return out.join('\n');
}
