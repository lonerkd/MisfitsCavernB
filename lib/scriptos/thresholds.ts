// The reader's own cut-off numbers, named and described in one place so they can be read, listed in the generated
// parser reference, and changed deliberately (change one, re-measure on the corpus). Pure.

export const THRESHOLDS = {
  profileMinElements: {
    value: 10,
    what: 'a script needs at least this many non-blank lines before its blank-line habit is judged at all',
  },
  profileMaxBlankShare: {
    value: 0.05,
    what: 'below this share of blank lines the script is "tight" (it does not separate elements with blank lines)',
  },
  tightCueAfterSpeechNoBlank: {
    value: 4,
    what: 'in a tight script the cost of a cue straight after speech with no blank line is capped at this (the missing blank says nothing)',
  },
  alternativeMinShare: {
    value: 0.02,
    what: 'a second reading of a line is offered only when it holds more than this share of the probability',
  },
  titleCaseCueMaxLength: {
    value: 28,
    what: 'the longest a Title Case line can be and still be considered a speaker\'s name (scripts that do not capitalise cues)',
  },
  titleCaseCueMinHeads: {
    value: 2,
    what: 'a Title Case name must head at least this many blocks before it is accepted as a cue (or sit between two that recur)',
  },
} as const satisfies Record<string, { value: number; what: string }>;
