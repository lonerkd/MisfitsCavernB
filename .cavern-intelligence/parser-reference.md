# The parser reference

> **Generated** by `npm run parser:reference` from the code in `lib/scriptos/` — never edit by hand. `lib/scriptos/reference.test.ts` fails when this file is stale. How the engine works: [`scriptos-engine.md`](scriptos-engine.md).

## Word lists (`KNOWLEDGE`, `lib/scriptos/parser.ts`)

### SCENE_PREFIXES (22)

`AERIAL` · `E/I` · `EST.` · `ESTABLISHING` · `EXT` · `EXT ` · `EXT-` · `EXT.` · `EXT./INT.` · `EXT/INT` · `EXTERIOR` · `I/E` · `INT` · `INT ` · `INT-` · `INT.` · `INT./EXT.` · `INT/EXT` · `INTERIOR` · `ON SCREEN` · `SPACE` · `UNDERWATER`

### TIME_OF_DAY (27)

`AFTERNOON` · `CONTINUOUS` · `DAWN` · `DAY` · `DAYDREAM` · `DREAM SEQUENCE` · `DUSK` · `EARLY MORNING` · `EVENING` · `FLASHBACK` · `FUTURE` · `LATE NIGHT` · `LATER` · `MAGIC HOUR` · `MIDNIGHT` · `MOMENTS LATER` · `MORNING` · `NIGHT` · `NIGHTMARE` · `NOON` · `PAST` · `PRESENT` · `SAME` · `SAME TIME` · `SIMULTANEOUS` · `SUNRISE` · `SUNSET`

### TRANSITIONS (24)

`BACK TO:` · `BLACKOUT` · `CROSSFADE TO:` · `CUT TO` · `CUT TO:` · `DISSOLVE TO:` · `FADE IN` · `FADE IN:` · `FADE OUT` · `FADE OUT:` · `FADE TO BLACK.` · `HARD CUT TO:` · `INTERCUT:` · `IRIS IN:` · `IRIS OUT:` · `JUMP CUT TO:` · `MATCH CUT TO:` · `MORPH TO:` · `QUICK CUT:` · `RESET TO:` · `SLAM TO BLACK` · `SMASH CUT TO:` · `TIME CUT:` · `WIPE TO:`

### TRANSITION_BARE (30)

`BACK TO` · `BLACKOUT` · `CROSSFADE TO` · `CUT TO` · `CUT TO BLACK` · `DISSOLVE` · `DISSOLVE TO` · `FADE IN` · `FADE OUT` · `FADE TO` · `FADE TO BLACK` · `FINAL FADE OUT` · `FLASH CUT` · `FLASH CUT TO` · `HARD CUT TO` · `INTERCUT` · `IRIS IN` · `IRIS OUT` · `JUMP CUT` · `JUMP CUT TO` · `MATCH CUT` · `MATCH CUT TO` · `MORPH TO` · `QUICK CUT` · `RESET TO` · `SLAM TO BLACK` · `SMASH CUT` · `SMASH CUT TO` · `TIME CUT` · `WIPE TO`

### CAMERA_ANGLES (31)

`AERIAL SHOT` · `ANGLE ON` · `C.U.` · `CHYRON:` · `CLOSE UP` · `CRANE SHOT` · `CREDIT:` · `DOLLY IN` · `DOLLY OUT` · `ECU` · `INSERT` · `MCU` · `PAN TO` · `POV` · `PULL BACK` · `PUSH IN` · `REVEAL` · `SFX:` · `STOCK FOOTAGE` · `SUPER:` · `THE CAMERA` · `TILT DOWN` · `TILT UP` · `TITLE CARD:` · `TRACKING SHOT` · `VFX:` · `WE SEE` · `WHIP PAN` · `XCU` · `ZOOM IN` · `ZOOM OUT`

### EXTENSIONS (15)

