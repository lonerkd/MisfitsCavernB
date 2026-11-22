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
  podcastBracketCueConfidence: {
    value: 90,
    what: 'a [bracketed] or (parenthesised) line in a podcast script reads as a production cue (parenthetical)',
  },
  podcastSpeakerConfidence: {
    value: 95,
    what: 'a "NAME: words" line in a podcast script reads as that speaker\'s dialogue',
  },
  podcastSegmentConfidence: {
    value: 85,
    what: 'an EPISODE / SEGMENT / INTRO line or short all-caps line in a podcast script reads as a segment header',
  },
  podcastAsideConfidence: {
    value: 50,
    what: 'any other podcast line reads as a show-note aside (action)',
  },
  videoOnScreenCueConfidence: {
    value: 90,
    what: 'a [bracketed] line in a video script reads as an on-screen cue (shot)',
  },
  videoDeliveryNoteConfidence: {
    value: 85,
    what: 'a (parenthesised) line in a video script reads as a delivery note',
  },
  videoSectionMarkerConfidence: {
    value: 90,
    what: 'a timecode line or a HOOK / INTRO / CHAPTER line in a video script reads as a section marker',
  },
  videoSpeakerConfidence: {
    value: 95,
    what: 'a "NAME: words" line in a video script reads as that speaker\'s dialogue',
  },
  videoSectionHeaderConfidence: {
    value: 80,
    what: 'a short all-caps line in a video script reads as a section header',
  },
  videoSpokenLineConfidence: {
    value: 70,
    what: 'any other line in a video script reads as spoken dialogue',
  },
  gameJumpConfidence: {
    value: 90,
    what: 'a "-> label" line in a game script reads as a jump to another node (transition)',
  },
  gameLogicConfidence: {
    value: 90,
    what: 'an [IF] / [SET] style line in a game script reads as logic (parenthetical)',
  },
  gameCueConfidence: {
    value: 85,
    what: 'any other [bracketed] line in a game script reads as a cue (shot)',
  },
  gameChoiceConfidence: {
    value: 90,
    what: 'a CHOICE / OPTION / bulleted line in a game script reads as the player\'s dialogue',
  },
  gamePartConfidence: {
    value: 90,
    what: 'an ACT / LEVEL / QUEST line in a game script reads as a part heading (slug)',
  },
  gameSpeakerConfidence: {
    value: 95,
    what: 'a "NAME: words" line in a game script reads as that speaker\'s dialogue',
  },
  gamePartHeaderConfidence: {
    value: 80,
    what: 'a short all-caps line in a game script reads as a part header',
  },
  gameNarrationConfidence: {
    value: 60,
    what: 'any other line in a game script reads as narration (action)',
  },
  proseNumberedHeadingConfidence: {
    value: 80,
    what: 'a numbered all-caps line in prose reads as a section heading',
  },
  proseHeadingConfidence: {
    value: 80,
    what: 'a short all-caps line in prose reads as a section heading',
  },
  prosePullQuoteConfidence: {
    value: 65,
    what: 'a line wrapped in quotation marks in prose reads as a pull quote (dialogue)',
  },
  proseParagraphConfidence: {
    value: 70,
    what: 'any other line in prose reads as paragraph text (action)',
  },
  outlineTimecodeConfidence: {
    value: 90,
    what: 'a timecoded line in a documentary outline reads as a segment marker',
  },
  outlineLabelConfidence: {
    value: 85,
    what: 'a B-ROLL / INTERVIEW / VO labelled line in a documentary outline reads as a segment marker',
  },
  outlineAttributedSoundbiteConfidence: {
    value: 90,
    what: 'a "NAME: quote" line in a documentary outline reads as an attributed soundbite (dialogue)',
  },
  outlineSoundbiteConfidence: {
    value: 70,
    what: 'a quoted line with no name in a documentary outline reads as a soundbite (dialogue)',
  },
  outlineBeatConfidence: {
    value: 50,
    what: 'any other line in a documentary outline reads as a beat description (action)',
  },
  treatmentHeaderConfidence: {
    value: 80,
    what: 'a short all-caps, # or SCENE / SHOT / BEAT line in a treatment reads as a section header',
  },
  treatmentQuoteConfidence: {
    value: 65,
    what: 'a quoted line in a treatment reads as a suggested line of dialogue',
  },
  treatmentProseConfidence: {
    value: 60,
    what: 'any other line in a treatment reads as prose (action)',
  },
  titlePageKeywordConfidence: {
    value: 100,
    what: 'a title-page line (Title:, Author:, Draft date:) in the first lines reads as the title page (the syntax spells it out, so it is never in doubt)',
  },
  proseHeadingMarkerConfidence: {
    value: 100,
    what: 'a "# " line in prose reads as a heading (the syntax spells it out, so it is never in doubt)',
  },
  forcedPageBreakConfidence: {
    value: 100,
    what: 'a line of three or more "=" is a page break (the syntax spells it out, so it is never in doubt)',
  },
  forcedNoteConfidence: {
    value: 100,
    what: 'a line wrapped in [[ ]] is a note (the syntax spells it out, so it is never in doubt)',
  },
  forcedSectionConfidence: {
    value: 100,
    what: 'a "# " line is a section (the syntax spells it out, so it is never in doubt)',
  },
  forcedSynopsisConfidence: {
    value: 100,
    what: 'a line led by a single "=" is a synopsis (the syntax spells it out, so it is never in doubt)',
  },
  forcedLyricConfidence: {
    value: 100,
    what: 'a line led by "~" is a lyric (the syntax spells it out, so it is never in doubt)',
  },
  forcedCenteredConfidence: {
    value: 100,
    what: 'a line wrapped in > < is centered text (the syntax spells it out, so it is never in doubt)',
  },
  forcedTransitionConfidence: {
    value: 100,
    what: 'a line led by ">" is a forced transition (the syntax spells it out, so it is never in doubt)',
  },
  forcedHeadingConfidence: {
    value: 100,
    what: 'a line led by a dot and a letter is a forced scene heading (the syntax spells it out, so it is never in doubt)',
  },
  forcedCharacterConfidence: {
    value: 100,
    what: 'a line led by "@" is a forced character cue (the syntax spells it out, so it is never in doubt)',
  },
  previousDraftMinConfidence: {
    value: 90,
    what: 'only the lines the previous draft was read at least this sure of (or a person settled) carry over as evidence; a doubtful line is a guess, and carrying a guess forward is the same guess twice',
  },
  previousDraftAgreeConfidence: {
    value: 80,
    what: 'a line read the same way as the previous draft read it (which was sure, or a person settled) is at least this sure, so the review does not ask about a line the earlier draft already answered',
  },
  knownPlaceHeadingConfidence: {
    value: 97,
    what: 'a scene heading set in a place the project knows (a Locations record) is at least this sure (the place is evidence; it never changes where scenes begin)',
  },
  knownPlaceUnmarkedConfidence: {
    value: 60,
    what: 'a caps "PLACE - TIME" line naming a place the project knows, read as action, is capped at this and offered as a scene heading missing INT./EXT. (the review asks; the reading is not changed)',
  },
  forcedActionConfidence: {
    value: 100,
    what: 'a line led by "!" is forced action (the syntax spells it out, so it is never in doubt)',
  },
} as const satisfies Record<string, { value: number; what: string }>;
