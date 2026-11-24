// The graph half of renaming a place from the script (the text half is lib/scriptos/rename.ts): the `project_locations` record takes the
// new name, so every scene linked to it, the stripboard, the call sheet and the Locations list follow. A sentence when it cannot.
//
// Naming a place the project ALREADY has ("THE KITCHEN" → "KITCHEN") is choosing it: the headings are rewritten to that place and the scenes
// join it when the script next syncs. The record being left behind is NOT deleted (it may hold a permit, a contact, a cost): it stays in
// Locations for the person to merge or remove.
import { studio } from '@/lib/studio';
import { locationKey } from '@/lib/studio/locations';

export type PlaceChange =
  | { action: 'rename'; id: string }
  | { action: 'choose'; existing: string; leftBehind: string | null }
  | { action: 'text-only' };

/** What renaming the place `from` to `to` means for the project's location records. Pure. */
export function planPlaceChange(places: { id: string; name: string }[], from: string, to: string): PlaceChange {
  const source = places.find((p) => locationKey(p.name) === locationKey(from));
  const target = places.find((p) => locationKey(p.name) === locationKey(to));
  if (target && target.id !== source?.id) return { action: 'choose', existing: target.name, leftBehind: source?.name ?? null };
  if (source) return { action: 'rename', id: source.id };
  return { action: 'text-only' };
}

/** The names of the project's places, for the rename field to offer (choosing one folds this place into it). */
export async function placeNames(projectId: string): Promise<string[]> {
  try {
    return (await studio.listLocations(projectId)).map((p) => p.name).sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

/** Returns what happened, or a sentence when it cannot. */
export async function renameLocationRecord(projectId: string, from: string, to: string): Promise<{ change: PlaceChange } | { problem: string }> {
  try {
    const places = await studio.listLocations(projectId);
    const change = planPlaceChange(places, from, to);
    if (change.action === 'rename') await studio.renameLocation(change.id, to);
    return { change };
  } catch (e) {
    return { problem: e instanceof Error ? e.message : 'Could not rename the location' };
  }
}
