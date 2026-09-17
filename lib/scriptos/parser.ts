

import type { ScriptLine, LineType, Scene, Character, ParseResult } from '@/types/screenplay';

export const KNOWLEDGE = {
  SCENE_PREFIXES: new Set([
    'INT.', 'EXT.', 'INT', 'EXT', 'INT./EXT.', 'EXT./INT.', 'INT/EXT', 'EXT/INT',
    'I/E', 'E/I', 'EST.', 'ESTABLISHING', 'INT-', 'EXT-', 'INT ', 'EXT ',
    'INTERIOR', 'EXTERIOR', 'SPACE', 'UNDERWATER', 'AERIAL', 'ON SCREEN'
  ]),

  TIME_OF_DAY: new Set([
    'DAY', 'NIGHT', 'MORNING', 'AFTERNOON', 'EVENING', 'DAWN', 'DUSK',
    'SUNRISE', 'SUNSET', 'LATER', 'CONTINUOUS', 'MOMENTS LATER', 'SAME',
    'SAME TIME', 'MAGIC HOUR', 'EARLY MORNING', 'LATE NIGHT', 'MIDNIGHT', 'NOON',
    'FLASHBACK', 'DREAM SEQUENCE', 'DAYDREAM', 'NIGHTMARE', 'FUTURE', 'PAST',
    'PRESENT', 'SIMULTANEOUS'
  ]),

  TRANSITIONS: new Set([
    'CUT TO:', 'CUT TO', 'FADE IN:', 'FADE IN', 'FADE OUT:', 'FADE OUT',
    'DISSOLVE TO:', 'SMASH CUT TO:', 'MATCH CUT TO:', 'JUMP CUT TO:',
    'WIPE TO:', 'IRIS IN:', 'IRIS OUT:', 'INTERCUT:', 'BACK TO:', 'TIME CUT:',
    'MORPH TO:', 'BLACKOUT', 'FADE TO BLACK.', 'SLAM TO BLACK', 'RESET TO:',
    'QUICK CUT:', 'HARD CUT TO:', 'CROSSFADE TO:'
  ]),

  CAMERA_ANGLES: new Set([
    'ANGLE ON', 'CLOSE UP', 'C.U.', 'ECU', 'XCU', 'MCU', 'POV', 'PAN TO',
    'TILT UP', 'TILT DOWN', 'ZOOM IN', 'ZOOM OUT', 'DOLLY IN', 'DOLLY OUT',
    'TRACKING SHOT', 'CRANE SHOT', 'AERIAL SHOT', 'INSERT', 'STOCK FOOTAGE',
    'SUPER:', 'TITLE CARD:', 'VFX:', 'SFX:', 'CHYRON:', 'CREDIT:',
    'THE CAMERA', 'WE SEE', 'REVEAL', 'PULL BACK', 'PUSH IN', 'WHIP PAN'
  ]),

  EXTENSIONS: new Set([
    "CONT'D", "V.O.", "O.S.", "O.C.", "OFF SCREEN", "VOICE OVER",
    "PRE-LAP", "INTO PHONE", "ON RADIO", "FILTERED", "ROBOTIC",
    "SUBTITLE", "ELECTRONIC", "THROUGH PHONE", "DISEMBODIED"
  ]),

  VERBS_MOVEMENT: new Set([
    'WALKS', 'RUNS', 'SPRINTS', 'DARTS', 'CLIMBS', 'CRAWLS', 'JUMPS', 'LEAPS',
    'FALLS', 'LANDS', 'STRIDES', 'PACES', 'MARCHES', 'RUSHES', 'BOLTS',
    'STUMBLES', 'TRIPS', 'SLIDES', 'DRIVES', 'RIDES', 'FLIES', 'SAILS'
  ]),

  VERBS_VIOLENT: new Set([
    'KILLS', 'SHOOTS', 'FIRES', 'STABS', 'PUNCHES', 'KICKS', 'SLAPS', 'HITS',
    'STRIKES', 'BASHES', 'SMASHES', 'CRUSHES', 'BREAKS', 'EXPLODES', 'BURNS',
    'SCREAMS', 'YELLS', 'SHOUTS', 'ATTACKS', 'LUNGES', 'GRABS', 'CHOKES'
  ]),

  VERBS_PASSIVE: new Set([
    'SITS', 'STANDS', 'WAITS', 'WATCHES', 'LOOKS', 'STARES', 'GLANCES',
    'PEERS', 'NOTICES', 'SPOTS', 'HEARS', 'LISTENS', 'SLEEPS', 'WAKES',
    'SIGHS', 'SMILES', 'FROWNS', 'NODS', 'SHAKES', 'SHRUGS'
  ]),

  VERBS_INTERACTION: new Set([
    'TOUCHES', 'HOLDS', 'CARRIES', 'PICKS', 'DROPS', 'THROWS', 'CATCHES',
    'GIVES', 'TAKES', 'HANDS', 'PULLS', 'PUSHES', 'OPENS', 'CLOSES',
    'LOCKS', 'UNLOCKS', 'KNOCKS', 'TYPES', 'WRITES', 'READS', 'EATS', 'DRINKS'
  ]),

  SOUNDS: new Set([
    'BOOM', 'CRASH', 'BANG', 'THUD', 'CLICK', 'RING', 'BEEP', 'BUZZ', 'WHIR',
    'ROAR', 'SCREECH', 'HOWL', 'BARK', 'MEOW', 'CHIRP', 'WHISTLE', 'HUM',
    'HISS', 'SIZZLE', 'POP', 'SNAP', 'CRACK', 'SPLAT', 'SQUISH', 'DRIP',
    'SPLASH', 'GURGLE', 'RUMBLE', 'THUNDER', 'SILENCE', 'QUIET', 'NOISE',
    'FOOTSTEPS', 'KNOCK', 'SLAM', 'SCREAM', 'EXPLOSION', 'GUNSHOT'
  ]),

  PROPS: new Set([
    'GUN', 'PISTOL', 'KNIFE', 'SWORD', 'PHONE', 'CELLPHONE', 'SMARTPHONE', 'LAPTOP',
    'COMPUTER', 'BRIEFCASE', 'SUITCASE', 'BAG', 'BACKPACK', 'WALLET', 'KEYS',
    'CUP', 'MUG', 'GLASS', 'BOTTLE', 'CIGARETTE', 'CIGAR', 'LIGHTER', 'WATCH',
    'RING', 'NECKLACE', 'PAPER', 'DOCUMENT', 'FILE', 'FOLDER', 'BOOK', 'MAGAZINE',
    'NEWSPAPER', 'PEN', 'PENCIL', 'FLASHLIGHT', 'TORCH', 'WEAPON', 'RIFLE'
  ]),

  WARDROBE: new Set([
    'SUIT', 'TUXEDO', 'DRESS', 'GOWN', 'SHIRT', 'T-SHIRT', 'JACKET', 'COAT',
    'TRENCHCOAT', 'SWEATER', 'HOODIE', 'JEANS', 'PANTS', 'TROUSERS', 'SHORTS',
    'SKIRT', 'HAT', 'CAP', 'HELMET', 'GLASSES', 'SUNGLASSES', 'SHOES', 'BOOTS',
    'SNEAKERS', 'HEELS', 'GLOVES', 'MASK', 'UNIFORM', 'ARMOR'
  ]),

  VEHICLES: new Set([
    'CAR', 'TRUCK', 'VAN', 'SUV', 'MOTORCYCLE', 'BIKE', 'BICYCLE', 'BUS',
    'TRAIN', 'SUBWAY', 'PLANE', 'AIRPLANE', 'HELICOPTER', 'JET', 'BOAT',
    'SHIP', 'YACHT', 'SPACESHIP', 'TAXI', 'CAB', 'AMBULANCE', 'POLICE CAR'
  ]),

  VFX: new Set([
    'EXPLOSION', 'FIRE', 'BLAST', 'SPARKS', 'SMOKE', 'HOLOGRAM', 'LASER',
    'BEAM', 'GLOW', 'MAGIC', 'BLOOD', 'WOUND', 'BULLET', 'SHATTER', 'CRASH'
  ])
};

