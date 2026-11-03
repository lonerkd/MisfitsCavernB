// The decoder (L4 of the deep-brain plan): the best labelling of the WHOLE script.
//
// The old classifier labelled each line once, in order, by thresholds on a few
// scores — so one weak line could corrupt the next, and "MAYA / STOP RIGHT THERE!"
// lost both lines because the shout looked wrong on its own. Here every line gets a
// cost for each label it could have (how badly the line fits it), and the labelling
// of the whole document is chosen that costs least, where the screenplay's grammar
// is a cost too: dialogue belongs under a cue, a parenthetical sits inside a speech,
// a cue needs a line beneath it, a blank line ends a speech. Deterministic, linear,
// no model: the weights below are the only knobs, and the corpus measures them.

import { THRESHOLDS } from './thresholds';
import type { LineType } from './types';

export type State = 'slug' | 'transition' | 'character' | 'parenthetical' | 'dialogue' | 'action';
const STATES: State[] = ['slug', 'transition', 'character', 'parenthetical', 'dialogue', 'action'];

/** What the decoder needs to know about the language of scripts; the parser supplies it. */
export interface Evidence {
  isCaps(text: string): boolean;
  isHeading(text: string): boolean;
  /** `upper` is the line, upper-cased. */
  isTransition(upper: string): boolean;
  looksUncasedName(text: string, prevBlank: boolean, next: string): boolean;
  /** Seen as a speaker elsewhere in the script (or told to us by the project). */
  isKnownName(name: string): boolean;
  hasExtension(upper: string): boolean;
  /** The line opens with a name seen speaking, then a verb-like lowercase word ("Maya ducks."): narration about a character, not their speech. */
  opensWithKnownName?(text: string): boolean;
  /** A person said this name is not a character. */
  isRejectedName?(name: string): boolean;
}

export interface Observation {
  text: string; // trimmed
  kind: 'empty' | 'fixed' | 'free';
  /** For 'fixed': the type Fountain syntax already settled (never second-guessed). */
  fixed?: LineType;
  /** The previous raw line is blank (or there is none). */
  prevBlank: boolean;
  /** The next raw line, trimmed ('' if blank or none). */
  next: string;
}

/** The weights. Lower cost is a better fit. Tuned on the corpus (lib/scriptos/corpus); change one, re-measure. */
export interface Params {
  cue: number; knownName: number; rejectedName: number; extension: number; noSpeechUnder: number; cueSentence: number; cueLong: number;
  dialogue: number; dialogueCaps: number;
  action: number; actionProse: number; actionCaps: number; actionNamesSomeone: number;
  /** Grammar. */
  dialogueOutsideSpeech: number; parentheticalOutsideSpeech: number; parentheticalAfterParenthetical: number;
  cueAfterCue: number; cueAfterSpeechNoBlank: number; actionInsideSpeech: number;
  impossible: number;
  /** How sharply costs become certainty: lower is more decisive. */
  temperature: number;
}

export const DEFAULT_PARAMS: Params = {
  cue: 6, knownName: 12, rejectedName: 60, extension: 6, noSpeechUnder: 30, cueSentence: 25, cueLong: 15,
  dialogue: 4, dialogueCaps: 6,
  action: 10, actionProse: 8, actionCaps: 12, actionNamesSomeone: 5,
  dialogueOutsideSpeech: 45, parentheticalOutsideSpeech: 6, parentheticalAfterParenthetical: 10,
  cueAfterCue: 40, cueAfterSpeechNoBlank: 14, actionInsideSpeech: 16,
  impossible: 80,
  temperature: 3,
};

type Cls = State | 'empty' | 'other';

const hasLower = (t: string) => [...t].some((c) => c !== c.toUpperCase() && c === c.toLowerCase());

/**
 * A time card on a line of its own ("TWO HOURS LATER", "MOMENTS LATER", "THE NEXT MORNING", "MEANWHILE"): it
 * narrates, and it ends a speech. Matched on the whole line, so "SEE YOU LATER." shouted in dialogue is not one.
 */
export const TIME_CARD = /^(?:(?:AN?|\d+|[A-Z-]+) (?:SECONDS?|MINUTES?|HOURS?|DAYS?|WEEKS?|MONTHS?|YEARS?) (?:LATER|EARLIER|BEFORE|AFTER)|(?:MOMENTS|SECONDS|MINUTES|HOURS|DAYS|WEEKS|MONTHS|YEARS) (?:LATER|EARLIER)|LATER|EARLIER|MEANWHILE|SAME TIME|THE NEXT (?:DAY|MORNING|NIGHT|AFTERNOON|EVENING)|THAT NIGHT|THAT MORNING|CONTINUOUS|MOMENTS LATER)[.:]?$/;