`CONT'D` · `DISEMBODIED` · `ELECTRONIC` · `FILTERED` · `INTO PHONE` · `O.C.` · `O.S.` · `OFF SCREEN` · `ON RADIO` · `PRE-LAP` · `ROBOTIC` · `SUBTITLE` · `THROUGH PHONE` · `V.O.` · `VOICE OVER`

### VERBS_MOVEMENT (22)

`BOLTS` · `CLIMBS` · `CRAWLS` · `DARTS` · `DRIVES` · `FALLS` · `FLIES` · `JUMPS` · `LANDS` · `LEAPS` · `MARCHES` · `PACES` · `RIDES` · `RUNS` · `RUSHES` · `SAILS` · `SLIDES` · `SPRINTS` · `STRIDES` · `STUMBLES` · `TRIPS` · `WALKS`

### VERBS_VIOLENT (22)

`ATTACKS` · `BASHES` · `BREAKS` · `BURNS` · `CHOKES` · `CRUSHES` · `EXPLODES` · `FIRES` · `GRABS` · `HITS` · `KICKS` · `KILLS` · `LUNGES` · `PUNCHES` · `SCREAMS` · `SHOOTS` · `SHOUTS` · `SLAPS` · `SMASHES` · `STABS` · `STRIKES` · `YELLS`

### VERBS_PASSIVE (20)

`FROWNS` · `GLANCES` · `HEARS` · `LISTENS` · `LOOKS` · `NODS` · `NOTICES` · `PEERS` · `SHAKES` · `SHRUGS` · `SIGHS` · `SITS` · `SLEEPS` · `SMILES` · `SPOTS` · `STANDS` · `STARES` · `WAITS` · `WAKES` · `WATCHES`

### VERBS_INTERACTION (22)

`CARRIES` · `CATCHES` · `CLOSES` · `DRINKS` · `DROPS` · `EATS` · `GIVES` · `HANDS` · `HOLDS` · `KNOCKS` · `LOCKS` · `OPENS` · `PICKS` · `PULLS` · `PUSHES` · `READS` · `TAKES` · `THROWS` · `TOUCHES` · `TYPES` · `UNLOCKS` · `WRITES`

### SOUNDS (38)

`BANG` · `BARK` · `BEEP` · `BOOM` · `BUZZ` · `CHIRP` · `CLICK` · `CRACK` · `CRASH` · `DRIP` · `EXPLOSION` · `FOOTSTEPS` · `GUNSHOT` · `GURGLE` · `HISS` · `HOWL` · `HUM` · `KNOCK` · `MEOW` · `NOISE` · `POP` · `QUIET` · `RING` · `ROAR` · `RUMBLE` · `SCREAM` · `SCREECH` · `SILENCE` · `SIZZLE` · `SLAM` · `SNAP` · `SPLASH` · `SPLAT` · `SQUISH` · `THUD` · `THUNDER` · `WHIR` · `WHISTLE`

### PROPS (38)

`BACKPACK` · `BAG` · `BOOK` · `BOTTLE` · `BRIEFCASE` · `CELLPHONE` · `CIGAR` · `CIGARETTE` · `COMPUTER` · `CUP` · `DOCUMENT` · `FILE` · `FLASHLIGHT` · `FOLDER` · `GLASS` · `GUN` · `KEYS` · `KNIFE` · `LAPTOP` · `LIGHTER` · `MAGAZINE` · `MUG` · `NECKLACE` · `NEWSPAPER` · `PAPER` · `PEN` · `PENCIL` · `PHONE` · `PISTOL` · `RIFLE` · `RING` · `SMARTPHONE` · `SUITCASE` · `SWORD` · `TORCH` · `WALLET` · `WATCH` · `WEAPON`

### WARDROBE (29)

