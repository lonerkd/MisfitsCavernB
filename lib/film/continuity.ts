// Continuity: how each character looks, scene by scene, read against story
// time. A character who looks one way and then another within the same story
// day is either a costume change or a mistake — this says which scenes to
// check. Pure.

export interface ContinuityScene { id: string; scene_number: number; story_day: number | null }
export interface ContinuityState { scene_id: string; character_id: string; look: string }

export interface LookChange {
  character_id: string;
  story_day: number;
  /** Scene numbers, in story order: the last scene with the old look, then the first with the new. */
  from: { scene: number; look: string };
  to: { scene: number; look: string };
}

const norm = (v: string) => v.trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * Every place a character's look changes inside one story day, in scene order.
 * Scenes with no story day, no look, or an empty look are skipped, not guessed at.
 */
export function lookChanges(scenes: ContinuityScene[], states: ContinuityState[]): LookChange[] {
  const sceneOf = new Map(scenes.map((s) => [s.id, s]));
  const byCharacter = new Map<string, { scene: ContinuityScene; look: string }[]>();
  for (const st of states) {
    const scene = sceneOf.get(st.scene_id);
    if (!scene || scene.story_day == null || !norm(st.look)) continue;
    byCharacter.set(st.character_id, [...(byCharacter.get(st.character_id) ?? []), { scene, look: st.look.trim() }]);
  }
  const out: LookChange[] = [];
  for (const [character_id, rows] of byCharacter) {
    rows.sort((a, b) => a.scene.scene_number - b.scene.scene_number);
    for (let i = 1; i < rows.length; i++) {
      const prev = rows[i - 1];
      const cur = rows[i];
      if (prev.scene.story_day === cur.scene.story_day && norm(prev.look) !== norm(cur.look)) {
        out.push({
          character_id, story_day: cur.scene.story_day!,
          from: { scene: prev.scene.scene_number, look: prev.look },
          to: { scene: cur.scene.scene_number, look: cur.look },
        });
      }
    }
  }
  return out.sort((a, b) => a.story_day - b.story_day || a.to.scene - b.to.scene);
}

/** One plain sentence for a change. */
export function lookChangeText(name: string, c: LookChange): string {
  return `${name}: scene ${c.from.scene} “${c.from.look}” then scene ${c.to.scene} “${c.to.look}”, both on day ${c.story_day}.`;
}

/** Scenes grouped by story day, in story order; scenes with no day come last. */
export function byStoryDay<T extends { story_day: number | null; scene_number: number }>(scenes: T[]): { day: number | null; scenes: T[] }[] {
  const groups = new Map<number | null, T[]>();
  for (const s of scenes) groups.set(s.story_day, [...(groups.get(s.story_day) ?? []), s]);
  return Array.from(groups.entries())
    .sort(([a], [b]) => (a === null ? 1 : b === null ? -1 : a - b))
    .map(([day, list]) => ({ day, scenes: list.sort((a, b) => a.scene_number - b.scene_number) }));
}