export type ScriptFormat = 'screenplay' | 'teleplay' | 'stage-play' | 'treatment' | 'podcast' | 'doc-outline';

export class ScriptParser {
  private rawLines: string[];
  private characterStats: Map<string, number>;
  private elements: Record<string, Set<string>>;
  private lines: ScriptLine[];
  private format: ScriptFormat;

  private learnedNames: Set<string>;

  private sceneIndex: number = -1;
  private lastSpeaker: string | null = null;
  private insideDialogueBlock: boolean = false;
  private insideBoneyard: boolean = false;
  private requestDual: boolean = false;

  constructor(text: string, format: ScriptFormat = 'screenplay', learnedNames: Set<string> = new Set()) {
    this.rawLines = text ? text.split(/\r?\n/) : [];
    this.format = format;
    this.learnedNames = learnedNames;
    this.characterStats = new Map();
    this.elements = {
      'PROPS': new Set(),
      'WARDROBE': new Set(),
      'VEHICLES': new Set(),
      'VFX': new Set(),
      'SFX': new Set()
    };
    this.lines = [];
  }

  private usesScreenplayGrammar(): boolean {
    return this.format === 'screenplay' || this.format === 'teleplay' || this.format === 'stage-play';
  }

  private isCaps(text: string): boolean {
    const letters = text.replace(/[^a-zA-Z]/g, '');
    return letters.length > 0 && text === text.toUpperCase();
  }