`ARMOR` · `BOOTS` · `CAP` · `COAT` · `DRESS` · `GLASSES` · `GLOVES` · `GOWN` · `HAT` · `HEELS` · `HELMET` · `HOODIE` · `JACKET` · `JEANS` · `MASK` · `PANTS` · `SHIRT` · `SHOES` · `SHORTS` · `SKIRT` · `SNEAKERS` · `SUIT` · `SUNGLASSES` · `SWEATER` · `T-SHIRT` · `TRENCHCOAT` · `TROUSERS` · `TUXEDO` · `UNIFORM`

### VEHICLES (22)

`AIRPLANE` · `AMBULANCE` · `BICYCLE` · `BIKE` · `BOAT` · `BUS` · `CAB` · `CAR` · `HELICOPTER` · `JET` · `MOTORCYCLE` · `PLANE` · `POLICE CAR` · `SHIP` · `SPACESHIP` · `SUBWAY` · `SUV` · `TAXI` · `TRAIN` · `TRUCK` · `VAN` · `YACHT`

### VFX (15)

`BEAM` · `BLAST` · `BLOOD` · `BULLET` · `CRASH` · `EXPLOSION` · `FIRE` · `GLOW` · `HOLOGRAM` · `LASER` · `MAGIC` · `SHATTER` · `SMOKE` · `SPARKS` · `WOUND`

### BREAKDOWN_STOPWORDS (110)

Words the breakdown ignores when it suggests elements from action lines (`lib/scriptos/parser.ts`):

`A` · `ACROSS` · `AFTER` · `AGAINST` · `ALL` · `ALONG` · `AN` · `AND` · `ANGLE` · `ANY` · `ARE` · `AROUND` · `AS` · `AT` · `BACK` · `BE` · `BEFORE` · `BETWEEN` · `BEYOND` · `BUT` · `BY` · `CAN` · `CARD` · `CHYRON` · `CLOSE` · `CONTINUOUS` · `COULD` · `DAY` · `DID` · `DO` · `DOES` · `DOWN` · `EVERY` · `EXT` · `FINALLY` · `FOR` · `FROM` · `HAD` · `HAS` · `HAVE` · `HE` · `HER` · `HERE` · `HIS` · `HOLD` · `I` · `IN` · `INSERT` · `INT` · `INTO` · `IS` · `IT` · `JUST` · `LATER` · `MAY` · `MIGHT` · `MORE` · `MUST` · `MY` · `NIGHT` · `NO` · `NOT` · `NOW` · `OF` · `OFF` · `ON` · `ONLY` · `OR` · `OUR` · `OUT` · `OVER` · `POV` · `QUICKLY` · `SHALL` · `SHE` · `SLOWLY` · `SOME` · `SOON` · `STILL` · `SUDDENLY` · `SUPER` · `THAT` · `THE` · `THEIR` · `THEM` · `THEN` · `THERE` · `THESE` · `THEY` · `THIS` · `THOSE` · `THROUGH` · `TITLE` · `TO` · `UNDER` · `UP` · `WAS` · `WE` · `WERE` · `WHAT` · `WHEN` · `WHERE` · `WHILE` · `WHO` · `WILL` · `WITH` · `WOULD` · `YES` · `YOU` · `YOUR`

## Heading vocabulary (`lib/scriptos/heading.ts`)

### TIMES (60)

`ABEND` · `AFTERNOON` · `ALBA` · `AMANECER` · `AMANHECER` · `ANOCHECER` · `APRES-MIDI` · `APRÈS-MIDI` · `ATARDECER` · `AUBE` · `CRÉPUSCULE` · `DAWN` · `DAY` · `DIA` · `DUSK` · `DÄMMERUNG` · `DÍA` · `EARLY MORNING` · `ENTARDECER` · `EVENING` · `FIM DE TARDE` · `GIORNO` · `JOUR` · `LATE NIGHT` · `MADRUGADA` · `MAGIC HOUR` · `MANHÃ` · `MATIN` · `MATINÉE` · `MATTINA` · `MAÑANA` · `MEDIANOCHE` · `MEDIODÍA` · `MEZZANOTTE` · `MIDI` · `MIDNIGHT` · `MINUIT` · `MITTAG` · `MITTERNACHT` · `MORGEN` · `MORNING` · `NACHMITTAG` · `NACHT` · `NIGHT` · `NOCHE` · `NOITE` · `NOON` · `NOTTE` · `NUIT` · `POMERIGGIO` · `SERA` · `SOIR` · `SOIRÉE` · `SUNRISE` · `SUNSET` · `TAG` · `TARDE` · `TRAMONTO` · `TWILIGHT` · `VORMITTAG`

