// ============================================================================
// SCRIPTOS CHARACTER STATISTICS ENGINE
// Deep analysis of character presence, dialogue weight, and relationships
// ============================================================================

import type { ScriptLine, Scene } from '@/types/screenplay';

export interface CharacterStats {
  name: string;
  dialogueLines: number;
  dialogueWords: number;
  sceneAppearances: number;
  scenesIn: number[];           // indices of scenes this character appears in
  firstAppearance: number;      // line index
  lastAppearance: number;       // line index
  dialoguePercentage: number;   // % of total dialogue
  avgWordsPerLine: number;
  speaksTo: Record<string, number>; // who they share scenes/dialogue with
}

export function analyzeCharacters(lines: ScriptLine[], scenes: Scene[]): CharacterStats[] {
  const stats = new Map<string, CharacterStats>();
  let totalDialogueWords = 0;
  let currentCharacter: string | null = null;

  // Pass 1: Gather raw stats
  lines.forEach((line, i) => {
    if (line.type === 'character') {
      const name = line.text.trim().replace(/\s*\(.*?\)\s*/g, '').trim();
      if (!name) return;

      currentCharacter = name;

      if (!stats.has(name)) {
        stats.set(name, {
          name,
          dialogueLines: 0,
          dialogueWords: 0,
          sceneAppearances: 0,
          scenesIn: [],
          firstAppearance: i,
          lastAppearance: i,
          dialoguePercentage: 0,
          avgWordsPerLine: 0,
          speaksTo: {},
        });
      }
      const s = stats.get(name)!;
      s.lastAppearance = i;
      s.sceneAppearances++;
    }

    if (line.type === 'dialogue' && currentCharacter) {
      const s = stats.get(currentCharacter);
      if (s) {
        s.dialogueLines++;
        const wc = line.text.split(/\s+/).filter(Boolean).length;
        s.dialogueWords += wc;
        totalDialogueWords += wc;
      }
    }

    if (line.type === 'slug' || line.type === 'transition') {
      currentCharacter = null;
    }
  });

  // Pass 2: Scene appearances
  scenes.forEach((scene, sceneIdx) => {
    scene.characters.forEach(charName => {
      const s = stats.get(charName);
      if (s && !s.scenesIn.includes(sceneIdx)) {
        s.scenesIn.push(sceneIdx);
      }
    });

    // Build "speaks to" relationships
    const sceneChars = scene.characters;
    for (let a = 0; a < sceneChars.length; a++) {
      for (let b = a + 1; b < sceneChars.length; b++) {
        const sA = stats.get(sceneChars[a]);
        const sB = stats.get(sceneChars[b]);
        if (sA) sA.speaksTo[sceneChars[b]] = (sA.speaksTo[sceneChars[b]] || 0) + 1;
        if (sB) sB.speaksTo[sceneChars[a]] = (sB.speaksTo[sceneChars[a]] || 0) + 1;
      }
    }
  });

  // Pass 3: Compute derived stats
  const result = Array.from(stats.values()).map(s => ({
    ...s,
    dialoguePercentage: totalDialogueWords > 0
      ? Math.round((s.dialogueWords / totalDialogueWords) * 100)
      : 0,
    avgWordsPerLine: s.dialogueLines > 0
      ? Math.round(s.dialogueWords / s.dialogueLines)
      : 0,
  }));

  // Sort by dialogue word count descending
  result.sort((a, b) => b.dialogueWords - a.dialogueWords);

  return result;
}
