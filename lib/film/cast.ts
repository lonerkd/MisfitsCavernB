// Who is in a scene. The film graph keeps this as rows (`scene_characters`, linking a
// scene to a character by id); `scenes.cast_list` is the older comma-separated text the
// database keeps in step with it. Read the rows; fall back to the text only for a scene
// that has no rows yet, so nothing disappears while the links catch up.

export interface SceneCharacterLink { scene_id: string; character_id: string }
export interface NamedCharacter { id: string; name: string }

const normal = (name: string) => name.trim().toUpperCase();

/** The old comma-separated text, as upper-case names. */
export function castFromText(castList: string | null | undefined): string[] {
  return (castList ?? '').split(',').map(normal).filter(Boolean);
}

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

/** The cast of one scene: its linked characters, else the text. */
export function castOfScene(scene: { id: string; cast_list: string | null }, byScene: Map<string, string[]>): string[] {
  return byScene.get(scene.id) ?? castFromText(scene.cast_list);
}
