// Consistency warnings about the characters of a script, read from its own parse (no stored data, no schema). Each rule is conservative
// and says WHY it is warning, so a writer can judge in a second and dismiss it when it is on purpose. Pure: lines and scenes in,
// warnings out. A name a person has said is not a character (reading_corrections) is never flagged.
import type { ScriptLine, Scene } from './types';

export type CharacterRule = 'spelling' | 'speaks-before-intro' | 'speaks-after-death' | 'single-line' | 'never-speaks';

export interface CharacterWarning {
  /** Stable across edits (rule plus the names), so a dismissal survives the script changing. */
  id: string;
  rule: CharacterRule;
  /** 'warn' for something probably wrong, 'info' for something worth a look. */
  severity: 'warn' | 'info';
  /** The characters it is about, as the script spells them. */
  characters: string[];
  /** The sentence shown to the person. */
  message: string;
  /** Why the check fired, in plain words. */
  reason: string;
  /** The line (0-based, the editor's line index) to jump to, and the scene it is in (0-based), when known. */
  line: number;
  scene: number | null;
}

export const RULE_LABELS: Record<CharacterRule, string> = {
  spelling: 'Spelled two ways',
  'speaks-before-intro': 'Speaks before being introduced',
  'speaks-after-death': 'Speaks after dying',
  'single-line': 'One line only',
  'never-speaks': 'Never speaks',
};

/** A cue's character, without "(V.O.)", "(CONT'D)" and the like: those are not misspellings. */
export function cueName(line: ScriptLine): string {
  const given = line.meta?.characterName;
  return (given || line.text).trim().replace(/^[@^]\s*/, '').replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
}
const isVoiceCue = (line: ScriptLine) => /\((?:[^)]*\b)?(?:V\.?O\.?|O\.?S\.?|O\.?C\.?|VOICE|OFFSCREEN|OFF SCREEN)\b[^)]*\)/i.test(line.text);

