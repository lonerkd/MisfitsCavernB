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
  uncasedCueMaxLength: {
    value: 24,
    what: 'the longest an unpunctuated line can be and still read as a cue in a script with no capitals (CJK, Arabic, Hebrew)',
  },
  prescanCueMaxLength: {
    value: 50,
    what: 'the cast pre-scan ignores a line this long or longer: it is too long to be a name',
  },
  prescanCueMaxWords: {
    value: 4,
    what: 'the most words a name can have in the cast pre-scan',
  },
  titlePageScanLines: {
    value: 50,
    what: 'a Fountain title page is looked for only in a script\'s first this many lines',
  },
  capsSlugMaxLength: {
    value: 60,
    what: 'an all-caps line shorter than this, in a format without screenplay cues (podcast, game, stage, outline) reads as a scene heading',
  },
  transitionToMaxLength: {
    value: 40,
    what: 'the longest an all-caps line ending in " TO:" can be and still be a transition',
  },
  evidenceCueMaxLength: {
    value: 60,
    what: 'the longest a cue\'s name part (without a trailing parenthetical) can be and still score as a character',
  },
  knownNameMaxWords: {
    value: 3,
    what: 'the most words of a speaking name looked for at the start of a line that may narrate ("Maya ducks.")',
  },
  seenOnceCueConfidenceCap: {
    value: 60,
    what: 'a cue whose name speaks only once is capped at this confidence, so the review asks about it',
  },
  slugPrefixScore: {
    value: 100,
    what: 'evidence score of a line that starts with a known scene prefix (INT., EXT.)',
  },
  slugDotScore: {
    value: 90,
    what: 'evidence score of a ".SHORTHAND" scene heading',
  },
  transitionExactScore: {
    value: 100,
    what: 'evidence score of a line that is exactly a known transition',
  },
  transitionToScore: {
    value: 85,
    what: 'evidence score of a short all-caps line ending in " TO:"',
  },
  parentheticalScore: {
    value: 90,
    what: 'evidence score of a line wrapped in parentheses',
  },
  parentheticalAfterCueScore: {
    value: 100,
    what: 'the parenthetical score when the line follows a character cue',
  },
  parentheticalInDialogueScore: {
    value: 80,
    what: 'the parenthetical score when the line follows dialogue (inside a speech)',
  },
  cueBaseScore: {
    value: 30,
    what: 'where a cue\'s evidence score starts, once the line has the shape of a name',
  },
  cuePrescanBonus: {
    value: 20,
    what: 'added to a cue\'s score when the name was found in the cast pre-scan',
  },
  cueExtensionBonus: {
    value: 50,
    what: 'added to a cue\'s score when it carries a character extension (V.O., O.S.)',
  },
  cueDialogueNextBonus: {
    value: 30,
    what: 'added to a cue\'s score when a line of likely dialogue follows',
  },
  cueAfterBlockBonus: {
    value: 10,
    what: 'added to a cue\'s score when it follows a blank line, a heading or action',
  },
  transitionBlocksCueAbove: {
    value: 50,
    what: 'a line whose transition score is above this cannot be a cue',
  },
  cameraCueScore: {
    value: 90,
    what: 'evidence score of a camera cue (it is kept as action)',
  },
  visualMovementScore: {
    value: 25,
    what: 'action evidence added by a movement verb',
  },
  visualViolentScore: {
    value: 35,
    what: 'action evidence added by a violent verb',
  },
  visualInteractionScore: {
    value: 20,
    what: 'action evidence added by an interaction verb',
  },
  visualSoundScore: {
    value: 30,
    what: 'action evidence added by a capitalised sound cue in a line that is not all caps',
  },
  actionBaseScore: {
    value: 20,
    what: 'the floor of every line\'s action score, added to what its verbs and sounds earn',
  },
  dialogueAfterCueScore: {
    value: 100,
    what: 'evidence score of a lowercase line straight after a cue or a parenthetical',
  },
  dialogueContinuationScore: {
    value: 95,
    what: 'evidence score of a lowercase line continuing a dialogue block',
  },
  pickSlugAt: {
    value: 90,
    what: 'a slug score at or above this decides the line is a scene heading',
  },
  pickTransitionAt: {
    value: 90,
    what: 'a transition score at or above this decides the line is a transition',
  },
  pickParentheticalAt: {
    value: 90,
    what: 'a parenthetical score at or above this decides the line is a parenthetical',
  },
  pickDialogueAt: {
    value: 95,
    what: 'a dialogue score at or above this decides the line is dialogue',
  },
  pickCharacterAt: {
    value: 60,
    what: 'a character score at or above this decides the line is a cue',
  },
  pickShotAt: {
    value: 90,
    what: 'a shot score at or above this decides the line is a camera direction',
  },
} as const satisfies Record<string, { value: number; what: string }>;
