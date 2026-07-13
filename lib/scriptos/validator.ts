

import type { ScriptLine } from '@/types/screenplay';
import { buildAST, ScriptAST, ASTDialogueBlock, ASTActionBeat } from '../advanced-parser';

export interface LintIssue {
  line: number;
  type: 'error' | 'warning' | 'info';
  message: string;
  rule: string;
}

export function validateScript(lines: ScriptLine[], content: string): LintIssue[] {
  const issues: LintIssue[] = [];
  const rawLines = content.split('\n');
  let hasSlug = false;

  lines.forEach((line, i) => {
    if (line.type === 'dialogue' && !hasSlug) {
      issues.push({ line: i + 1, type: 'warning', message: 'Dialogue appears before any scene heading', rule: 'scene-first' });
    }
    if (line.type === 'slug') hasSlug = true;

    if (line.type === 'slug' && line.text !== line.text.toUpperCase()) {
      issues.push({ line: i + 1, type: 'info', message: 'Scene heading should be fully uppercase', rule: 'slug-case' });
    }

    if (line.type === 'character' && line.text.trim() !== line.text.trim().toUpperCase()) {
      issues.push({ line: i + 1, type: 'warning', message: 'Character name should be uppercase', rule: 'char-case' });
    }

    if (line.type === 'action' && line.text.length > 500) {
      issues.push({ line: i + 1, type: 'info', message: 'Action block is very long (>500 chars). Consider breaking it up for a faster read.', rule: 'action-length' });
    }

    const trimText = line.text.trim();
    if ((line.type === 'action' || line.type === 'text' || line.type === 'dialogue') && !line.meta?.classifiedAsShot && trimText === trimText.toUpperCase() && trimText.length > 0 && trimText.length < 60 && /[A-Z]/.test(trimText)) {
      issues.push({ line: i + 1, type: 'warning', message: `Unrecognized uppercase format: "${trimText}"`, rule: 'unknown-caps' });
    }

    if (line.type === 'parenthetical') {
      const prev = lines[i - 1];
      if (prev && prev.type !== 'character' && prev.type !== 'dialogue') {
        issues.push({ line: i + 1, type: 'warning', message: 'Parenthetical without a preceding character or dialogue line', rule: 'orphan-paren' });
      }
    }

    if (line.type === 'dialogue') {
      const prev = lines[i - 1];
      if (prev && prev.type !== 'character' && prev.type !== 'parenthetical' && prev.type !== 'dialogue') {
        issues.push({ line: i + 1, type: 'error', message: 'Dialogue without a character heading', rule: 'orphan-dialogue' });
      }
    }

    if (line.type === 'slug' && i > 0) {
      const prevNonEmpty = lines.slice(0, i).reverse().find(l => l.type !== 'empty');
      if (prevNonEmpty && prevNonEmpty.type === 'slug') {
        issues.push({ line: i + 1, type: 'warning', message: 'Empty scene - no content between scene headings', rule: 'empty-scene' });
      }
    }

    if (line.type === 'transition' && line.text.trim() !== line.text.trim().toUpperCase()) {
      issues.push({ line: i + 1, type: 'info', message: 'Transitions are typically uppercase', rule: 'transition-case' });
    }
  });

  const nonEmptyLines = lines.filter(l => l.type !== 'empty').length;
  if (nonEmptyLines < 10 && nonEmptyLines > 0) {
    issues.push({ line: 1, type: 'info', message: 'Script is very short. Feature screenplays are typically 90-120 pages.', rule: 'length' });
  }

  if (!hasSlug && nonEmptyLines > 5) {
    issues.push({ line: 1, type: 'error', message: 'No scene headings detected. Use INT. or EXT. to start scenes.', rule: 'no-scenes' });
  }

  const ast = buildAST(lines);

  if (ast.scenes.length > 0) {
    let runningWords = 0;
    const seenCharacters = new Set<string>();

    ast.scenes.forEach((scene, sceneIndex) => {

      if (scene.wordCount > 750) {
        issues.push({
          line: scene.startIndex + 1,
          type: 'info',
          message: `Cinematic Polish: This scene is very dense (~${scene.wordCount} words). Consider breaking it up or ensuring pacing remains high.`,
          rule: 'scene-length-ast'
        });
      }

      scene.children.forEach(child => {
        if (child.type === 'DIALOGUE_BLOCK') {
          const charName = (child as ASTDialogueBlock).character;

          if (!seenCharacters.has(charName)) {
            seenCharacters.add(charName);

            if (!charName.includes('V.O.') && !charName.includes('O.S.')) {

              issues.push({
                line: child.startIndex + 1,
                type: 'info',
                message: `Character "${charName}" speaks for the first time here. Ensure they are properly introduced in action lines prior to this.`,
                rule: 'character-intro-ast'
              });
            }
          }

          if (child.wordCount > 100) {
            issues.push({
              line: child.startIndex + 1,
              type: 'info',
              message: `Monologue detected (${child.wordCount} words). Ensure this lengthy speech is structurally earned.`,
              rule: 'dialogue-length-ast'
            });
          }
        } else if (child.type === 'ACTION_BEAT') {

          const actionBeat = child as ASTActionBeat;
          const actionText = actionBeat.text.toUpperCase();
          ast.globalCharacters.forEach((_, charName) => {
            const baseName = charName.replace(/\s*\(.*\)/, '').trim();
            if (baseName.length > 2 && actionText.includes(baseName)) {
              seenCharacters.add(charName);
            }
          });
        }
      });

      runningWords += scene.wordCount;

      if (ast.totalWords > 5000) {
        const percentProgress = runningWords / ast.totalWords;

        if (percentProgress > 0.35 && sceneIndex < ast.scenes.length * 0.2) {
          if (scene.wordCount > 500) {

             issues.push({
               line: scene.startIndex + 1,
               type: 'warning',
               message: `Structural Pacing: Act I seems to be dragging. You are 35% through the script's word count but still in early scenes.`,
               rule: 'act1-pacing-ast'
             });
          }
        }
      }
    });
  }

  return issues.sort((a, b) => a.line - b.line);
}
