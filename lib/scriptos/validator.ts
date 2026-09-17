

import type { ScriptLine, Scene, Character } from '@/types/screenplay';

export interface LintIssue {
  line: number;
  type: 'error' | 'warning' | 'info';
  message: string;
  rule: string;
}

export function validateScript(lines: ScriptLine[], content: string, scenes: Scene[] = [], characters: Character[] = []): LintIssue[] {
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

  // ── Structure checks from the shared parser (single source of truth) ──
  // These used to run through a second, private parser (lib/advanced-parser.ts)
  // that disagreed with what the editor renders. Now they read the same
  // scenes/characters the editor and Studio use.
  const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (scenes.length > 0) {
    let runningWords = 0;
    const totalWords = scenes.reduce((n, s) => n + (s.wordCount || 0), 0);
    const cast = new Set(characters.map((c) => norm(c.name)).filter(Boolean));
    const seenCharacters = new Set<string>();

    // A character named in action text counts as already "introduced".
    for (const line of lines) {
      if (line.type === 'action') {
        const upper = line.text.toUpperCase();
        cast.forEach((name) => {
          if (name.length > 2 && upper.includes(name)) seenCharacters.add(name);
        });
      }
    }

    scenes.forEach((scene, sceneIndex) => {
      if (scene.wordCount && scene.wordCount > 750) {
        issues.push({
          line: scene.startIndex + 1,
          type: 'info',
          message: `Cinematic Polish: This scene is very dense (~${scene.wordCount} words). Consider breaking it up or ensuring pacing remains high.`,
          rule: 'scene-length',
        });
      }

      // First-speech introduction + monologue detection, from the shared lines.
      let blockWords = 0;
      for (const line of lines.slice(scene.startIndex, scene.endIndex + 1)) {
        if (line.type === 'character') {
          blockWords = 0;
          const name = line.meta?.characterName || norm(line.text);
          if (name && !seenCharacters.has(name) && !name.includes('V.O.') && !name.includes('O.S.')) {
            seenCharacters.add(name);
            issues.push({
              line: line.index + 1,
              type: 'info',
              message: `Character "${name}" speaks for the first time here. Ensure they are properly introduced in action lines prior to this.`,
              rule: 'character-intro',
            });
          }
        } else if (line.type === 'parenthetical') {
          blockWords = 0;
        } else if (line.type === 'dialogue') {
          blockWords += line.text.split(/\s+/).filter(Boolean).length;
          if (blockWords > 100) {
            issues.push({
              line: line.index + 1,
              type: 'info',
              message: `Monologue detected (${blockWords} words). Ensure this lengthy speech is structurally earned.`,
              rule: 'dialogue-length',
            });
          }
        }
      }

      runningWords += scene.wordCount || 0;
      if (totalWords > 5000) {
        const percentProgress = runningWords / totalWords;
        if (percentProgress > 0.35 && sceneIndex < scenes.length * 0.2 && (scene.wordCount || 0) > 500) {
          issues.push({
            line: scene.startIndex + 1,
            type: 'warning',
            message: "Structural Pacing: Act I seems to be dragging. You are 35% through the script's word count but still in early scenes.",
            rule: 'act1-pacing',
          });
        }
      }
    });
  }

  return issues.sort((a, b) => a.line - b.line);
}
