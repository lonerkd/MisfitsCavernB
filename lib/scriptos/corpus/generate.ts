// A labelled screenplay generator. The brain (the parser and the importers)
// can only be improved as fast as it can be measured, and there is no public,
// legally usable corpus of labelled screenplays — so this makes them: seeded
// (the same seed is the same script), every element labelled with its true
// type, with the traps that real scripts set built in (caps shouting,
// hyphenated and accented names, numbered headings, transitions written four
// ways, sentences that begin like headings, caps action, parentheticals
// mid-speech). Deterministic and offline.

export type ElementType = 'slug' | 'action' | 'character' | 'dialogue' | 'parenthetical' | 'transition';

export interface Element {
  type: ElementType;
  text: string;
  /** Elements of one speech share a group, and have no blank line between them. */
  group: number | null;
}

/** How a script is written. Real scripts differ on exactly these things. */
export interface Style {
  /** Scene numbers on headings: none, "12 ", "12. " or "12A ". */
  headingNumbers: 'none' | 'plain' | 'dot' | 'letter';
  /** How a transition is punctuated: "CUT TO:", "CUT TO BLACK." or a bare "DISSOLVE TO". */
  transitions: 'colon' | 'period' | 'bare' | 'mixed';
  /** Chance (0–1) that a speech is shouted in capitals. */
  shouting: number;
  /** Chance (0–1) that a cue has an extension, "(V.O.)" or "(O.S.)". */
  extensions: number;
  /** Chance (0–1) that a name is hyphenated, accented or has an apostrophe. */
  oddNames: number;
  /** Chance (0–1) that a name is in a non-Latin script. */
  nonLatin: number;
  /** Chance (0–1) that an action line is a trap (reads like a heading, a cue or a title page). */
  traps: number;
  /** Chance (0–1) that a speech has a parenthetical, and one mid-speech. */
  parentheticals: number;
  scenes: number;
}

export const PLAIN: Style = { headingNumbers: 'none', transitions: 'colon', shouting: 0, extensions: 0.1, oddNames: 0, nonLatin: 0, traps: 0, parentheticals: 0.3, scenes: 6 };
export const REAL_WORLD: Style = { headingNumbers: 'plain', transitions: 'mixed', shouting: 0.15, extensions: 0.15, oddNames: 0.3, nonLatin: 0, traps: 0.15, parentheticals: 0.5, scenes: 8 };
export const INTERNATIONAL: Style = { ...REAL_WORLD, nonLatin: 0.3 };

/** One trait at a time, on an otherwise plain script: which trait breaks the read, and by how much. */
export const STRESS: Record<string, Style> = {
  dotNumbers: { ...PLAIN, headingNumbers: 'dot' },
  letterNumbers: { ...PLAIN, headingNumbers: 'letter' },
  periodTransitions: { ...PLAIN, transitions: 'period' },
  bareTransitions: { ...PLAIN, transitions: 'bare' },
  shouting: { ...PLAIN, shouting: 0.35 },
  oddNames: { ...PLAIN, oddNames: 0.6 },
  nonLatin: { ...PLAIN, nonLatin: 0.6 },
  extensions: { ...PLAIN, extensions: 0.5 },
  traps: { ...PLAIN, traps: 0.5 },
  parentheticals: { ...PLAIN, parentheticals: 0.9 },
};