### FILLER (52)

`A` · `AFTER` · `AN` · `ANOTHER` · `AT` · `BEFORE` · `CONT'D` · `CONTINUOUS` · `DAYDREAM` · `DAYS` · `DREAM SEQUENCE` · `EARLIER` · `EARLY` · `FLASHBACK` · `FOLLOWING` · `FUTURE` · `HOUR` · `HOURS` · `IN` · `LATE` · `LATER` · `LATER STILL` · `MEANWHILE` · `MINUTE` · `MINUTES` · `MOMENTS` · `MONTH` · `MONTHS` · `NEXT` · `NIGHTMARE` · `OF` · `ON` · `PAST` · `PRESENT` · `PREVIOUS` · `SAME` · `SECOND` · `SECONDS` · `SIMULTANEOUS` · `SOON` · `THAT` · `THAT WEEK` · `THE` · `THEN` · `THIS` · `TIME` · `TO` · `VARIOUS` · `WEEK` · `WEEKS` · `YEAR` · `YEARS`

### NUMBER_WORDS (18)

`A` · `AM` · `EIGHT` · `ELEVEN` · `FEW` · `FIVE` · `FOUR` · `MANY` · `NINE` · `ONE` · `PM` · `SEVEN` · `SEVERAL` · `SIX` · `TEN` · `THREE` · `TWELVE` · `TWO`

### MONTHS (17)

`APRIL` · `AUGUST` · `AUTUMN` · `DECEMBER` · `FALL` · `FEBRUARY` · `JANUARY` · `JULY` · `JUNE` · `MARCH` · `MAY` · `NOVEMBER` · `OCTOBER` · `SEPTEMBER` · `SPRING` · `SUMMER` · `WINTER`

### DAYS_OF_WEEK (7)

`FRIDAY` · `MONDAY` · `SATURDAY` · `SUNDAY` · `THURSDAY` · `TUESDAY` · `WEDNESDAY`

### Patterns

- `FRAME_TAG` — layers of a story told in layers: `/^(PART|CHAPTER|ACT|HOUR|REEL|TAPE|SEGMENT)\s+([A-Z]+|\d+)(\s*,\s*[A-Z][A-Z ]*)?$/i`
- `YEAR` — a year or a decade in a heading: `/\b(1[0-9]{3}|20[0-9]{2})(?:'?s)?\b/g`
- `CLOCK` — a clock time standing in for a time of day: `/^\d{1,2}[:.]\d{2}$/`

## Patterns in the reader

- `TRANSITION_TO_COLOUR` (`parser.ts`) — a transition written without its colon: `/^(?:(?:SLOW|QUICK|SMASH|MATCH|JUMP|HARD|FLASH|CROSS|FINAL)[ -]){0,2}(?:CUT|DISSOLVE|FADE|WIPE|IRIS)(?: TO)? (?:BLACK|WHITE)$/`
- `TIME_CARD` (`decode.ts`) — a time card that narrates and ends a speech ("TWO HOURS LATER"): `/^(?:(?:AN?|\d+|[A-Z-]+) (?:SECONDS?|MINUTES?|HOURS?|DAYS?|WEEKS?|MONTHS?|YEARS?) (?:LATER|EARLIER|BEFORE|AFTER)|(?:MOMENTS|SECONDS|MINUTES|HOURS|DAYS|WEEKS|MONTHS|YEARS) (?:LATER|EARLIER)|LATER|EARLIER|MEANWHILE|SAME TIME|THE NEXT (?:DAY|MORNING|NIGHT|AFTERNOON|EVENING)|THAT NIGHT|THAT MORNING|CONTINUOUS|MOMENTS LATER)[.:]?$/`

