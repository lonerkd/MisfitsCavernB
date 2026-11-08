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

/** What the role tools that link scenes are called where their records are counted. */
export const RECORD_KIND_LABEL: Record<string, string> = {
  cameraReports: 'Camera reports', soundReports: 'Sound reports', scriptNotes: 'Script notes', directorNotes: 'Director notes',
  vfxShots: 'VFX shots', costumes: 'Costumes', makeup: 'Makeup', stills: 'Stills', extras: 'Extras', rehearsals: 'Rehearsals',
};

export interface RecordLink { kind: string; scene_ids: string[] }
export interface KindCount { kind: string; label: string; count: number }

/** For each scene, how many records of each tool are linked to it (a scene with none is absent), tools in a fixed order. */
export function recordsByScene(links: ReadonlyArray<RecordLink>): Map<string, KindCount[]> {
  const counts = new Map<string, Map<string, number>>();
  for (const l of links) {
    for (const id of l.scene_ids) {
      const per = counts.get(id) ?? new Map<string, number>();
      per.set(l.kind, (per.get(l.kind) ?? 0) + 1);
      counts.set(id, per);
    }
  }
  const order = Object.keys(RECORD_KIND_LABEL);
  const out = new Map<string, KindCount[]>();
  for (const [id, per] of counts) {
    out.set(id, [...per.entries()]
      .sort((a, b) => (order.indexOf(a[0]) + 1 || 99) - (order.indexOf(b[0]) + 1 || 99))
      .map(([kind, count]) => ({ kind, label: RECORD_KIND_LABEL[kind] ?? kind, count })));
  }
  return out;
}

/** The total across tools, for a chip. */
export function recordTotal(counts: ReadonlyArray<KindCount> | undefined): number {
  return (counts ?? []).reduce((n, c) => n + c.count, 0);
}

/**
 * The scenes (numbers) a record is for that its character is NOT in. A report, never a change: a look planned for a scene the
 * character does not appear in is worth a second look. Only linked scenes and a known character are judged; a scene that
 * names no cast at all is not judged either (nothing says who is in it yet).
 */
export function scenesWithoutCharacter(
  record: { scene_ids?: string[]; character_id?: string | null; character?: string },
  scenes: ReadonlyMap<string, LinkableScene>,
  characters: ReadonlyMap<string, { name: string }>,
  castOf: (sceneId: string) => string[],
): number[] {
  const name = record.character_id ? characters.get(record.character_id)?.name : undefined;
  if (!name) return [];
  const key = name.trim().toUpperCase();
  const out: number[] = [];
  for (const id of record.scene_ids ?? []) {
    const scene = scenes.get(id);
    if (!scene) continue;
    const cast = castOf(id);
    if (cast.length === 0) continue;
    if (!cast.includes(key)) out.push(scene.scene_number);
  }
  return out;
}