/** A small seeded generator (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(next() * xs.length)];
  const chance = (p: number) => next() < p;
  return { next, pick, chance };
}

const PLAIN_NAMES = ['MAYA', 'LEO', 'IVY', 'NORA', 'JAMES', 'SAM', 'RILEY', 'THE DETECTIVE', 'OFFICER 2', 'DR. LEE'];
const ODD_NAMES = ['MARY-ANN', "O'BRIEN", 'JOSÉ', 'ÉLISE', 'JEAN-LUC', 'BJÖRK', "D'ARCY", 'ZOË'];
const NON_LATIN_NAMES = ['МАЙЯ', 'ИВАН', '美雅', '李伟', 'مايا', 'יעל'];
const PLACES = ['KITCHEN', 'HARBOR', 'LIGHTHOUSE', 'ROOFTOP', 'POLICE STATION', 'DINER', 'LAMP ROOM', "MAYA'S APARTMENT", 'CORRIDOR'];
const TIMES = ['DAY', 'NIGHT', 'MORNING', 'EVENING', 'DAWN', 'LATER', 'CONTINUOUS'];

const ACTION = [
  'Maya pours coffee. The kettle screams and the window rattles in the wind.',
  'Rain streaks the glass. A radio murmurs somewhere below.',
  'Leo checks his watch, then the door, then his watch again.',
  'Boats come in one by one, their lights swinging across the water.',
  'She crosses to the window and stands very still.',
  'A SEAGULL cries. The tide turns.',
  'The lamp flickers, steadies, and flickers again.',
  'They sit in silence while the clock ticks on the wall.',
];
const CAPS_ACTION = ['THE DOOR EXPLODES.', 'A GUNSHOT. THEN SILENCE.', 'THE LIGHTS DIE.', 'SMASH.', 'THE TRAIN ROARS PAST.'];
// Lines that LOOK like something else — the traps.
const TRAP_ACTION = [
  'Interior lights flicker on, one floor at a time.',
  'Exterior shots hold steady on the empty street.',
  'Into the room walks Maya, soaked to the skin.',
  'EXTRA MAN stumbles in, clutching a tray.',
  'Interesting choice, says nobody at all.',
  'A cold draft blows through the open door.',
  'Estimated arrival, the screen says. Eleven minutes.',
];
const SPEECH = [
  "You're late.", 'I waited up for you all night, you know.', 'Where were you?', 'Traffic.', 'We should go. Now.',
  'Hello, sailor!', "I didn't think you'd come.", 'Say that again.', 'It was a long night, and I would do it again.',
  'No. Not like this.', 'Of course. Of course you did.', 'Look at me.',
];
const SHOUT = ['STOP RIGHT THERE!', 'GET DOWN!', 'NO. NO. NO.', 'DON\'T MOVE!', 'NO!', 'RUN!'];
const PAREN = ['(quietly)', '(beat)', '(into phone)', '(to Leo)', '(laughing)', '(a long pause)'];
const MID_PAREN = ['(beat)', '(pause)', '(softer)', '(turning)'];
const EXTENSIONS = ['(V.O.)', '(O.S.)', "(CONT'D)", '(O.C.)'];

function slug(r: ReturnType<typeof rng>, style: Style, n: number): string {
  const num = style.headingNumbers === 'none' ? '' : style.headingNumbers === 'plain' ? `${n} ` : style.headingNumbers === 'dot' ? `${n}. ` : `${n}A `;
  const place = r.pick(PLACES);
  return `${num}${r.pick(['INT.', 'EXT.', 'INT./EXT.'])} ${place} - ${r.pick(TIMES)}`;
}

function transition(r: ReturnType<typeof rng>, style: Style): string {
  const base = r.pick(['CUT TO', 'DISSOLVE TO', 'SMASH CUT TO', 'MATCH CUT TO', 'FADE OUT', 'CUT TO BLACK']);
  const kind = style.transitions === 'mixed' ? r.pick(['colon', 'period', 'bare'] as const) : style.transitions;
  if (kind === 'colon') return `${base}:`;
  if (kind === 'period') return base.endsWith(' TO') ? `${base}:` : `${base}.`;
  return base;
}

/** The true structure of one script. */
export function generateScript(seed: number, style: Style = REAL_WORLD): Element[] {
  const r = rng(seed);
  const cast = Array.from(new Set(
    Array.from({ length: 3 + Math.floor(r.next() * 3) }, () =>
      r.chance(style.nonLatin) ? r.pick(NON_LATIN_NAMES) : r.chance(style.oddNames) ? r.pick(ODD_NAMES) : r.pick(PLAIN_NAMES)),
  ));
  const out: Element[] = [];
  let group = 0;
  for (let s = 1; s <= style.scenes; s++) {
    out.push({ type: 'slug', text: slug(r, style, s), group: null });
    const pieces = 2 + Math.floor(r.next() * 4);
    for (let p = 0; p < pieces; p++) {
      if (r.chance(0.35)) {
        out.push({ type: 'action', text: r.chance(style.traps) ? r.pick(TRAP_ACTION) : r.chance(style.traps) ? r.pick(CAPS_ACTION) : r.pick(ACTION), group: null });
        continue;
      }
      const who = r.pick(cast);
      const g = group++;
      const ext = r.chance(style.extensions) ? ` ${r.pick(EXTENSIONS)}` : '';
      out.push({ type: 'character', text: who + ext, group: g });
      if (r.chance(style.parentheticals)) out.push({ type: 'parenthetical', text: r.pick(PAREN), group: g });
      const shouted = r.chance(style.shouting);
      out.push({ type: 'dialogue', text: shouted ? r.pick(SHOUT) : r.pick(SPEECH), group: g });
      if (!shouted && r.chance(style.parentheticals * 0.5)) {
        out.push({ type: 'parenthetical', text: r.pick(MID_PAREN), group: g });
        out.push({ type: 'dialogue', text: r.pick(SPEECH), group: g });
      }
    }
    if (r.chance(0.5)) out.push({ type: 'transition', text: transition(r, style), group: null });
  }
  return out;
}
