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
  | 'empty';

export interface ScriptLine {
  id: string;
  index: number;
  text: string;
  type: LineType;
  confidence: number;
  
  // Reasoning for classification
  reasoning: string[];
  
  // Raw scores for debugging
  scores: Record<LineType, number>;
  
  meta: {
    characterName?: string;
    sceneNumber?: string;
    timeOfDay?: string;
    isDualDialogue?: boolean;
    visualDensity?: number; // 0-100 score
  };
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
