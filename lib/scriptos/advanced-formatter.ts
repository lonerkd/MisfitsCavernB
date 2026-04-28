import type { ScriptLine } from '@/types/screenplay';

export type ScreenplayFormat = 'screenplay' | 'teleplay' | 'stage-play';

const FORMATS: Record<ScreenplayFormat, { name: string; pageRatio: number }> = {
  screenplay: { name: 'Screenplay (Film)', pageRatio: 1 },
  teleplay: { name: 'Teleplay (TV)', pageRatio: 1.2 },
  'stage-play': { name: 'Stage Play', pageRatio: 0.9 }
};

// Professional formatting rules
export function formatLine(text: string, type: string, format: ScreenplayFormat): string {
  text = text.trim();
  
  switch (type) {
    case 'slug':
      return text.toUpperCase();
    case 'character':
      return text.toUpperCase();
    case 'dialogue':
      return text;
    case 'parenthetical':
      return text.startsWith('(') && text.endsWith(')') ? text : `(${text})`;
    case 'action':
      return text;
    case 'transition':
      return text.toUpperCase().endsWith(':') ? text : `${text.toUpperCase()}:`;
    default:
      return text;
  }
}

// Calculate page count (standard: 1 page = ~55 lines)
export function calculatePageCount(lines: ScriptLine[], format: ScreenplayFormat): number {
  const lineCount = lines.length;
  const basePages = lineCount / 55;
  return Math.ceil(basePages * FORMATS[format].pageRatio);
}

// Calculate word count (more accurate)
export function calculateWordCount(lines: ScriptLine[]): { dialogue: number; action: number; total: number } {
  let dialogue = 0;
  let action = 0;

  lines.forEach(line => {
    const words = line.text.split(/\s+/).length;
    if (line.type === 'dialogue') {
      dialogue += words;
    } else if (line.type === 'action') {
      action += words;
    }
  });

  return {
    dialogue,
    action,
    total: dialogue + action
  };
}

// Extract all unique character names (for autocomplete)
export function extractCharacters(lines: ScriptLine[]): string[] {
  const characters = new Set<string>();
  
  lines.forEach(line => {
    if (line.type === 'character' && line.meta?.characterName) {
      characters.add(line.meta.characterName);
    }
  });

  return Array.from(characters).sort();
}

// Scene breakdown analysis
export function analyzeScenes(lines: ScriptLine[]) {
  const scenes = [];
  let currentScene = null;
  let charCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.type === 'slug') {
      if (currentScene) {
        scenes.push({ ...currentScene, endIndex: i - 1, lineCount: charCount });
      }
      currentScene = {
        index: i,
        heading: line.text,
        startIndex: i,
        characters: new Set<string>()
      };
      charCount = 0;
    } else if (line.type === 'character' && currentScene) {
      currentScene.characters.add(line.meta?.characterName || '');
      charCount += 1;
    }
  }

  if (currentScene) {
    scenes.push({ ...currentScene, endIndex: lines.length - 1, lineCount: charCount });
  }

  return scenes;
}

// Detect element type from context (AI-like behavior)
export function detectElementType(text: string, context: { prev?: ScriptLine; next?: ScriptLine }): string {
  const upper = text.toUpperCase();
  const isCaps = /^[A-Z\s.,:'-]+$/.test(text);
  const isParens = text.startsWith('(') && text.endsWith(')');

  // Parenthetical detection
  if (isParens && context.prev?.type === 'character') {
    return 'parenthetical';
  }

  // Dialogue detection
  if (context.prev?.type === 'character' || context.prev?.type === 'parenthetical') {
    return 'dialogue';
  }

  // Slug/Scene heading detection
  if (isCaps && (text.includes('INT.') || text.includes('EXT.') || text.includes('INT/EXT'))) {
    return 'slug';
  }

  // Character detection
  if (isCaps && text.length < 60 && text.length > 2) {
    const lineEnds = ['V.O.', 'O.S.', 'O.C.', 'CONT\'D'];
    if (lineEnds.some(end => text.includes(end))) {
      return 'character';
    }
  }

  // Transition detection
  if (isCaps && (text.includes('CUT TO:') || text.includes('FADE') || text.includes('DISSOLVE'))) {
    return 'transition';
  }

  // Default to action
  return 'action';
}

// Smart indentation
export function getIndentation(type: string): string {
  switch (type) {
    case 'character':
      return ' '.repeat(40);
    case 'dialogue':
      return ' '.repeat(10);
    case 'parenthetical':
      return ' '.repeat(12);
    case 'transition':
      return ' '.repeat(50);
    default:
      return '';
  }
}

// Calculate read time
export function calculateReadTime(words: number): { minutes: number; seconds: number } {
  const totalSeconds = (words / 150) * 60; // 150 WPM average
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return { minutes, seconds };
}
