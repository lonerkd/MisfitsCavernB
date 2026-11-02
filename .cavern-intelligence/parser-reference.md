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

## Decoder weights (`DEFAULT_PARAMS`, `lib/scriptos/decode.ts`)

Costs: lower is a better fit. Tuned on the corpus (`lib/scriptos/corpus`); change one, re-measure (`npm run test` runs the ratchet).

| Weight | Cost | What it prices |
| --- | ---: | --- |
| `cue` | 6 | a line that looks like a character cue (capitals, short, followed by speech) |
| `knownName` | 12 | a cue whose name was already seen speaking, or told to us by the project (a discount) |
| `rejectedName` | 60 | a cue whose name a person said is not a character (a heavy penalty) |
| `extension` | 6 | a cue with an extension such as (V.O.) or (CONT'D) (a discount) |
| `noSpeechUnder` | 30 | a cue with nothing after it to speak |
| `cueSentence` | 25 | a "cue" that reads as a sentence |
| `cueLong` | 15 | a "cue" that is too long to be a name |
| `dialogue` | 4 | ordinary speech |
| `dialogueCaps` | 6 | speech written in capitals (shouting) |
| `action` | 10 | ordinary action |
| `actionProse` | 8 | action that reads as prose |
| `actionCaps` | 12 | action written in capitals |
| `actionNamesSomeone` | 5 | action that opens with a known speaker's name and a verb ("Maya ducks.") |
| `dialogueOutsideSpeech` | 45 | speech with no cue before it |
| `parentheticalOutsideSpeech` | 6 | a parenthetical with no speech around it |
| `parentheticalAfterParenthetical` | 10 | two parentheticals in a row |
| `cueAfterCue` | 40 | a cue straight after a cue |
| `cueAfterSpeechNoBlank` | 14 | a cue straight after speech with no blank line between |
| `actionInsideSpeech` | 16 | action in the middle of a speech |
| `impossible` | 80 | a sequence the grammar forbids |
| `temperature` | 3 | how sharply costs become certainty (lower is more decisive) |
