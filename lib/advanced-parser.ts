import type { ScriptLine, LineType } from '@/types/screenplay';

export type ASTNodeType = 'SCENE' | 'ACTION_BEAT' | 'DIALOGUE_BLOCK' | 'TRANSITION' | 'SHOT';

export interface ASTNode {
  id: string;
  type: ASTNodeType;
  startIndex: number;
  endIndex: number;
  wordCount: number;
}

export interface ASTActionBeat extends ASTNode {
  type: 'ACTION_BEAT';
  text: string;
}

export interface ASTDialogueBlock extends ASTNode {
  type: 'DIALOGUE_BLOCK';
  character: string;
  parentheticals: string[];
  dialogueLines: string[];
}

export interface ASTScene extends ASTNode {
  type: 'SCENE';
  heading: string;
  isInt: boolean;
  isExt: boolean;
  isDay: boolean;
  isNight: boolean;
  charactersPresent: Set<string>;
  children: (ASTActionBeat | ASTDialogueBlock | ASTNode)[];
}

export interface ScriptAST {
  scenes: ASTScene[];
  globalCharacters: Map<string, number>;
  totalWords: number;
}

export function buildAST(lines: ScriptLine[]): ScriptAST {
  const ast: ScriptAST = {
    scenes: [],
    globalCharacters: new Map(),
    totalWords: 0,
  };

  if (!lines || lines.length === 0) return ast;

  let currentScene: ASTScene | null = null;
  let currentDialogue: ASTDialogueBlock | null = null;
  let currentAction: ASTActionBeat | null = null;

  const commitDialogue = () => {
    if (currentScene && currentDialogue) {
      currentDialogue.endIndex = currentDialogue.endIndex || currentDialogue.startIndex;
      currentScene.children.push(currentDialogue);
      currentDialogue = null;
    }
  };

  const commitAction = () => {
    if (currentScene && currentAction) {
      currentAction.endIndex = currentAction.endIndex || currentAction.startIndex;
      currentScene.children.push(currentAction);
      currentAction = null;
    }
  };

  const commitScene = () => {
    commitDialogue();
    commitAction();
    if (currentScene) {
      ast.scenes.push(currentScene);
      currentScene = null;
    }
  };

  lines.forEach((line, i) => {

    const words = line.text.trim().split(/\s+/).filter(w => w.length > 0).length;
    ast.totalWords += words;

    if (line.type === 'slug') {
      commitScene();
      const txt = line.text.toUpperCase();
      currentScene = {
        id: line.id || `scene_${i}`,
        type: 'SCENE',
        startIndex: i,
        endIndex: i,
        wordCount: words,
        heading: line.text,
        isInt: txt.includes('INT.'),
        isExt: txt.includes('EXT.'),
        isDay: txt.includes('DAY'),
        isNight: txt.includes('NIGHT'),
        charactersPresent: new Set(),
        children: []
      };
    } else if (line.type === 'character') {
      commitAction();
      commitDialogue();
      if (currentScene) {
        const charName = line.text.replace(/\(.*\)/g, '').trim().toUpperCase();
        currentScene.charactersPresent.add(charName);
        currentDialogue = {
          id: line.id || `diag_${i}`,
          type: 'DIALOGUE_BLOCK',
          startIndex: i,
          endIndex: i,
          wordCount: words,
          character: charName,
          parentheticals: [],
          dialogueLines: []
        };
      }
    } else if (line.type === 'parenthetical') {
      if (currentDialogue) {
        currentDialogue.parentheticals.push(line.text);
        currentDialogue.wordCount += words;
        currentDialogue.endIndex = i;
      } else {

        commitDialogue();
        if (!currentAction && currentScene) {
          currentAction = { id: `act_${i}`, type: 'ACTION_BEAT', startIndex: i, endIndex: i, wordCount: 0, text: '' };
        }
        if (currentAction) {
          currentAction.text += (currentAction.text ? '\n' : '') + line.text;
          currentAction.wordCount += words;
          currentAction.endIndex = i;
        }
      }
    } else if (line.type === 'dialogue') {
      if (currentDialogue) {
        currentDialogue.dialogueLines.push(line.text);
        currentDialogue.wordCount += words;
        currentDialogue.endIndex = i;

        const currentTotal = ast.globalCharacters.get(currentDialogue.character) || 0;
        ast.globalCharacters.set(currentDialogue.character, currentTotal + words);
      } else {

        if (!currentAction && currentScene) {
          currentAction = { id: `act_${i}`, type: 'ACTION_BEAT', startIndex: i, endIndex: i, wordCount: 0, text: '' };
        }
        if (currentAction) {
          currentAction.text += (currentAction.text ? '\n' : '') + line.text;
          currentAction.wordCount += words;
          currentAction.endIndex = i;
        }
      }
    } else if (line.type === 'action' || line.type === 'text') {
      commitDialogue();
      if (!currentScene) {

        currentScene = {
          id: 'implicit_scene', type: 'SCENE', startIndex: 0, endIndex: 0, wordCount: 0, heading: 'IMPLICIT SCENE',
          isInt: false, isExt: false, isDay: false, isNight: false, charactersPresent: new Set(), children: []
        };
      }
      if (!currentAction) {
        currentAction = { id: line.id || `act_${i}`, type: 'ACTION_BEAT', startIndex: i, endIndex: i, wordCount: 0, text: '' };
      }
      currentAction.text += (currentAction.text ? '\n' : '') + line.text;
      currentAction.wordCount += words;
      currentAction.endIndex = i;
    } else if (line.type === 'transition' || line.type === 'shot') {
      commitAction();
      commitDialogue();
      if (currentScene) {
        currentScene.children.push({
          id: line.id || `trans_${i}`,
          type: line.type === 'transition' ? 'TRANSITION' : 'SHOT',
          startIndex: i,
          endIndex: i,
          wordCount: words,
        });
      }
    }

    if (currentScene) {
      currentScene.endIndex = i;
      currentScene.wordCount += words;
    }
  });

  commitScene();

  return ast;
}