  private clean(text: string): string {
    return text
      .replace(/\s*\(.*?\)\s*/g, ' ')
      .replace(/^\^/, '')
      .replace(/[^\p{L}\p{N}\s'’\-]/gu, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private isSceneHeading(text: string): boolean {
    return /^\s*(\d+[A-Z]?\s+)?(INTERIOR|EXTERIOR|INT\.?\/EXT\.?|EXT\.?\/INT\.?|INT|EXT|EST|I\/E|E\/I)\b/i.test(text.trim());
  }

  public parse(): ParseResult {
    this.lines = [];
    if (this.usesScreenplayGrammar()) {
      this.preScanCharacters();
    } else if (this.format === 'podcast') {
      this.preScanSpeakers();
    }

    for (let i = 0; i < this.rawLines.length; i++) {
      const raw = this.rawLines[i];
      const trim = raw.trim();

      if (!trim) {
        this.lines.push(this.line(i, '', 'empty', 100));
        this.insideDialogueBlock = false;
        this.requestDual = false;
        continue;
      }

      // Fountain boneyard `/* ... */` is source-only commentary. Keep the lines
      // (lossless round-trip) but type them 'boneyard' so the renderer/export
      // drops them and structure never reads them as screenplay.
      if (this.insideBoneyard || trim.startsWith('/*')) {
        const closes = trim.endsWith('*/');
        this.lines.push(this.line(i, raw, 'boneyard', 100, [this.insideBoneyard ? 'Boneyard contents' : 'Boneyard block']));
        this.insideBoneyard = this.insideBoneyard ? !closes : !trim.includes('*/');
        continue;
      }

      // Dual-dialogue caret. Mark the block above and the next one as dual, and
      // keep the marker itself (type 'dual') for lossless round-trip.
      if (trim === '^') {
        this.markPreviousDual();
        this.requestDual = true;
        this.lines.push(this.line(i, raw, 'dual', 100, ['Dual dialogue caret']));
        continue;
      }

      const context = {
        prev: this.lines[this.lines.length - 1],
        prev2: this.lines[this.lines.length - 2],
        next: this.rawLines[i + 1]?.trim() || '',
        lastSpeaker: this.lastSpeaker
      };

      const forced = this.preClassify(trim);
      let analysis: ReturnType<typeof this.analyzeLine>;
      if (forced) {
        analysis = forced;
      } else if (i < 50 && this.isTitlePageContent(trim)) {
        analysis = { type: 'title', confidence: 100, scores: this.emptyScores(), reasoning: ['Title page keyword detected'], meta: {} };
      } else {
        analysis = this.usesScreenplayGrammar()
          ? this.analyzeLine(trim, context)
          : this.analyzeNonScreenplayLine(trim, context);
      }

      if (analysis.type === 'slug') {
        this.sceneIndex++;
        this.lastSpeaker = null;
        this.insideDialogueBlock = false;
        this.requestDual = false;
      } else if (analysis.type === 'character') {
        const charName = analysis.meta?.characterName || trim;

        const isDual = trim.startsWith('^') || this.requestDual;

        const isContinued = this.lastSpeaker !== null &&
          this.clean(charName) === this.lastSpeaker &&
          !this.insideDialogueBlock;

        analysis.meta = {
          ...analysis.meta,
          isDualDialogue: isDual,
          characterName: charName.replace(/^\^/, '').trim(),
        };

        if (isContinued && !charName.includes("CONT'D") && !charName.includes("(CONT'D)")) {
          analysis.meta.isContinued = true;
        }

        this.lastSpeaker = this.clean(analysis.meta.characterName || charName);
        this.insideDialogueBlock = true;
      } else if (analysis.type === 'action' || analysis.type === 'transition' || analysis.type === 'centered') {
        this.insideDialogueBlock = false;
        this.requestDual = false;
      }

      if (this.requestDual && (analysis.type === 'dialogue' || analysis.type === 'parenthetical')) {
        analysis.meta = { ...analysis.meta, isDualDialogue: true };
      }

      this.lines.push({
        id: this.generateId(),
        index: i,
        text: raw,
        type: analysis.type,
        confidence: analysis.confidence,
        scores: analysis.scores,
        reasoning: analysis.reasoning.join('; '),
        meta: analysis.meta || {}
      });
    }

    const scenes = this.extractScenes(this.lines);
    const characters = this.getCharacters();

    const extractedElements: Record<string, string[]> = {};
    for (const [key, set] of Object.entries(this.elements)) {
      if (set.size > 0) {
        extractedElements[key] = Array.from(set);
      }
    }

    return { lines: this.lines, scenes, characters, elements: extractedElements };
  }

  private preScanCharacters() {

    this.learnedNames.forEach(name => {
      const cleanName = this.clean(name);
      if (cleanName && !this.characterStats.has(cleanName)) this.characterStats.set(cleanName, 1);
    });
    this.rawLines.forEach((line, idx) => {
      const trim = line.trim();
      if (!this.isCaps(trim) || trim.length < 2 || trim.length >= 50) return;
      const cleanName = this.clean(trim);
      const words = cleanName.split(' ').filter(Boolean);

      if (words.length === 0 || words.length > 4) return;
      if (/\d/.test(cleanName)) return;
      if (this.isSceneHeading(trim)) return;
      if (KNOWLEDGE.SCENE_PREFIXES.has(cleanName) || KNOWLEDGE.TRANSITIONS.has(cleanName) || KNOWLEDGE.CAMERA_ANGLES.has(cleanName) || KNOWLEDGE.TIME_OF_DAY.has(cleanName)) return;
      const next = (this.rawLines[idx + 1] || '').trim();
      const followedBySpeech = next.length > 0 && (next.startsWith('(') || !this.isCaps(next));
      if (!followedBySpeech) return;
      this.characterStats.set(cleanName, (this.characterStats.get(cleanName) || 0) + 1);
    });
  }

  private preScanSpeakers() {
    const speakerLine = /^([A-Za-z][A-Za-z0-9 .'-]{1,30}):\s*\S/;
    this.rawLines.forEach(line => {
      const match = line.trim().match(speakerLine);
      if (match) {
        const name = match[1].trim().toUpperCase();
        this.characterStats.set(name, (this.characterStats.get(name) || 0) + 1);
      }
    });
  }

  private analyzeNonScreenplayLine(text: string, context: any): {
    type: LineType, confidence: number, scores: any, reasoning: string[], meta?: any
  } {
    const reasoning: string[] = [];
    const scores = this.emptyScores();

    if (this.format === 'podcast') {

      if (/^[\[(].*[\])]$/.test(text)) {
        reasoning.push('Bracketed production cue');
        return { type: 'parenthetical', confidence: 90, scores, reasoning, meta: {} };
      }

      const speakerMatch = text.match(/^([A-Za-z][A-Za-z0-9 .'-]{1,30}):\s*(.+)$/);
      if (speakerMatch) {
        reasoning.push('Speaker-tagged line');
        return {
          type: 'dialogue', confidence: 95, scores, reasoning,
          meta: { characterName: speakerMatch[1].trim().toUpperCase() }
        };
      }

      if (/^(EPISODE|SEGMENT|INTRO|OUTRO|BREAK|COLD OPEN)\b/i.test(text) || (this.isCaps(text) && text.length < 60)) {
        reasoning.push('Segment header');
        return { type: 'slug', confidence: 85, scores, reasoning, meta: { sceneNumber: this.extractSceneNumber(text) } };
      }
      reasoning.push('Show-note / aside');
      return { type: 'action', confidence: 50, scores, reasoning, meta: {} };
    }

    if (this.format === 'doc-outline') {

      if (/^\d{1,2}:\d{2}(:\d{2})?\s*[-–—]/.test(text)) {
        reasoning.push('Timecoded segment marker');
        return { type: 'slug', confidence: 90, scores, reasoning, meta: { sceneNumber: this.extractSceneNumber(text) } };
      }

      if (/^(B-ROLL|INTERVIEW|ARCHIVAL|VO|VOICEOVER|TALKING HEAD|SEGMENT|SCENE)\s*[:.\-]/i.test(text)) {
        reasoning.push('Labeled segment marker');
        return { type: 'slug', confidence: 85, scores, reasoning, meta: { sceneNumber: this.extractSceneNumber(text) } };
      }

      const quoteMatch = text.match(/^([A-Za-z][A-Za-z0-9 .'-]{1,30}):\s*["“](.+)["”]$/);
      if (quoteMatch) {
        reasoning.push('Attributed soundbite');
        return { type: 'dialogue', confidence: 90, scores, reasoning, meta: { characterName: quoteMatch[1].trim().toUpperCase() } };
      }
      if (/^["“].+["”]$/.test(text)) {
        reasoning.push('Soundbite');
        return { type: 'dialogue', confidence: 70, scores, reasoning, meta: {} };
      }
      reasoning.push('Beat description');
      return { type: 'action', confidence: 50, scores, reasoning, meta: {} };
    }

    if ((this.isCaps(text) && text.length < 60) || /^#{1,3}\s/.test(text) || /^(SCENE|SHOT|BEAT)\s*\d*/i.test(text)) {
      reasoning.push('Treatment section header');
      return { type: 'slug', confidence: 80, scores, reasoning, meta: { sceneNumber: this.extractSceneNumber(text) } };
    }
    if (/^["“].+["”]$/.test(text)) {
      reasoning.push('Suggested line of dialogue');
      return { type: 'dialogue', confidence: 65, scores, reasoning, meta: {} };
    }
    reasoning.push('Treatment prose');
    return { type: 'action', confidence: 60, scores, reasoning, meta: {} };
  }

  private emptyScores(): Record<LineType, number> {
    return {
      slug: 0, action: 0, character: 0, dialogue: 0, parenthetical: 0,
      transition: 0, shot: 0, text: 0, title: 0, centered: 0, scene: 0,
      note: 0, lyric: 0, section: 0, synopsis: 0, dual: 0, pagebreak: 0, boneyard: 0, empty: 0,
    };
  }

  // Fountain spec layer: unambiguous syntax that never needs heuristics. This
  // runs BEFORE the scored classifier so a forced element can never be
  // overridden. Marker prefixes are classified, not deleted — the raw text is
  // preserved for lossless round-trip, and `meta` carries the clean value where
  // the suite needs it (scene heading, character name).
  private preClassify(trim: string): { type: LineType; confidence: number; scores: Record<LineType, number>; reasoning: string[]; meta?: any } | null {
    if (/^=+\s*$/.test(trim) && trim.length >= 3) return { type: 'pagebreak', confidence: 100, scores: this.emptyScores(), reasoning: ['Page break'] };
    if (trim.startsWith('[[') && trim.endsWith(']]')) return { type: 'note', confidence: 100, scores: this.emptyScores(), reasoning: ['Note'] };
    if (/^#{1,6}\s/.test(trim)) return { type: 'section', confidence: 100, scores: this.emptyScores(), reasoning: ['Section'], meta: { level: (trim.match(/^#+/) || ['#'])[0].length } };
    if (/^=\s*(?![\s=])/.test(trim)) return { type: 'synopsis', confidence: 100, scores: this.emptyScores(), reasoning: ['Synopsis'] };
    if (trim.startsWith('~')) return { type: 'lyric', confidence: 100, scores: this.emptyScores(), reasoning: ['Lyric'] };
    if (trim.startsWith('>') && trim.endsWith('<')) return { type: 'centered', confidence: 100, scores: this.emptyScores(), reasoning: ['Centered text'] };
    if (trim.startsWith('>')) return { type: 'transition', confidence: 100, scores: this.emptyScores(), reasoning: ['Forced transition'], meta: { text: trim.slice(1).trim() } };
    if (/^\.[^.\s]/.test(trim)) return { type: 'slug', confidence: 100, scores: this.emptyScores(), reasoning: ['Forced scene heading'], meta: { heading: trim.slice(1).trim(), sceneNumber: this.extractSceneNumber(trim) } };
    if (trim.startsWith('@')) return { type: 'character', confidence: 100, scores: this.emptyScores(), reasoning: ['Forced character'], meta: { characterName: this.clean(trim.slice(1)) } };
    if (trim.startsWith('!')) return { type: 'action', confidence: 100, scores: this.emptyScores(), reasoning: ['Forced action'], meta: { text: trim.slice(1).trim() } };
    return null;
  }

  private markPreviousDual(): void {
    const lines = this.lines;
    let charIdx = -1;
    for (let k = lines.length - 1; k >= 0; k--) {
      if (lines[k].type === 'character') { charIdx = k; break; }
      if (lines[k].type === 'slug' || lines[k].type === 'transition' || lines[k].type === 'empty') break;
    }
    if (charIdx >= 0) {
      lines[charIdx].meta = { ...lines[charIdx].meta, isDualDialogue: true };
      for (let k = charIdx + 1; k < lines.length; k++) {
        if (lines[k].type === 'dialogue' || lines[k].type === 'parenthetical') {
          lines[k].meta = { ...lines[k].meta, isDualDialogue: true };
        } else break;
      }
    }
  }

  private analyzeLine(text: string, context: any): {
    type: LineType, confidence: number, scores: any, reasoning: string[], meta?: any
  } {
    const scores = this.emptyScores();
    const reasoning: string[] = [];
    const upper = text.toUpperCase();
    const cleanName = this.clean(text);

    if (this.isSceneHeading(text)) {
      scores.slug = 100;
      reasoning.push('Starts with known scene prefix');
    } else if (upper.startsWith('.') && this.isCaps(text) && text.length > 1) {
      scores.slug = 90;
      reasoning.push('Starts with dot (shorthand slug)');
    }

    if (KNOWLEDGE.TRANSITIONS.has(upper) || KNOWLEDGE.TRANSITIONS.has(upper.replace(/:$/, ''))) {
      scores.transition = 100;
      reasoning.push('Exact transition match');
    } else if (upper.endsWith(' TO:') && this.isCaps(text) && text.length < 40) {
      scores.transition = 85;
      reasoning.push('Ends with " TO:" and is caps');
    }

    if (text.startsWith('(') && text.endsWith(')')) {
      scores.parenthetical = 90;
      reasoning.push('Wrapped in parentheses');
      if (context.prev?.type === 'character') {
        scores.parenthetical = 100;
        reasoning.push('Follows character');
      } else if (context.prev?.type === 'dialogue') {
        scores.parenthetical = 80;
        reasoning.push('Inside dialogue block');
      }
    }

    // A Character line may carry an inline parenthetical ('STEEL (beer raised)')
    // or a trailing extension. Evaluate the NAME portion for caps/length — not
    // the whole line — or these get misread as action and silently corrupt
    // dialogue attribution and scene cast lists.
    const namePart = text.replace(/\s*\([^)]*\)\s*$/, '').trim();
    if (this.isCaps(namePart) && namePart.length >= 2 && namePart.length < 60) {
      let charScore = 30;

      if (this.characterStats.get(cleanName)! >= 1) {
        charScore += 20;
        reasoning.push('Found in cast pre-scan');
      }

      if ([...KNOWLEDGE.EXTENSIONS].some(e => upper.includes(e))) {
        charScore += 50;
        reasoning.push('Contains character extension');
      }

      if (context.next && !this.isCaps(context.next)) {
        charScore += 30;
        reasoning.push('Followed by likely dialogue');
      }

      if (context.prev?.type === 'empty' || context.prev?.type === 'slug' || context.prev?.type === 'action') {
        charScore += 10;
      }

      if (scores.transition > 50) charScore = 0;

      if (this.matchesSetStart(upper, KNOWLEDGE.CAMERA_ANGLES)) {
        charScore = 0;
        scores.shot = 90;
        reasoning.push('Identified as Camera Cue');
      }

      scores.character = charScore;
    }

    let visualScore = 0;
    const words = upper.split(/[^A-Z]+/);

    const hasMovement = words.some(w => KNOWLEDGE.VERBS_MOVEMENT.has(w));
    if (hasMovement) { visualScore += 25; reasoning.push('Contains movement verb'); }

    const hasViolence = words.some(w => KNOWLEDGE.VERBS_VIOLENT.has(w));
    if (hasViolence) { visualScore += 35; reasoning.push('Contains violent verb'); }

    const hasInteraction = words.some(w => KNOWLEDGE.VERBS_INTERACTION.has(w));
    if (hasInteraction) { visualScore += 20; reasoning.push('Contains interaction verb'); }

    if (!this.isCaps(text)) {
      const capsWords = text.match(/\b[A-Z]{3,}\b/g) || [];
      if (capsWords.some(w => KNOWLEDGE.SOUNDS.has(w))) {
        visualScore += 30;
        reasoning.push('Contains capitalized sound cue');
      }
    }

    const upperWords = upper.split(/[^A-Z]+/);
    upperWords.forEach(w => {
      if (KNOWLEDGE.PROPS.has(w)) this.elements.PROPS.add(w);
      if (KNOWLEDGE.WARDROBE.has(w)) this.elements.WARDROBE.add(w);
      if (KNOWLEDGE.VEHICLES.has(w)) this.elements.VEHICLES.add(w);
      if (KNOWLEDGE.VFX.has(w)) this.elements.VFX.add(w);
      if (KNOWLEDGE.SOUNDS.has(w)) this.elements.SFX.add(w);
    });

    scores.action = visualScore + 20;

    if (!this.isCaps(text)) {
      if (context.prev?.type === 'character' || context.prev?.type === 'parenthetical') {
        scores.dialogue = 100;
        reasoning.push('Follows character/parenthetical');
      } else if (this.insideDialogueBlock && context.prev?.type === 'dialogue') {
        scores.dialogue = 95;
        reasoning.push('Continuation of dialogue block');
      }
    }

    let bestType: LineType = 'action';

    if (scores.slug >= 90) bestType = 'slug';
    else if (scores.transition >= 90) bestType = 'transition';
    else if (scores.parenthetical >= 90) bestType = 'parenthetical';
    else if (scores.dialogue >= 95) bestType = 'dialogue';
    else if (scores.character >= 60) bestType = 'character';
    else if (scores.shot >= 90) bestType = 'shot';
    else bestType = 'action';

    if (bestType === 'shot') {
      bestType = 'action';
      reasoning.push('Camera direction treated as Action');
    }

    return {
      type: bestType,
      confidence: Math.min(100, Math.max(scores[bestType] || 0, scores.action)),
      scores,
      reasoning,
      meta: {
        characterName: bestType === 'character' ? cleanName : undefined,
        visualDensity: visualScore,
        sceneNumber: this.extractSceneNumber(text)
      }
    };
  }

  private matchesSetStart(text: string, set: Set<string>): boolean {
    for (const item of set) if (text.startsWith(item)) return true;
    return false;
  }

  private isTitlePageContent(text: string): boolean {
    const lower = text.toLowerCase();
    const keywords = ['written by', 'story by', 'screenplay by', 'draft', 'date:', 'contact:', 'copyright', 'wga'];
    return keywords.some(k => lower.includes(k));
  }

  private extractSceneNumber(text: string): string | undefined {
    const hashNum = text.match(/#([\w.-]+)#/);
    if (hashNum) return hashNum[1];
    const match = text.match(/^(\d+[A-Z]?)\.?\s/);
    return match ? match[1] : undefined;
  }

  private line(index: number, text: string, type: LineType, confidence: number, reasoning: string[] = []): ScriptLine {
    return {
      id: this.generateId(),
      index,
      text,
      type,
      confidence,
      reasoning: reasoning.join('; '),
      scores: {} as any,
      meta: {}
    };
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  public getCharacters(): Character[] {
    return Array.from(this.characterStats.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, lines: count, firstLineIndex: 0 }));
  }

  public extractScenes(lines: ScriptLine[]): Scene[] {
    const scenes: Scene[] = [];
    let currentScene: Scene | undefined = undefined;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.type === 'slug') {
        if (currentScene) {
          currentScene.endIndex = i - 1;
          scenes.push(currentScene);
        }
        const slugText = (line.meta?.heading as string) || line.text.trim().replace(/^\.\s*/, '').replace(/#[\w.-]+#\s*$/, '');
        currentScene = {
          id: line.id,
          startIndex: i,
          endIndex: -1,
          heading: slugText.trim(),
          sceneNumber: line.meta?.sceneNumber || '',
          location: this.parseLocation(slugText),
          timeOfDay: this.parseTime(slugText),
          characters: [],
          omitted: false
        };
      } else if (currentScene) {
        const characterName = line.meta?.characterName;
        if (line.type === 'character' && characterName) {
          if (!currentScene.characters.includes(characterName)) {
            currentScene.characters.push(characterName);
          }
        }
      }
    }

    const lastScene: Scene | undefined = currentScene;
    if (lastScene) {
      lastScene.endIndex = lines.length - 1;
      scenes.push(lastScene);
    }

    scenes.forEach(sc => {
      const body = lines.slice(sc.startIndex, sc.endIndex + 1).map(l => l.text).join(' ');
      const words = body.split(/\s+/).filter(Boolean).length;
      sc.wordCount = words;

      sc.eighths = Math.max(1, Math.round((words / 190) * 8));
      // Production elements come from ACTION text only (never dialogue or
      // character cues), and exclude the scene's own character names.
      const actionText = lines
        .slice(sc.startIndex, sc.endIndex + 1)
        .filter(l => l.type === 'action' || l.type === 'shot')
        .map(l => l.text)
        .join(' ');
      sc.elements = extractElementsFromAction(actionText, sc.characters);
    });

    return scenes;
  }

  private stripScenePrefix(slug: string): string {
    return slug.trim().replace(/^\s*(\d+[A-Z]?\s+)?(INTERIOR|EXTERIOR|INT\.?\/EXT\.?|EXT\.?\/INT\.?|INT|EXT|EST|I\/E|E\/I)\b\.?\s*/i, '');
  }

  private isTimePart(part: string): boolean {
    const up = part.toUpperCase().replace(/[^A-Z\s/]/g, '').trim();
    if (KNOWLEDGE.TIME_OF_DAY.has(up)) return true;
    return [...KNOWLEDGE.TIME_OF_DAY].some(t => up === t || up.endsWith(' ' + t) || up.endsWith(t));
  }

  private parseLocation(slug: string): string {
    const body = this.stripScenePrefix(slug);

    const parts = body.split(/\s+-{1,2}\s+/).map(p => p.trim()).filter(Boolean);
    if (parts.length === 0) return body.trim();
    while (parts.length > 1 && this.isTimePart(parts[parts.length - 1])) parts.pop();
    return parts.join(' - ');
  }

  private parseTime(slug: string): string {
    const body = this.stripScenePrefix(slug);
    const parts = body.split(/\s+-{1,2}\s+/).map(p => p.trim()).filter(Boolean);
    const last = (parts[parts.length - 1] || '').toUpperCase().replace(/[^A-Z\s]/g, ' ').replace(/\s+/g, ' ').trim();

    const hits = [...KNOWLEDGE.TIME_OF_DAY].filter(t => new RegExp(`(^|\\s)${t}(\\s|$)`).test(last));
    if (hits.length) return hits.sort((a, b) => b.length - a.length)[0];

    for (const t of KNOWLEDGE.TIME_OF_DAY) if (last.endsWith(t)) return t;
    return 'UNKNOWN';
  }

}

// Production-element extraction (the script -> props/wardrobe/vehicles/sfx/vfx
// breakdown). Deterministic, offline: reads the ALL-CAPS runs that are the
// industry convention for tagging elements in action lines, skips common
// stopwords and the scene's own character names, then categorises with the same
// dictionaries the editor already uses. Anything unmatched defaults to props —
// the catch-all bucket a real breakdown uses too.
export const BREAKDOWN_STOPWORDS = new Set([
  'A', 'AN', 'THE', 'AND', 'BUT', 'OR', 'HE', 'SHE', 'IT', 'WE', 'THEY', 'THEM',
  'YOU', 'I', 'IS', 'ARE', 'WAS', 'WERE', 'BE', 'TO', 'OF', 'IN', 'ON', 'AT',
  'FOR', 'WITH', 'NOT', 'NO', 'YES', 'AS', 'BY', 'FROM', 'INTO', 'OVER', 'UNDER',
  'DOES', 'DO', 'DID', 'HAS', 'HAVE', 'HAD', 'CAN', 'COULD', 'WOULD', 'WILL',
  'SHALL', 'MAY', 'MIGHT', 'MUST', 'ALL', 'SOME', 'ANY', 'EVERY', 'NOW', 'THEN',
  'HIS', 'HER', 'THEIR', 'OUR', 'MY', 'YOUR', 'JUST', 'ONLY', 'STILL', 'BACK',
  'DOWN', 'UP', 'OUT', 'OFF', 'THIS', 'THAT', 'THOSE', 'THESE', 'THERE', 'HERE',
  'WHEN', 'WHERE', 'WHO', 'WHAT', 'WHILE', 'AFTER', 'BEFORE', 'THROUGH', 'ACROSS',
  'AGAINST', 'ALONG', 'AROUND', 'BETWEEN', 'BEYOND', 'SUDDENLY', 'FINALLY', 'SOON',
  'LATER', 'SLOWLY', 'QUICKLY', 'ANGLE', 'POV', 'CLOSE', 'HOLD', 'DAY', 'NIGHT',
  'INT', 'EXT', 'CONTINUOUS', 'MORE', 'TITLE', 'CARD', 'SUPER', 'CHYRON', 'INSERT',
]);

export function extractElementsFromAction(text: string, characters: string[] = []): { props: string[]; wardrobe: string[]; vehicles: string[]; sfx: string[]; vfx: string[] } {
  const result = { props: [] as string[], wardrobe: [] as string[], vehicles: [] as string[], sfx: [] as string[], vfx: [] as string[] };
  const seen = new Set<string>();
  const knownNames = new Set(
    characters.map(c => c.toUpperCase().replace(/[^A-Z0-9]/g, '').trim()).filter(Boolean),
  );
  const add = (cat: keyof typeof result, w: string) => {
    const k = w.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!k || seen.has(k)) return;
    seen.add(k);
    result[cat].push(w);
  };
  const tokens = text.match(/\b[A-Z][A-Z0-9'’.&/-]{1,}\b/g) || [];
  for (const raw of tokens) {
    const w = raw.replace(/[’']s$/i, '').trim();
    if (w.length < 2) continue;
    const upper = w.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!upper || BREAKDOWN_STOPWORDS.has(upper) || knownNames.has(upper)) continue;
    if (KNOWLEDGE.SOUNDS.has(upper)) add('sfx', w);
    else if (KNOWLEDGE.VFX.has(upper)) add('vfx', w);
    else if (KNOWLEDGE.VEHICLES.has(upper)) add('vehicles', w);
    else if (KNOWLEDGE.WARDROBE.has(upper)) add('wardrobe', w);
    else add('props', w);
  }
  return result;
}

export function parseScript(text: string, format: ScriptFormat = 'screenplay', learnedNames?: Set<string>): ParseResult {
  const parser = new ScriptParser(text, format, learnedNames);
  return parser.parse();
}
