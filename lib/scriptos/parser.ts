/* =========================================================================
   SCRIPTOS KNOWLEDGE ENGINE - Misfits Cavern Edition
   
   Architecture: Dictionary-Driven State Machine
   Philosophy: "Context is King, Vocabulary is Queen"
   ========================================================================= */

import type { ScriptLine, LineType, Scene, Character, ParseResult } from '@/types/screenplay';

// =========================================================================
// KNOWLEDGE BASE
// =========================================================================

const KNOWLEDGE = {
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

// =========================================================================
// PARSER CLASS
// =========================================================================

export class ScriptParser {
  private rawLines: string[];
  private characterStats: Map<string, number>;
  private elements: Record<string, Set<string>>;
  private lines: ScriptLine[];
  
  // State Machine
  private sceneIndex: number = -1;
  private lastSpeaker: string | null = null;
  private insideDialogueBlock: boolean = false;

  constructor(text: string) {
    this.rawLines = text ? text.split(/\r?\n/) : [];
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

  // --- UTILS ---
  private isCaps(text: string): boolean {
    const letters = text.replace(/[^a-zA-Z]/g, '');
    return letters.length > 0 && text === text.toUpperCase();
  }

  private clean(text: string): string {
    return text.replace(/\s*\(.*?\)\s*/g, '').replace(/[^a-zA-Z0-9\s]/g, '').trim();
  }

  // --- MAIN PARSE LOOP ---
  public parse(): ParseResult {
    this.lines = [];
    this.preScanCharacters(); // Pass 1: Build the Cast List

    for (let i = 0; i < this.rawLines.length; i++) {
      const raw = this.rawLines[i];
      const trim = raw.trim();
      
      if (!trim) {
        this.lines.push(this.line(i, '', 'empty', 100));
        this.insideDialogueBlock = false;
        continue;
      }

      // Title Page Guard
      if (i < 50 && this.isTitlePageContent(trim)) {
        this.lines.push(this.line(i, raw, 'title', 100, ['Title page keyword detected']));
        continue;
      }

      // Context Object
      const context = {
        prev: this.lines[this.lines.length - 1],
        prev2: this.lines[this.lines.length - 2],
        next: this.rawLines[i + 1]?.trim() || '',
        lastSpeaker: this.lastSpeaker
      };

      // Classification
      const analysis = this.analyzeLine(trim, context);
      
      // State Updates
      if (analysis.type === 'slug') {
        this.sceneIndex++;
        this.lastSpeaker = null;
        this.insideDialogueBlock = false;
      } else if (analysis.type === 'character') {
        const charName = analysis.meta?.characterName || trim;
        // Detect Dual Dialogue: caret prefix (^CHARACTER)
        const isDual = trim.startsWith('^');
        // Detect CONT'D: same character speaking again after action
        const isContinued = this.lastSpeaker !== null && 
          this.clean(charName) === this.lastSpeaker && 
          !this.insideDialogueBlock;
        
        analysis.meta = {
          ...analysis.meta,
          isDualDialogue: isDual,
          characterName: isDual ? charName.replace(/^\^/, '').trim() : charName,
        };
        
        // If CONT'D and name doesn't already have it, note it
        if (isContinued && !charName.includes("CONT'D") && !charName.includes("(CONT'D)")) {
          analysis.meta.isContinued = true;
        }
        
        this.lastSpeaker = this.clean(analysis.meta.characterName || charName);
        this.insideDialogueBlock = true;
      } else if (analysis.type === 'action' || analysis.type === 'transition') {
        this.insideDialogueBlock = false;
      }

      this.lines.push({
        id: this.generateId(),
        index: i,
        text: raw,
        type: analysis.type,
        confidence: analysis.confidence,
        scores: analysis.scores,
        reasoning: analysis.reasoning,
        meta: analysis.meta || {}
      });
    }

    const scenes = this.extractScenes(this.lines);
    const characters = this.getCharacters();
    
    // Convert sets to arrays for the result
    const extractedElements: Record<string, string[]> = {};
    for (const [key, set] of Object.entries(this.elements)) {
      if (set.size > 0) {
        extractedElements[key] = Array.from(set);
      }
    }

    return { lines: this.lines, scenes, characters, elements: extractedElements };
  }

  // --- PASS 1: CHARACTER RECOGNITION ---
  private preScanCharacters() {
    this.rawLines.forEach(line => {
      const trim = line.trim();
      if (this.isCaps(trim) && trim.length > 1 && trim.length < 50) {
        const cleanName = this.clean(trim);
        if (!KNOWLEDGE.SCENE_PREFIXES.has(cleanName) && 
            !KNOWLEDGE.TRANSITIONS.has(cleanName) &&
            !KNOWLEDGE.CAMERA_ANGLES.has(cleanName)) {
          this.characterStats.set(cleanName, (this.characterStats.get(cleanName) || 0) + 1);
        }
      }
    });
  }

  // --- THE BRAIN: LINE ANALYSIS ---
  private analyzeLine(text: string, context: any): { 
    type: LineType, confidence: number, scores: any, reasoning: string[], meta?: any 
  } {
    const scores: Record<LineType, number> = {
      slug: 0, action: 0, character: 0, dialogue: 0, 
      parenthetical: 0, transition: 0, shot: 0, text: 0, title: 0, empty: 0
    };
    const reasoning: string[] = [];
    const upper = text.toUpperCase();
    const cleanName = this.clean(text);

    // 1. SLUG DETECTION
    if (this.matchesSetStart(upper, KNOWLEDGE.SCENE_PREFIXES)) {
      scores.slug = 100;
      reasoning.push('Starts with known scene prefix');
    } else if (upper.startsWith('.') && this.isCaps(text)) {
      scores.slug = 90;
      reasoning.push('Starts with dot (shorthand slug)');
    }

    // 2. TRANSITION DETECTION
    if (KNOWLEDGE.TRANSITIONS.has(upper) || KNOWLEDGE.TRANSITIONS.has(upper.replace(/:$/, ''))) {
      scores.transition = 100;
      reasoning.push('Exact transition match');
    } else if (upper.endsWith(' TO:') && this.isCaps(text) && text.length < 40) {
      scores.transition = 85;
      reasoning.push('Ends with " TO:" and is caps');
    }

    // 3. PARENTHETICAL DETECTION
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

    // 4. CHARACTER DETECTION
    if (this.isCaps(text) && text.length < 60) {
      let charScore = 20;
      
      if (this.characterStats.get(cleanName)! > 1) {
        charScore += 40;
        reasoning.push('Known recurring character');
      }
      
      if ([...KNOWLEDGE.EXTENSIONS].some(e => upper.includes(e))) {
        charScore += 50;
        reasoning.push('Contains character extension');
      }

      if (context.prev?.type === 'action' || context.prev?.type === 'slug' || context.prev?.type === 'empty') {
        charScore += 20;
        reasoning.push('Follows action/slug/empty');
      }

      if (scores.transition > 50) charScore = 0;
      
      if (this.matchesSetStart(upper, KNOWLEDGE.CAMERA_ANGLES)) {
        charScore = 0;
        scores.shot = 90;
        reasoning.push('Identified as Camera Cue');
      }

      scores.character = charScore;
    }

    // 5. ACTION DETECTION
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

    // --- ELEMENT EXTRACTION ---
    // If it's an action line, scan for elements regardless of capitalization
    const upperWords = upper.split(/[^A-Z]+/);
    upperWords.forEach(w => {
      if (KNOWLEDGE.PROPS.has(w)) this.elements.PROPS.add(w);
      if (KNOWLEDGE.WARDROBE.has(w)) this.elements.WARDROBE.add(w);
      if (KNOWLEDGE.VEHICLES.has(w)) this.elements.VEHICLES.add(w);
      if (KNOWLEDGE.VFX.has(w)) this.elements.VFX.add(w);
      if (KNOWLEDGE.SOUNDS.has(w)) this.elements.SFX.add(w);
    });

    scores.action = visualScore + 20;

    // 6. DIALOGUE DETECTION
    if (!this.isCaps(text)) {
      if (context.prev?.type === 'character' || context.prev?.type === 'parenthetical') {
        scores.dialogue = 100;
        reasoning.push('Follows character/parenthetical');
      } else if (this.insideDialogueBlock && context.prev?.type === 'dialogue') {
        scores.dialogue = 95;
        reasoning.push('Continuation of dialogue block');
      }
    }

    // --- CONFLICT RESOLUTION ---
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

  // --- HELPERS ---
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
      reasoning,
      scores: {} as any,
      meta: {}
    };
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // --- EXPORTS ---
  public getCharacters(): Character[] {
    return Array.from(this.characterStats.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, lines: count, firstLineIndex: 0 }));
  }

  public extractScenes(lines: ScriptLine[]): Scene[] {
    const scenes: Scene[] = [];
    let currentScene: Scene | undefined = undefined;
    
    lines.forEach((line, i) => {
      if (line.type === 'slug') {
        if (currentScene) {
          currentScene.endIndex = i - 1;
          scenes.push(currentScene);
        }
        currentScene = {
          id: line.id,
          startIndex: i,
          endIndex: -1,
          heading: line.text.trim(),
          sceneNumber: line.meta.sceneNumber || '',
          location: this.parseLocation(line.text),
          timeOfDay: this.parseTime(line.text),
          characters: [],
          omitted: false
        };
      } else if (currentScene) {
        if (line.type === 'character' && line.meta.characterName) {
          if (!currentScene.characters.includes(line.meta.characterName)) {
            currentScene.characters.push(line.meta.characterName);
          }
        }
      }
    });
    
    if (currentScene) {
      currentScene.endIndex = lines.length - 1;
      scenes.push(currentScene);
    }
    
    return scenes;
  }

  private parseLocation(slug: string): string {
    return slug.replace(/^(INT\.|EXT\.|INT\/EXT)\s*/i, '').split('-')[0].trim();
  }

  private parseTime(slug: string): string {
    const parts = slug.split('-');
    const time = parts[parts.length - 1].trim().toUpperCase();
    return KNOWLEDGE.TIME_OF_DAY.has(time) ? time : 'UNKNOWN';
  }
}

// =========================================================================
// EXPORT FUNCTION
// =========================================================================

export function parseScript(text: string): ParseResult {
  const parser = new ScriptParser(text);
  return parser.parse();
}
