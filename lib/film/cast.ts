// Who is in a scene. The film graph keeps this as rows (`scene_characters`, linking a
// scene to a character by id). The script's cast cue is turned into those rows when the
// script's scenes are synced; nothing is kept as text.

export interface SceneCharacterLink { scene_id: string; character_id: string }
export interface NamedCharacter { id: string; name: string }

const normal = (name: string) => name.trim().toUpperCase();

/** scene id → the upper-case names of the characters linked to it, in character-name order. */
export function castByScene(links: SceneCharacterLink[], characters: NamedCharacter[]): Map<string, string[]> {
  const nameOf = new Map(characters.map((c) => [c.id, normal(c.name)]));
  const out = new Map<string, string[]>();
  for (const l of links) {
    const name = nameOf.get(l.character_id);
    if (!name) continue;
    const list = out.get(l.scene_id);
    if (list) list.push(name); else out.set(l.scene_id, [name]);
  }
  for (const list of out.values()) list.sort((a, b) => a.localeCompare(b));
  return out;
}

/** The cast of one scene: its linked characters. */
export function castOfScene(scene: { id: string }, byScene: Map<string, string[]>): string[] {
  return byScene.get(scene.id) ?? [];
}