/** A name's comparable form: capitals, letters and digits only ("DR. SMITH" and "DR SMITH" are one). */
export const nameKey = (n: string) => n.toUpperCase().replace(/[’']/g, '').replace(/[^\p{L}\p{N}]+/gu, '');

/**
 * Two numbered or lettered roles are different characters, not one misspelled: COP #1 and COP #2, GUARD A and GUARD B, WAITER 1 and WAITER 2.
 * True when the names are the same apart from a trailing number, or a trailing single letter set off by a space or #, and those differ.
 */
export function areNumberedRoles(a: string, b: string): boolean {
  const split = (n: string) => {
    const m = /^(.*?)[\s#]*(\d+|(?<=[\s#])[A-Za-z])$/.exec(n.trim());
    return m ? { stem: nameKey(m[1]), marker: m[2].toUpperCase() } : null;
  };
  const x = split(a);
  const y = split(b);
  return !!x && !!y && x.stem.length > 0 && x.stem === y.stem && x.marker !== y.marker;
}

export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const up = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = up;
    }
  }
  return prev[b.length];
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const sceneOfLine = (scenes: Scene[], i: number): number | null => {
  const k = scenes.findIndex((s) => i >= s.startIndex && i <= s.endIndex);
  return k >= 0 ? k : null;
};
const OTHER_TIME = /\b(FLASHBACK|DREAM|MEMORY|VISION|IMAGINED|FANTASY|HALLUCINATION|EARLIER|PAST|BEFORE|(?:19|20)\d\d)\b/i;
const DEATH = '(?:dies|is killed|is shot dead|falls dead|drops dead|is dead|lies dead|is murdered|is executed)';
const DOUBT = /\b(almost|nearly|not|n't|if|unless|fake|fakes|pretend|pretends|threaten|threatens|wants|could|would|might|will|never)\b/i;
const AGE = '(?:\\((?:[^)]*\\b)?\\d{1,2}s?\\b[^)]*\\)|,\\s*(?:early |mid |late )?\\d{1,2}s?\\s*,)';

interface Cue { name: string; key: string; line: number; scene: number | null; voice: boolean }

export function checkCharacters(lines: ScriptLine[], scenes: Scene[], opts: { rejectedNames?: readonly string[] } = {}): CharacterWarning[] {
  const rejected = new Set((opts.rejectedNames ?? []).map(nameKey));
  const cues: Cue[] = [];
  for (const l of lines) {
    if (l.type !== 'character') continue;
    const name = cueName(l);
    if (!name || rejected.has(nameKey(name))) continue;
    cues.push({ name, key: nameKey(name), line: l.index, scene: sceneOfLine(scenes, l.index), voice: isVoiceCue(l) });
  }
  const out: CharacterWarning[] = [];
  const byName = new Map<string, Cue[]>();
  for (const c of cues) byName.set(c.name, [...(byName.get(c.name) ?? []), c]);
  const names = [...byName.keys()];

  // 1. A name spelled two ways: the same letters apart from case, spacing or punctuation, or one letter apart and rare.
  const seen = new Set<string>();
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const a = names[i], b = names[j];
      const ka = nameKey(a), kb = nameKey(b);
      const sameLetters = ka === kb;
      const [common, rare] = byName.get(a)!.length >= byName.get(b)!.length ? [a, b] : [b, a];
      let near = false;
      if (!sameLetters && !areNumberedRoles(a, b) && Math.min(ka.length, kb.length) >= 4 && editDistance(ka, kb) === 1) {
        const together = byName.get(common)!.some((c) => byName.get(rare)!.some((r) => r.scene !== null && r.scene === c.scene));
        near = byName.get(rare)!.length <= 2 && !together;
      }
      if (!sameLetters && !near) continue;
      const id = `spelling:${[ka, kb].sort().join('|')}`;
      if (seen.has(id)) continue;
      seen.add(id);
      const at = byName.get(rare)![0];
      out.push({
        id, rule: 'spelling', severity: 'warn', characters: [common, rare], line: at.line, scene: at.scene,
        message: `${rare} and ${common} look like one character spelled two ways.`,
        reason: sameLetters
          ? 'The two names have the same letters and differ only in capitals, spacing or punctuation.'
          : `${rare} speaks ${byName.get(rare)!.length === 1 ? 'once' : 'twice'}, is one letter from ${common}, and never shares a scene with them.`,
      });
    }
  }

  // The actions that introduce or kill a character.
  const actions = lines.filter((l) => l.type === 'action');
  for (const name of names) {
    const mine = byName.get(name)!;
    const spoken = mine.filter((c) => !c.voice);
    if (spoken.length > 0) {
      const first = spoken[0];
      const intro = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(name.toUpperCase())}(?![\\p{L}\\p{N}])`, 'u');
      // 2. Speaks before being introduced in capitals in action.
      const introLine = actions.find((l) => intro.test(l.text));
      if (introLine && introLine.index > first.line) {
        out.push({
          id: `speaks-before-intro:${nameKey(name)}`, rule: 'speaks-before-intro', severity: 'info', characters: [name], line: first.line, scene: first.scene,
          message: `${name} speaks before the action introduces them.`,
          reason: `Their first line is at line ${first.line + 1}; the action first names them in capitals at line ${introLine.index + 1}.`,
        });
      }

      // 3. Speaks after a death beat (a clear phrase, no doubt words, no flashbacks).
      const nm = escapeRe(name);
      const deathRes = [
        new RegExp(`(?<![\\p{L}\\p{N}])${nm}(?:\\s[a-z]+){0,2}\\s${DEATH}\\b`, 'giu'),
        new RegExp(`(?<![\\p{L}\\p{N}])${nm}[’']s (?:lifeless )?(?:body|corpse)\\b`, 'giu'),
        new RegExp(`\\b(?:body|corpse) of ${nm}(?![\\p{L}\\p{N}])`, 'giu'),
      ];
      let death: ScriptLine | null = null;
      for (const l of actions) {
        for (const re of deathRes) {
          for (const m of l.text.matchAll(re)) {
            const startsLikeName = /^(?:body|corpse)/i.test(m[0]) || m[0][0] === m[0][0].toUpperCase();
            if (startsLikeName && !DOUBT.test(m[0])) { death = l; break; }
          }
          if (death) break;
        }
        if (death) break;
      }
      if (death) {
        const dead = death;
        const deathScene = sceneOfLine(scenes, dead.index);
        const otherTime = (s: number | null) => s !== null && OTHER_TIME.test(scenes[s]?.heading ?? '');
        const after = otherTime(deathScene) ? undefined : spoken.find((c) => c.line > dead.index && !otherTime(c.scene));
        if (after) {
          out.push({
            id: `speaks-after-death:${nameKey(name)}`, rule: 'speaks-after-death', severity: 'warn', characters: [name], line: after.line, scene: after.scene,
            message: `${name} speaks after the action says they are dead.`,
            reason: `Line ${dead.index + 1} reads "${dead.text.trim().slice(0, 90)}"; they speak again at line ${after.line + 1}, in no flashback or dream heading.`,
          });
        }
      }
    }

    // 4. Exactly one line.
    if (mine.length === 1) {
      out.push({
        id: `single-line:${nameKey(name)}`, rule: 'single-line', severity: 'info', characters: [name], line: mine[0].line, scene: mine[0].scene,
        message: `${name} has exactly one line.`,
        reason: 'They speak once in the whole script. Fine for a small part; a candidate to merge into another character or into action.',
      });
    }
  }

  // 5. Introduced in action with an age ("MAYA (30s)") but never a cue.
  const cueKeys = new Set(cues.map((c) => c.key));
  const spokenWords = new Set(cues.flatMap((c) => c.name.toUpperCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean)));
  const nameRe = new RegExp(`(?<![\\p{L}\\p{N}])([A-Z][A-Z'’.-]+(?: [A-Z][A-Z'’.-]+){0,2})\\s*${AGE}`, 'gu');
  const flagged = new Set<string>();
  for (const l of actions) {
    for (const m of l.text.matchAll(nameRe)) {
      const name = m[1].trim();
      const k = nameKey(name);
      if (k.length < 3 || cueKeys.has(k) || rejected.has(k) || flagged.has(k) || name.split(' ').some((w) => spokenWords.has(w))) continue;
      flagged.add(k);
      out.push({
        id: `never-speaks:${k}`, rule: 'never-speaks', severity: 'info', characters: [name], line: l.index, scene: sceneOfLine(scenes, l.index),
        message: `${name} is introduced in the action but never speaks.`,
        reason: `Line ${l.index + 1} introduces them with an age, and no line of dialogue is ever theirs. Fine for a silent role.`,
      });
    }
  }

  return out.sort((x, y) => (x.severity === y.severity ? x.line - y.line : x.severity === 'warn' ? -1 : 1));
}

/** The warnings that are about one character. */
export const warningsFor = (all: CharacterWarning[], name: string) => all.filter((w) => w.characters.some((c) => c.toUpperCase() === name.toUpperCase()));
