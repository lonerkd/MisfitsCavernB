// ============================================================================
// SCRIPTOS SCRIPT VALIDATOR / LINTER
// Checks screenplay formatting for common issues
// ============================================================================

import type { ScriptLine } from '@/types/screenplay';

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
  let lastCharLine = -1;
  let orphanDialogue = false;

  lines.forEach((line, i) => {
    // Rule: Scene heading should come before dialogue
    if (line.type === 'dialogue' && !hasSlug) {
      issues.push({ line: i + 1, type: 'warning', message: 'Dialogue appears before any scene heading', rule: 'scene-first' });
    }
    if (line.type === 'slug') hasSlug = true;

    // Rule: Slug should be uppercase
    if (line.type === 'slug' && line.text !== line.text.toUpperCase()) {
      issues.push({ line: i + 1, type: 'info', message: 'Scene heading should be fully uppercase', rule: 'slug-case' });
    }

    // Rule: Character name should be uppercase
    if (line.type === 'character' && line.text.trim() !== line.text.trim().toUpperCase()) {
      issues.push({ line: i + 1, type: 'warning', message: 'Character name should be uppercase', rule: 'char-case' });
    }

    // Rule: Very long action block
    if (line.type === 'action' && line.text.length > 500) {
      issues.push({ line: i + 1, type: 'info', message: 'Action block is very long (>500 chars). Consider breaking it up.', rule: 'action-length' });
    }

    // Rule: Parenthetical without preceding character
    if (line.type === 'parenthetical') {
      const prev = lines[i - 1];
      if (prev && prev.type !== 'character' && prev.type !== 'dialogue') {
        issues.push({ line: i + 1, type: 'warning', message: 'Parenthetical without a preceding character or dialogue line', rule: 'orphan-paren' });
      }
    }

    // Rule: Dialogue without character
    if (line.type === 'dialogue') {
      const prev = lines[i - 1];
      if (prev && prev.type !== 'character' && prev.type !== 'parenthetical' && prev.type !== 'dialogue') {
        issues.push({ line: i + 1, type: 'error', message: 'Dialogue without a character heading', rule: 'orphan-dialogue' });
      }
    }

    // Rule: Empty scene (slug followed immediately by another slug)
    if (line.type === 'slug' && i > 0) {
      const prevNonEmpty = lines.slice(0, i).reverse().find(l => l.type !== 'empty');
      if (prevNonEmpty && prevNonEmpty.type === 'slug') {
        issues.push({ line: i + 1, type: 'warning', message: 'Empty scene - no content between scene headings', rule: 'empty-scene' });
      }
    }

    // Rule: Transition not uppercase
    if (line.type === 'transition' && line.text.trim() !== line.text.trim().toUpperCase()) {
      issues.push({ line: i + 1, type: 'info', message: 'Transitions are typically uppercase', rule: 'transition-case' });
    }
  });

  // Rule: Script is very short
  const nonEmptyLines = lines.filter(l => l.type !== 'empty').length;
  if (nonEmptyLines < 10 && nonEmptyLines > 0) {
    issues.push({ line: 1, type: 'info', message: 'Script is very short. Feature screenplays are typically 90-120 pages.', rule: 'length' });
  }

  // Rule: No scene headings
  if (!hasSlug && nonEmptyLines > 5) {
    issues.push({ line: 1, type: 'error', message: 'No scene headings detected. Use INT. or EXT. to start scenes.', rule: 'no-scenes' });
  }

  return issues.sort((a, b) => a.line - b.line);
}
