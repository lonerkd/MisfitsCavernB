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

/**
 * scene id → the ids of the characters linked to it, in the same name order
 * as `castByScene`: index i of this list is the character whose name is index
 * i of that one, so a name and its id can be zipped into one entry.
 */
export function castIdsByScene(links: SceneCharacterLink[], characters: NamedCharacter[]): Map<string, string[]> {
  const nameOf = new Map(characters.map((c) => [c.id, normal(c.name)]));
  const out = new Map<string, string[]>();
  for (const l of links) {
    if (!nameOf.has(l.character_id)) continue;
    const list = out.get(l.scene_id);
    if (list) list.push(l.character_id); else out.set(l.scene_id, [l.character_id]);
  }
  for (const list of out.values()) list.sort((a, b) => (nameOf.get(a) ?? '').localeCompare(nameOf.get(b) ?? ''));
  return out;
}

/** The ids of one scene's linked characters, in name order (see `castIdsByScene`). */
export function castIdsOfScene(scene: { id: string }, byScene: Map<string, string[]>): string[] {
  return byScene.get(scene.id) ?? [];
}