## Languages (`lib/scriptos/languages.ts`)

Names are read from the platform's own language table (`Intl.DisplayNames`); `SYNONYMS` adds what that table lacks (25 entries):

`african american vernacular english` → English · `american sign language` → Sign language · `asl` → Sign language · `british sign language` → Sign language · `bsl` → Sign language · `cantonese` → Cantonese · `chinese` → Chinese · `cockney` → English · `creole` → Haitian Creole · `farsi` → Persian · `filipino` → Filipino · `gaelic` → Gaelic · `haitian` → Haitian Creole · `haitian creole` → Haitian Creole · `kreyol` → Haitian Creole · `kreyòl` → Haitian Creole · `mandarin` → Mandarin Chinese · `mandarin chinese` → Mandarin Chinese · `patois` → Patois · `pidgin` → Pidgin · `scottish gaelic` → Gaelic · `sign language` → Sign language · `signing` → Sign language · `spanglish` → Spanglish · `tagalog` → Filipino

A language is named after a verb phrase: `/\b(?:in|speaking|speaks|spoken in|sings in|singing in|says in|reads in|replies in|answers in|switches to|into|translated from)\s+([\p{L}][\p{L}' -]*)$/iu`

## Thresholds (`lib/scriptos/thresholds.ts`)

The reader's own cut-off numbers: the document profile, the offer of a second reading, and the Title Case cue scan.