/** How badly the line, alone, fits each label. */
export function emission(o: Observation, ev: Evidence, p: Params, tight = false): Record<State, number> {
  const t = o.text;
  const upper = t.toUpperCase();
  const heading = ev.isHeading(t);
  const isTransition = ev.isTransition(upper);
  const timeCard = TIME_CARD.test(upper.trim());
  const paren = t.startsWith('(') && t.endsWith(')');
  const namePart = t.replace(/\s*\([^)]*\)\s*$/, '').trim();
  const caps = ev.isCaps(namePart);
  const nameShape = (caps || ev.looksUncasedName(namePart, o.prevBlank || tight, o.next)) && namePart.length >= 1 && namePart.length < 60;
  const words = namePart.split(/\s+/).filter(Boolean).length;
  const sentenceEnd = /[.!?…]$/.test(namePart);

  const slug = heading ? 0 : p.impossible;
  const transition = isTransition ? 0 : (upper.endsWith(' TO:') && ev.isCaps(t) && t.length < 40 ? 4 : p.impossible);
  const parenthetical = paren ? 0 : (t.startsWith('(') ? 30 : p.impossible);

  let character = p.impossible;
  if (nameShape && !heading && !isTransition && !paren && !timeCard) {
    character = p.cue;
    if (ev.isKnownName(namePart)) character -= p.knownName;
    if (ev.hasExtension(upper)) character -= p.extension;
    if (ev.isRejectedName?.(namePart)) character += p.rejectedName;
    // Nothing under it, or a scene heading or transition under it: nobody can be speaking.
    if (!o.next || ev.isHeading(o.next) || ev.isTransition(o.next.toUpperCase())) character += p.noSpeechUnder;
    if (sentenceEnd) character += p.cueSentence;
    if (words > 6) character += p.cueLong;
  }

  const strong = heading || isTransition || paren;
  // A time card is narration, but "LATER." can also be the whole of someone's reply: so it is dearer as speech
  // rather than impossible, and the grammar decides (under a cue it stays speech; after a speech it ends it).
  const dialogue = strong ? p.impossible : p.dialogue + (ev.isCaps(t) ? p.dialogueCaps : 0) + (timeCard ? 4 : 0);

  let action = p.action;
  if (heading || isTransition) action = 40;
  else if (timeCard) action = 0;
  else if (hasLower(t)) action = p.actionProse - (ev.opensWithKnownName?.(t) ? p.actionNamesSomeone : 0);
  else if (ev.isCaps(t)) action = p.actionCaps;

  return { slug, transition, character, parenthetical, dialogue, action };
}

/** What it costs for a line labelled `s` to follow a line of class `prev`. */
function transitionCost(prev: Cls, s: State, p: Params): number {
  const inSpeech = prev === 'character' || prev === 'parenthetical' || prev === 'dialogue';
  switch (s) {
    case 'dialogue': return inSpeech ? 0 : p.dialogueOutsideSpeech;
    case 'parenthetical':
      if (prev === 'character') return 0;
      if (prev === 'dialogue') return 3;
      if (prev === 'parenthetical') return p.parentheticalAfterParenthetical;
      return p.parentheticalOutsideSpeech;
    case 'character':
      if (prev === 'character') return p.cueAfterCue;
      if (prev === 'dialogue' || prev === 'parenthetical') return p.cueAfterSpeechNoBlank;
      return 0;
    case 'action': return prev === 'character' || prev === 'parenthetical' ? p.actionInsideSpeech : 0;
    default: return 0;
  }
}

const fixedClass = (t: LineType | undefined): Cls =>
  t === 'character' ? 'character' : t === 'slug' ? 'slug' : t === 'transition' ? 'transition' : 'other';

export interface Decoded {
  /** The chosen label for each line; null where the line was not the decoder's to decide. */
  states: Array<State | null>;
  /** 0–100: how likely the chosen label is, over every labelling of the whole script (forward-backward on the same costs). A signal for ranking doubt, not a calibrated probability. */
  confidence: number[];
  /** The next most likely label at that line, when it is not negligible. */
  alternatives: Array<State | null>;
}

/**
 * The document profile (L3 of the plan), first piece: does this script separate its elements with blank lines at
 * all? Fountain asks for a blank line before a cue, so a caps line straight after a speech is read as more
 * speech. But a script pasted from another editor often has no blank lines anywhere, and there the missing blank
 * says nothing about whether a cue starts: judging every cue "without a blank" would punish the whole script.
 * So when blank lines are rare across the document, the cost of a cue right after a speech drops to nearly nothing
 * and the rest of the evidence (the name's shape, the extension, what follows) decides.
 */
