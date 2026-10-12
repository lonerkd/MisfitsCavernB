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
  action: number; actionProse: number; actionCaps: number;
  /** Grammar. */
  dialogueOutsideSpeech: number; parentheticalOutsideSpeech: number; parentheticalAfterParenthetical: number;
  cueAfterCue: number; cueAfterSpeechNoBlank: number; actionInsideSpeech: number;
  impossible: number;
}

export const DEFAULT_PARAMS: Params = {
  cue: 6, knownName: 12, rejectedName: 60, extension: 6, noSpeechUnder: 30, cueSentence: 25, cueLong: 15,
  dialogue: 4, dialogueCaps: 6,
  action: 10, actionProse: 8, actionCaps: 12,
  dialogueOutsideSpeech: 45, parentheticalOutsideSpeech: 6, parentheticalAfterParenthetical: 10,
  cueAfterCue: 40, cueAfterSpeechNoBlank: 14, actionInsideSpeech: 16,
  impossible: 80,
};

type Cls = State | 'empty' | 'other';

const hasLower = (t: string) => [...t].some((c) => c !== c.toUpperCase() && c === c.toLowerCase());

/** How badly the line, alone, fits each label. */
export function emission(o: Observation, ev: Evidence, p: Params): Record<State, number> {
  const t = o.text;
  const upper = t.toUpperCase();
  const heading = ev.isHeading(t);
  const isTransition = ev.isTransition(upper);
  const paren = t.startsWith('(') && t.endsWith(')');
  const namePart = t.replace(/\s*\([^)]*\)\s*$/, '').trim();
  const caps = ev.isCaps(namePart);
  const nameShape = (caps || ev.looksUncasedName(namePart, o.prevBlank, o.next)) && namePart.length >= 1 && namePart.length < 60;
  const words = namePart.split(/\s+/).filter(Boolean).length;
  const sentenceEnd = /[.!?…]$/.test(namePart);

  const slug = heading ? 0 : p.impossible;
  const transition = isTransition ? 0 : (upper.endsWith(' TO:') && ev.isCaps(t) && t.length < 40 ? 4 : p.impossible);
  const parenthetical = paren ? 0 : (t.startsWith('(') ? 30 : p.impossible);

  let character = p.impossible;
  if (nameShape && !heading && !isTransition && !paren) {
    character = p.cue;
    if (ev.isKnownName(namePart)) character -= p.knownName;
    if (ev.hasExtension(upper)) character -= p.extension;
    if (ev.isRejectedName?.(namePart)) character += p.rejectedName;
    if (!o.next) character += p.noSpeechUnder;
    if (sentenceEnd) character += p.cueSentence;
    if (words > 6) character += p.cueLong;
  }

  const strong = heading || isTransition || paren;
  const dialogue = strong ? p.impossible : p.dialogue + (ev.isCaps(t) ? p.dialogueCaps : 0);

  let action = p.action;
  if (heading || isTransition) action = 40;
  else if (hasLower(t)) action = p.actionProse;
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
  /** 0–100: how far the chosen label beat the next best one at that line, given the lines before. */
  confidence: number[];
}

export function decodeLabels(obs: Observation[], ev: Evidence, p: Params = DEFAULT_PARAMS): Decoded {
  const n = obs.length;
  const states: Array<State | null> = new Array(n).fill(null);
  const confidence: number[] = new Array(n).fill(100);
  if (!n) return { states, confidence };

  // Per position: the candidate (class, cost) pairs.
  type Cand = { cls: Cls; state: State | null; cost: number };
  const cands: Cand[][] = obs.map((o) => {
    if (o.kind === 'empty') return [{ cls: 'empty' as Cls, state: null, cost: 0 }];
    if (o.kind === 'fixed') return [{ cls: fixedClass(o.fixed), state: null, cost: 0 }];
    const e = emission(o, ev, p);
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
    if (cands[i].length > 1) {
      const sorted = [...dp[i]].sort((a, b) => a - b);
      const margin = (sorted[1] ?? sorted[0] + 40) - sorted[0];
      confidence[i] = Math.max(40, Math.min(100, Math.round(50 + margin)));
    }
    j = back[i][j];
  }
  return { states, confidence };
}