| Threshold | Value | What it decides |
| --- | ---: | --- |
| `profileMinElements` | 10 | a script needs at least this many non-blank lines before its blank-line habit is judged at all |
| `profileMaxBlankShare` | 0.05 | below this share of blank lines the script is "tight" (it does not separate elements with blank lines) |
| `tightCueAfterSpeechNoBlank` | 4 | in a tight script the cost of a cue straight after speech with no blank line is capped at this (the missing blank says nothing) |
| `alternativeMinShare` | 0.02 | a second reading of a line is offered only when it holds more than this share of the probability |
| `titleCaseCueMaxLength` | 28 | the longest a Title Case line can be and still be considered a speaker's name (scripts that do not capitalise cues) |
| `titleCaseCueMinHeads` | 2 | a Title Case name must head at least this many blocks before it is accepted as a cue (or sit between two that recur) |
| `uncasedCueMaxLength` | 24 | the longest an unpunctuated line can be and still read as a cue in a script with no capitals (CJK, Arabic, Hebrew) |
| `prescanCueMaxLength` | 50 | the cast pre-scan ignores a line this long or longer: it is too long to be a name |
| `prescanCueMaxWords` | 4 | the most words a name can have in the cast pre-scan |
| `titlePageScanLines` | 50 | a Fountain title page is looked for only in a script's first this many lines |
| `capsSlugMaxLength` | 60 | an all-caps line shorter than this, in a format without screenplay cues (podcast, game, stage, outline) reads as a scene heading |
| `transitionToMaxLength` | 40 | the longest an all-caps line ending in " TO:" can be and still be a transition |
| `evidenceCueMaxLength` | 60 | the longest a cue's name part (without a trailing parenthetical) can be and still score as a character |
| `knownNameMaxWords` | 3 | the most words of a speaking name looked for at the start of a line that may narrate ("Maya ducks.") |
| `seenOnceCueConfidenceCap` | 60 | a cue whose name speaks only once is capped at this confidence, so the review asks about it |
| `slugPrefixScore` | 100 | evidence score of a line that starts with a known scene prefix (INT., EXT.) |
| `slugDotScore` | 90 | evidence score of a ".SHORTHAND" scene heading |
| `transitionExactScore` | 100 | evidence score of a line that is exactly a known transition |
| `transitionToScore` | 85 | evidence score of a short all-caps line ending in " TO:" |
| `parentheticalScore` | 90 | evidence score of a line wrapped in parentheses |
| `parentheticalAfterCueScore` | 100 | the parenthetical score when the line follows a character cue |
| `parentheticalInDialogueScore` | 80 | the parenthetical score when the line follows dialogue (inside a speech) |
| `cueBaseScore` | 30 | where a cue's evidence score starts, once the line has the shape of a name |
| `cuePrescanBonus` | 20 | added to a cue's score when the name was found in the cast pre-scan |
| `cueExtensionBonus` | 50 | added to a cue's score when it carries a character extension (V.O., O.S.) |
| `cueDialogueNextBonus` | 30 | added to a cue's score when a line of likely dialogue follows |
| `cueAfterBlockBonus` | 10 | added to a cue's score when it follows a blank line, a heading or action |
| `transitionBlocksCueAbove` | 50 | a line whose transition score is above this cannot be a cue |
| `cameraCueScore` | 90 | evidence score of a camera cue (it is kept as action) |
| `visualMovementScore` | 25 | action evidence added by a movement verb |
| `visualViolentScore` | 35 | action evidence added by a violent verb |
| `visualInteractionScore` | 20 | action evidence added by an interaction verb |
| `visualSoundScore` | 30 | action evidence added by a capitalised sound cue in a line that is not all caps |
| `actionBaseScore` | 20 | the floor of every line's action score, added to what its verbs and sounds earn |
| `dialogueAfterCueScore` | 100 | evidence score of a lowercase line straight after a cue or a parenthetical |
| `dialogueContinuationScore` | 95 | evidence score of a lowercase line continuing a dialogue block |
| `pickSlugAt` | 90 | a slug score at or above this decides the line is a scene heading |
| `pickTransitionAt` | 90 | a transition score at or above this decides the line is a transition |
| `pickParentheticalAt` | 90 | a parenthetical score at or above this decides the line is a parenthetical |
| `pickDialogueAt` | 95 | a dialogue score at or above this decides the line is dialogue |
| `pickCharacterAt` | 60 | a character score at or above this decides the line is a cue |
| `pickShotAt` | 90 | a shot score at or above this decides the line is a camera direction |
| `podcastBracketCueConfidence` | 90 | a [bracketed] or (parenthesised) line in a podcast script reads as a production cue (parenthetical) |
| `podcastSpeakerConfidence` | 95 | a "NAME: words" line in a podcast script reads as that speaker's dialogue |
| `podcastSegmentConfidence` | 85 | an EPISODE / SEGMENT / INTRO line or short all-caps line in a podcast script reads as a segment header |
| `podcastAsideConfidence` | 50 | any other podcast line reads as a show-note aside (action) |
| `videoOnScreenCueConfidence` | 90 | a [bracketed] line in a video script reads as an on-screen cue (shot) |
| `videoDeliveryNoteConfidence` | 85 | a (parenthesised) line in a video script reads as a delivery note |
| `videoSectionMarkerConfidence` | 90 | a timecode line or a HOOK / INTRO / CHAPTER line in a video script reads as a section marker |
| `videoSpeakerConfidence` | 95 | a "NAME: words" line in a video script reads as that speaker's dialogue |
| `videoSectionHeaderConfidence` | 80 | a short all-caps line in a video script reads as a section header |
| `videoSpokenLineConfidence` | 70 | any other line in a video script reads as spoken dialogue |
| `gameJumpConfidence` | 90 | a "-> label" line in a game script reads as a jump to another node (transition) |
| `gameLogicConfidence` | 90 | an [IF] / [SET] style line in a game script reads as logic (parenthetical) |
| `gameCueConfidence` | 85 | any other [bracketed] line in a game script reads as a cue (shot) |
| `gameChoiceConfidence` | 90 | a CHOICE / OPTION / bulleted line in a game script reads as the player's dialogue |
| `gamePartConfidence` | 90 | an ACT / LEVEL / QUEST line in a game script reads as a part heading (slug) |
| `gameSpeakerConfidence` | 95 | a "NAME: words" line in a game script reads as that speaker's dialogue |
| `gamePartHeaderConfidence` | 80 | a short all-caps line in a game script reads as a part header |
| `gameNarrationConfidence` | 60 | any other line in a game script reads as narration (action) |
| `proseNumberedHeadingConfidence` | 80 | a numbered all-caps line in prose reads as a section heading |
| `proseHeadingConfidence` | 80 | a short all-caps line in prose reads as a section heading |
| `prosePullQuoteConfidence` | 65 | a line wrapped in quotation marks in prose reads as a pull quote (dialogue) |
| `proseParagraphConfidence` | 70 | any other line in prose reads as paragraph text (action) |
| `outlineTimecodeConfidence` | 90 | a timecoded line in a documentary outline reads as a segment marker |
| `outlineLabelConfidence` | 85 | a B-ROLL / INTERVIEW / VO labelled line in a documentary outline reads as a segment marker |
| `outlineAttributedSoundbiteConfidence` | 90 | a "NAME: quote" line in a documentary outline reads as an attributed soundbite (dialogue) |
| `outlineSoundbiteConfidence` | 70 | a quoted line with no name in a documentary outline reads as a soundbite (dialogue) |
| `outlineBeatConfidence` | 50 | any other line in a documentary outline reads as a beat description (action) |
| `treatmentHeaderConfidence` | 80 | a short all-caps, # or SCENE / SHOT / BEAT line in a treatment reads as a section header |
| `treatmentQuoteConfidence` | 65 | a quoted line in a treatment reads as a suggested line of dialogue |
| `treatmentProseConfidence` | 60 | any other line in a treatment reads as prose (action) |
| `titlePageKeywordConfidence` | 100 | a title-page line (Title:, Author:, Draft date:) in the first lines reads as the title page (the syntax spells it out, so it is never in doubt) |
| `proseHeadingMarkerConfidence` | 100 | a "# " line in prose reads as a heading (the syntax spells it out, so it is never in doubt) |
| `forcedPageBreakConfidence` | 100 | a line of three or more "=" is a page break (the syntax spells it out, so it is never in doubt) |
| `forcedNoteConfidence` | 100 | a line wrapped in [[ ]] is a note (the syntax spells it out, so it is never in doubt) |
| `forcedSectionConfidence` | 100 | a "# " line is a section (the syntax spells it out, so it is never in doubt) |
| `forcedSynopsisConfidence` | 100 | a line led by a single "=" is a synopsis (the syntax spells it out, so it is never in doubt) |
| `forcedLyricConfidence` | 100 | a line led by "~" is a lyric (the syntax spells it out, so it is never in doubt) |
| `forcedCenteredConfidence` | 100 | a line wrapped in > < is centered text (the syntax spells it out, so it is never in doubt) |
| `forcedTransitionConfidence` | 100 | a line led by ">" is a forced transition (the syntax spells it out, so it is never in doubt) |
| `forcedHeadingConfidence` | 100 | a line led by a dot and a letter is a forced scene heading (the syntax spells it out, so it is never in doubt) |
| `forcedCharacterConfidence` | 100 | a line led by "@" is a forced character cue (the syntax spells it out, so it is never in doubt) |
| `previousDraftMinConfidence` | 90 | only the lines the previous draft was read at least this sure of (or a person settled) carry over as evidence; a doubtful line is a guess, and carrying a guess forward is the same guess twice |
| `previousDraftAgreeConfidence` | 80 | a line read the same way as the previous draft read it (which was sure, or a person settled) is at least this sure, so the review does not ask about a line the earlier draft already answered |
| `knownPlaceHeadingConfidence` | 97 | a scene heading set in a place the project knows (a Locations record) is at least this sure (the place is evidence; it never changes where scenes begin) |
| `knownPlaceUnmarkedConfidence` | 60 | a caps "PLACE - TIME" line naming a place the project knows, read as action, is capped at this and offered as a scene heading missing INT./EXT. (the review asks; the reading is not changed) |
| `suiteThingOutweighedHeads` | 3 | a name the breakdown lists as a thing (a prop, a costume, a vehicle) that heads speech at least this many times is read as a speaker after all: the script outweighs the prior, and the reading says the two disagree |
| `suiteDisagreeConfidenceCap` | 70 | a cue whose name the breakdown lists as a thing is capped at this, so the review asks a person to settle which it is |
| `forcedActionConfidence` | 100 | a line led by "!" is forced action (the syntax spells it out, so it is never in doubt) |

