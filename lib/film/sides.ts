// Sides: each called actor's pages for a shoot day — the scenes of that day
// they are in, in shooting order, with their own lines marked. Pure; takes the
// day's scenes as the Studio already holds them (heading + the scene's lines).

export interface SidesWho { character: string; actor: string | null; call: string | null }
export interface DayScriptScene { heading: string; sceneNumber: string | number | null; lines: { type: string; text: string }[] }
export interface SidesLine { type: string; text: string; mine: boolean }
export interface SidesScene { heading: string; sceneNumber: string | null; lines: SidesLine[] }
export interface Sides {
  character: string;
  actor: string | null;
  call: string | null;
  scenes: SidesScene[];
  /** Speeches the character has across these scenes. */
  lineCount: number;
}

/** A character cue as a bare name: "maya (V.O.)" → "MAYA". */
export function cueName(cue: string): string {
  return cue.replace(/\([^)]*\)/g, '').replace(/[@^]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
}

const SKIPPED: ReadonlySet<string> = new Set(['note', 'boneyard', 'pagebreak', 'section', 'synopsis']);
const SPEECH: ReadonlySet<string> = new Set(['dialogue', 'parenthetical', 'lyric']);

/** `dayScenes` are in shooting order. A character with no scene that day gets no entry. */
export function buildSides(dayScenes: DayScriptScene[], who: SidesWho[]): Sides[] {
  const out: Sides[] = [];
  for (const w of who) {
    const name = cueName(w.character);
    const scenes: SidesScene[] = [];
    let lineCount = 0;
    for (const scene of dayScenes) {
      const lines: SidesLine[] = [];
      let speaking = false;
      let present = false;
      for (const l of scene.lines) {
        if (l.type === 'empty' || !l.text.trim()) { speaking = false; continue; }
        if (SKIPPED.has(l.type)) continue;
        if (l.type === 'character') {
          speaking = cueName(l.text) === name;
          if (speaking) { present = true; lineCount += 1; }
        } else if (!SPEECH.has(l.type)) speaking = false;
        lines.push({ type: l.type, text: l.text, mine: speaking && (l.type === 'character' || SPEECH.has(l.type)) });
      }
      if (present) scenes.push({ heading: scene.heading, sceneNumber: scene.sceneNumber == null ? null : String(scene.sceneNumber), lines });
    }
    if (scenes.length) out.push({ character: name, actor: w.actor, call: w.call, scenes, lineCount });
  }
  return out;
}

/** The first words of a line with the rest hidden, so a performer can test themselves: "You’re late, again." → "You’re late…". Short lines show one word. */
export function lineHint(text: string, words = 2): string {
  const parts = text.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '…';
  const keep = parts.length <= 3 ? 1 : words;
  return `${parts.slice(0, keep).join(' ')}…`;
}

/** Whether a marked line is one the performer speaks (their dialogue, parentheticals and lyrics), as opposed to their cue name or a heading. */
export const isSpokenLine = (l: { type: string; mine: boolean }): boolean => l.mine && SPEECH.has(l.type);
