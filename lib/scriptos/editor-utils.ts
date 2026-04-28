import type { ScriptLine } from '@/types/screenplay';

export const ELEMENT_CYCLE = ['slug', 'action', 'character', 'dialogue', 'parenthetical', 'transition'] as const;

export interface EditorState {
  content: string;
  cursorPos: number;
}

export function getCurrentLine(content: string, cursorPos: number): { line: string; lineStart: number; lineEnd: number } {
  const lines = content.split('\n');
  let pos = 0;

  for (let i = 0; i < lines.length; i++) {
    const lineEnd = pos + lines[i].length;
    if (pos <= cursorPos && cursorPos <= lineEnd) {
      return {
        line: lines[i],
        lineStart: pos,
        lineEnd: lineEnd + 1 // +1 for \n
      };
    }
    pos = lineEnd + 1;
  }

  return { line: '', lineStart: 0, lineEnd: 0 };
}

export function getCharacterNames(lines: ScriptLine[]): string[] {
  const characters = new Set<string>();
  lines.forEach(line => {
    if (line.type === 'character' && line.meta?.characterName) {
      characters.add(line.meta.characterName);
    }
  });
  return Array.from(characters).sort();
}

export function handleTabKey(state: EditorState, currentType: string): EditorState {
  const { line, lineStart } = getCurrentLine(state.content, state.cursorPos);
  const currentIndex = ELEMENT_CYCLE.indexOf(currentType as any);
  const nextIndex = (currentIndex + 1) % ELEMENT_CYCLE.length;
  const nextType = ELEMENT_CYCLE[nextIndex];

  const formatter = getElementFormatter(nextType);
  const formattedLine = formatter(line.trim());

  const newContent = state.content.substring(0, lineStart) + formattedLine + state.content.substring(lineStart + line.length);

  return {
    content: newContent,
    cursorPos: lineStart + formattedLine.length
  };
}

export function handleEnterKey(state: EditorState, currentType: string, characterNames: string[]): EditorState {
  const { line, lineEnd } = getCurrentLine(state.content, state.cursorPos);
  let nextLinePrefix = '';

  if (currentType === 'character') {
    nextLinePrefix = '';
  } else if (currentType === 'dialogue') {
    nextLinePrefix = '';
  } else if (currentType === 'parenthetical') {
    nextLinePrefix = '';
  } else if (currentType === 'action' || currentType === 'slug') {
    nextLinePrefix = '';
  }

  const newContent = state.content.substring(0, lineEnd) + '\n' + nextLinePrefix + state.content.substring(lineEnd);

  return {
    content: newContent,
    cursorPos: lineEnd + 1 + nextLinePrefix.length
  };
}

export function getElementFormatter(type: string): (text: string) => string {
  switch (type) {
    case 'slug':
      return (text) => text.toUpperCase().trim();
    case 'character':
      return (text) => text.toUpperCase().trim();
    case 'dialogue':
      return (text) => text.trim();
    case 'parenthetical':
      return (text) => `(${text.trim()})`;
    case 'action':
      return (text) => text.trim();
    case 'transition':
      return (text) => text.toUpperCase().trim() + (text.endsWith(':') ? '' : ':');
    default:
      return (text) => text.trim();
  }
}

export function getWordCount(lines: ScriptLine[]): number {
  return lines.reduce((total, line) => {
    if (line.type === 'dialogue' || line.type === 'action') {
      return total + line.text.split(/\s+/).length;
    }
    return total;
  }, 0);
}

export function getSceneWordCount(lines: ScriptLine[], startIdx: number, endIdx: number): number {
  return lines
    .slice(startIdx, endIdx + 1)
    .reduce((total, line) => {
      if (line.type === 'dialogue' || line.type === 'action') {
        return total + line.text.split(/\s+/).length;
      }
      return total;
    }, 0);
}
