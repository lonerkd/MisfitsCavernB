// The cue card: what the film knows about the character whose cue the caret
// is on — who plays them, how they look in this scene, how much they speak.
// Read only. Pure.

import { cueName } from './sides';

export interface CueCard {
  name: string;
  /** Who plays them (the casting's username), or null. */
  actor: string | null;
  /** Their look in this scene (continuity), or null when none is written. */
  look: string | null;
  /** Speeches and scenes across the script, when the parse has them. */
  speeches: number | null;
  scenes: number | null;
}

/** `cue` is the line's text ("MAYA (V.O.)"); null when it names no one. */
export function cueCard(input: {
  cue: string;
  sceneId: string | null;
  actor: string | null | undefined;
  stats: { dialogueLines: number; sceneAppearances: number } | null | undefined;
  characters: { id: string; name: string }[];
  states: { scene_id: string; character_id: string; look: string }[];
}): CueCard | null {
  const name = cueName(input.cue);
  if (!name) return null;
  const id = input.characters.find((c) => c.name === name)?.id;
  const look = id && input.sceneId ? input.states.find((s) => s.scene_id === input.sceneId && s.character_id === id)?.look.trim() : '';
  return {
    name,
    actor: input.actor || null,
    look: look || null,
    speeches: input.stats?.dialogueLines ?? null,
    scenes: input.stats?.sceneAppearances ?? null,
  };
}

/** The card as one sentence, for a screen reader. */
export function cueCardLabel(c: CueCard): string {
  return [
    c.name,
    c.actor ? `played by ${c.actor}` : 'not cast yet',
    c.look ? `look in this scene: ${c.look}` : 'no look written for this scene',
    c.speeches != null ? `${c.speeches} ${c.speeches === 1 ? 'speech' : 'speeches'}` : '',
    c.scenes != null ? `${c.scenes} ${c.scenes === 1 ? 'scene' : 'scenes'}` : '',
  ].filter(Boolean).join(', ');
}
