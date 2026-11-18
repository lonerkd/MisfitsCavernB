// The sound spotting list: what the sound department must create, find or fix, scene by scene. Pure.

export const SPOT_KINDS = ['effect', 'foley', 'ambience', 'dialogue fix', 'ADR', 'walla', 'other'] as const;
export type SpotKind = (typeof SPOT_KINDS)[number];
export const SPOT_STATUSES = ['to spot', 'sourced', 'cut', 'approved'] as const;
export type SpotStatus = (typeof SPOT_STATUSES)[number];

export interface Spot {
  id: string;
  scene_ids?: string[];
  character_id?: string | null;
  scene: string;
  tc: string;
  kind: SpotKind;
  note: string;
  source: string;
  status: SpotStatus;
}

export interface SpotSummary { total: number; done: number; scenes: number; byKind: Array<[SpotKind, number]> }

/** Counts for the header: how many items, how many approved, over how many scenes, and the mix of types (most numerous first). */
export function spotSummary(spots: readonly Spot[]): SpotSummary {
  const kinds = new Map<SpotKind, number>();
  const scenes = new Set<string>();
  let done = 0;
  for (const s of spots) {
    if (s.status === 'approved') done += 1;
    kinds.set(s.kind, (kinds.get(s.kind) ?? 0) + 1);
    const key = (s.scene_ids?.length ? s.scene_ids.join(',') : s.scene.trim().toLowerCase());
    if (key) scenes.add(key);
  }
  return { total: spots.length, done, scenes: scenes.size, byKind: [...kinds.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])) };
}
