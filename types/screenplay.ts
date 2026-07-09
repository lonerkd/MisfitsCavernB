// Screenplay Types for ScriptOS Integration

export type LineType = 
  | 'slug' 
  | 'action' 
  | 'character' 
  | 'dialogue' 
  | 'parenthetical' 
  | 'transition' 
  | 'shot' 
  | 'text' 
  | 'title' 
  | 'centered'
  | 'scene'
  | 'empty';

export interface ScriptLineMeta {
  sceneId?: string;
  sceneNumber?: string;
  timeOfDay?: string;
  isDualDialogue?: boolean;
  isContinued?: boolean;
  visualDensity?: number; // 0-100 score
  classifiedAsShot?: boolean;
  // Smart formatter extended fields
  fromSmartFormat?: boolean;
  isDialogueContinued?: boolean;
  sceneHeading?: string;
  intExt?: string;
  location?: string;
  characterName?: string;
  [key: string]: unknown; // allow parser to attach arbitrary metadata
}

export interface ScriptLine {
  id: string;
  index: number;
  text: string;
  type: LineType;
  confidence: number;
  // Parser extended fields — present after full parse
  scores?: Record<string, number>;
  reasoning?: string;
  meta?: ScriptLineMeta;
  metadata?: ScriptLineMeta; // alias used by some older callers
}

export interface Scene {
  id: string;
  startIndex: number;
  endIndex: number;
  heading: string;
  sceneNumber: string;
  location: string;
  timeOfDay: string;
  characters: string[];
  omitted: boolean;
  wordCount?: number;
  eighths?: number;
  elements?: SceneElements;
}

export interface SceneElements {
  props: string[];
  wardrobe: string[];
  vehicles: string[];
  sfx: string[];
  vfx: string[];
}

export interface Character {
  name: string;
  lines: number;
  firstLineIndex: number;
  scenes?: number[];
  dialogueCount?: number;
}

export interface ScriptMetadata {
  title?: string;
  author?: string;
  draft?: string;
  date?: string;
  pageCount?: number;
  wordCount?: number;
  sceneCount?: number;
  characterCount?: number;
  sceneAssets?: Record<string, string[]>; // sceneHeading -> array of studio_asset IDs
}

export interface ScreenplayDocument {
  id: string;
  title: string;
  content: string;
  lines: ScriptLine[];
  scenes: Scene[];
  characters: Character[];
  metadata: ScriptMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface ParseResult {
  lines: ScriptLine[];
  scenes: Scene[];
  characters: Character[];
  elements?: Record<string, string[]>;
}

export interface StashItem {
  id: string;
  text: string;
  date: number; // unix timestamp
}