export function documentProfile(obs: Observation[]): { tight: boolean; blankShare: number } {
  // The blank lines before the first and after the last element are not "between elements": a script that ends
  // with a newline has one synthetic empty line at the end, which must not count against a blank-free script.
  let from = 0;
  let to = obs.length;
  while (from < to && obs[from].kind === 'empty') from++;
  while (to > from && obs[to - 1].kind === 'empty') to--;
  const span = obs.slice(from, to);
  const free = span.filter((o) => o.kind !== 'empty').length;
  const blankShare = span.length ? (span.length - free) / span.length : 0;
  return { tight: free >= THRESHOLDS.profileMinElements.value && blankShare < THRESHOLDS.profileMaxBlankShare.value, blankShare };
}

export function decodeLabels(obs: Observation[], ev: Evidence, base: Params = DEFAULT_PARAMS): Decoded {
  const n = obs.length;
  const tight = documentProfile(obs).tight;
  const p: Params = tight ? { ...base, cueAfterSpeechNoBlank: Math.min(base.cueAfterSpeechNoBlank, THRESHOLDS.tightCueAfterSpeechNoBlank.value) } : base;
  const states: Array<State | null> = new Array(n).fill(null);
  const confidence: number[] = new Array(n).fill(100);
  const alternatives: Array<State | null> = new Array(n).fill(null);
  if (!n) return { states, confidence, alternatives };

  // Per position: the candidate (class, cost) pairs.
  type Cand = { cls: Cls; state: State | null; cost: number };
  const cands: Cand[][] = obs.map((o) => {
    if (o.kind === 'empty') return [{ cls: 'empty' as Cls, state: null, cost: 0 }];
    if (o.kind === 'fixed') return [{ cls: fixedClass(o.fixed), state: null, cost: 0 }];
    const e = emission(o, ev, p, tight);
    return STATES.map((s) => ({ cls: s as Cls, state: s, cost: e[s] }));
  });

  const dp: number[][] = cands.map((cs) => new Array(cs.length).fill(Infinity));
  const back: number[][] = cands.map((cs) => new Array(cs.length).fill(-1));
  cands[0].forEach((c, j) => { dp[0][j] = c.cost + (c.state ? transitionCost('empty', c.state, p) : 0); });
  for (let i = 1; i < n; i++) {
    cands[i].forEach((c, j) => {
      cands[i - 1].forEach((pc, k) => {
        const total = dp[i - 1][k] + c.cost + (c.state ? transitionCost(pc.cls, c.state, p) : 0);
        if (total < dp[i][j]) { dp[i][j] = total; back[i][j] = k; }
      });
    });
  }

  let j = dp[n - 1].indexOf(Math.min(...dp[n - 1]));
  for (let i = n - 1; i >= 0; i--) {
    states[i] = cands[i][j].state;
    j = back[i][j];
  }

  // How sure: the probability of each label at each line over ALL labellings, by the
  // forward-backward pass on the same costs (each cost c weighs exp(-c / T)).
  const T = p.temperature;
  const weight = (c: number) => Math.exp(-c / T);
  const norm = (xs: number[]) => { const t = xs.reduce((a, b) => a + b, 0) || 1; for (let k = 0; k < xs.length; k++) xs[k] /= t; };
  const alpha: number[][] = cands.map((cs) => new Array(cs.length).fill(0));
  const beta: number[][] = cands.map((cs) => new Array(cs.length).fill(1));
  cands[0].forEach((c, k) => { alpha[0][k] = weight(c.cost + (c.state ? transitionCost('empty', c.state, p) : 0)); });
  norm(alpha[0]);
  for (let i = 1; i < n; i++) {
    cands[i].forEach((c, k) => {
      let sum = 0;
      cands[i - 1].forEach((pc, m) => { sum += alpha[i - 1][m] * weight(c.cost + (c.state ? transitionCost(pc.cls, c.state, p) : 0)); });
      alpha[i][k] = sum;
    });
    norm(alpha[i]);
  }
  for (let i = n - 2; i >= 0; i--) {
    cands[i].forEach((pc, m) => {
      let sum = 0;
      cands[i + 1].forEach((c, k) => { sum += weight(c.cost + (c.state ? transitionCost(pc.cls, c.state, p) : 0)) * beta[i + 1][k]; });
      beta[i][m] = sum;
    });
    norm(beta[i]);
  }
  for (let i = 0; i < n; i++) {
    if (cands[i].length < 2) continue;
    const marginal = cands[i].map((_, k) => alpha[i][k] * beta[i][k]);
    norm(marginal);
    const order = marginal.map((m, k) => [m, k] as const).sort((x, y) => y[0] - x[0]);
    const chosen = cands[i].findIndex((c) => c.state === states[i]);
    confidence[i] = Math.round((marginal[chosen] ?? 0) * 100);
    const second = order.find(([, k]) => cands[i][k].state !== states[i]);
    alternatives[i] = second && second[0] > THRESHOLDS.alternativeMinShare.value ? cands[i][second[1]].state : null;
  }
  return { states, confidence, alternatives };
}