## Decoder weights (`DEFAULT_PARAMS`, `lib/scriptos/decode.ts`)

Costs: lower is a better fit. Tuned on the corpus (`lib/scriptos/corpus`); change one, re-measure (`npm run test` runs the ratchet).

| Weight | Value | Effect | What it prices |
| --- | ---: | --- | --- |
| `cue` | 6 | adds (raising it penalises) | a line that looks like a character cue (capitals, short, followed by speech) |
| `knownName` | 12 | subtracts (raising it favours) | a cue whose name was already seen speaking, or told to us by the project (a discount) |
| `rejectedName` | 60 | adds (raising it penalises) | a cue whose name a person said is not a character (a heavy penalty) |
| `knownThing` | 16 | adds (raising it penalises) | a cue whose name the breakdown lists as a thing (a prop, costume, vehicle ...: the suite as a prior, bounded well under a rejection) |
| `knownThingSpeech` | 10 | adds (raising it penalises) | a line that is only the name of a thing the breakdown lists, read as speech (the object on the page, not a line spoken) |
| `extension` | 6 | subtracts (raising it favours) | a cue with an extension such as (V.O.) or (CONT'D) (a discount) |
| `noSpeechUnder` | 30 | adds (raising it penalises) | a cue with nothing after it to speak |
| `cueSentence` | 25 | adds (raising it penalises) | a "cue" that reads as a sentence |
| `cueLong` | 15 | adds (raising it penalises) | a "cue" that is too long to be a name |
| `dialogue` | 4 | adds (raising it penalises) | ordinary speech |
| `dialogueCaps` | 6 | adds (raising it penalises) | speech written in capitals (shouting) |
| `action` | 10 | adds (raising it penalises) | ordinary action |
| `actionProse` | 8 | adds (raising it penalises) | action that reads as prose |
| `actionCaps` | 12 | adds (raising it penalises) | action written in capitals |
| `actionNamesSomeone` | 5 | adds (raising it penalises) | action that opens with a known speaker's name and a verb ("Maya ducks.") |
| `dialogueOutsideSpeech` | 45 | adds (raising it penalises) | speech with no cue before it |
| `parentheticalOutsideSpeech` | 6 | adds (raising it penalises) | a parenthetical with no speech around it |
| `parentheticalAfterParenthetical` | 10 | adds (raising it penalises) | two parentheticals in a row |
| `cueAfterCue` | 40 | adds (raising it penalises) | a cue straight after a cue |
| `cueAfterSpeechNoBlank` | 14 | adds (raising it penalises) | a cue straight after speech with no blank line between |
| `actionInsideSpeech` | 16 | adds (raising it penalises) | action in the middle of a speech |
| `impossible` | 80 | adds (raising it penalises) | a sequence the grammar forbids |
| `previousDraft` | 7 | adds (raising it penalises) | a line read as a given type in the previous saved draft is this much cheaper as that type again (never for a heading, a rejected name or a type the line's own evidence rules out) |
| `temperature` | 3 | scale | how sharply costs become certainty (lower is more decisive) |
