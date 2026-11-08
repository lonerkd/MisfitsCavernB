// How a role-tool record names its scenes and character. A record links to real rows (`scene_ids`, `character_id`) and keeps
// the typed text as a label: the link wins when it resolves; a link that no longer resolves falls back to the label.

export interface LinkableScene { id: string; scene_number: number; heading: string | null; title: string }

/** "12 · INT. KITCHEN - DAY": how a scene is named in a picker. */
export function sceneOption(scene: LinkableScene): string {
  const name = (scene.heading || scene.title || '').trim();
  return name ? `${scene.scene_number} · ${name}` : String(scene.scene_number);
}

/** The label saved with a record that links scenes: their numbers, in the order linked ("12, 14"). */
export function sceneLabelFor(ids: string[], scenes: ReadonlyMap<string, LinkableScene>): string {
  return ids.map((id) => scenes.get(id)?.scene_number).filter((n): n is number => n !== undefined).join(', ');
}

/**
 * What to show on a record's chip: the scene numbers of the links that resolve; when none does (a scene that was deleted, or
 * one in a script not loaded), the typed label. Nothing at all when the record names no scene.
 */
export function sceneChip(record: { scene_ids?: string[]; scene?: string; scenes?: string }, scenes: ReadonlyMap<string, LinkableScene>): string {
  const linked = sceneLabelFor(record.scene_ids ?? [], scenes);
  if (linked) return linked;
  return (record.scene ?? record.scenes ?? '').trim();
}

/** A character record names: the linked character's name when it resolves, else the typed label. */
export function characterName(record: { character_id?: string | null; character?: string }, characters: ReadonlyMap<string, { name: string }>): string {
  const linked = record.character_id ? characters.get(record.character_id)?.name : undefined;
  return linked ?? (record.character ?? '').trim();
}
