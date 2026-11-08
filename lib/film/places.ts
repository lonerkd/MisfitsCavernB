// A scene's place, read through the film graph: the linked location's current
// name when the scene points at one, else the heading's own text. Renaming a
// location therefore renames it for every scene that points at it, in every
// tool that reads through here. Pure.

import { locationKey } from '../studio/locations';

export interface ScenePlaceInput {
  location?: string | null;
  location_id?: string | null;
}

/** The key (upper-cased name) a scene's place is filed under; '' when it has none. */
export function placeKeyOf(scene: ScenePlaceInput, places: Iterable<{ id: string; name: string }>): string {
  const id = scene.location_id;
  if (id) {
    for (const p of places) if (p.id === id) return locationKey(p.name);
  }
  return locationKey(scene.location);
}

/** The same lookup for many scenes: build the index once. */
export function placeResolver(places: Iterable<{ id: string; name: string }>): (scene: ScenePlaceInput) => string {
  const byId = new Map<string, string>();
  for (const p of places) byId.set(p.id, locationKey(p.name));
  return (scene) => (scene.location_id ? byId.get(scene.location_id) : undefined) ?? locationKey(scene.location);
}
