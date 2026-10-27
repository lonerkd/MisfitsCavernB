// The card: what the suite shows when you open a scene, character, location or
// shoot day — its facts, what the film graph connects it to, and what has been
// attached to it. Pure: the component only draws this.

import type { Entity, EntityKind, Link } from './links';

export interface CardScene {
  id: string;
  scene_number: number;
  heading: string | null;
  title: string;
  time_of_day: string | null;
  location: string | null;
  location_id: string | null;
  shoot_day: number | null;
  shoot_day_id: string | null;
}
export interface CardPlace { id: string; name: string }
export interface CardDay { id: string; day_number: number; shoot_date: string | null }
export interface CardCharacter { id: string; name: string }

export interface CardInput {
  entities: Entity[];
  links: Link[];
  scenes: CardScene[];
  characters: CardCharacter[];
  places: CardPlace[];
  days: CardDay[];
  /** scene id → upper-case names of the cast (graph first). */
  castOf: (scene: CardScene) => string[];
  sceneCharacters: Array<{ scene_id: string; character_id: string }>;
}

export interface CardItem { id: string; label: string; kind: EntityKind }
export interface CardGroup { title: string; items: CardItem[] }
export interface Card {
  id: string;
  kind: EntityKind;
  title: string;
  facts: Array<{ label: string; value: string }>;
  /** What the film graph itself connects this to (scenes, characters, place, day). */
  connected: CardGroup[];
  /** What has been attached with a link (tasks, documents, media, …), by kind. */
  attached: CardGroup[];
}

const GROUP_TITLE: Record<EntityKind, string> = {
  scene: 'Scenes', character: 'Characters', location: 'Locations', shoot_day: 'Days',
  task: 'Tasks', document: 'Documents', media: 'Media',
};
const KIND_ORDER: EntityKind[] = ['task', 'document', 'media', 'scene', 'character', 'location', 'shoot_day'];

const key = (s: string | null | undefined) => (s ?? '').trim().toUpperCase();
const sceneLabel = (s: CardScene) => `${s.scene_number}. ${s.heading?.trim() || s.title}`;
const byNumber = (a: CardScene, b: CardScene) => a.scene_number - b.scene_number;

function sceneItems(list: CardScene[]): CardItem[] {
  return [...list].sort(byNumber).map((s) => ({ id: s.id, label: sceneLabel(s), kind: 'scene' as const }));
}

/** The place a scene is set, by id, else by name. */
function placeOf(scene: CardScene, places: CardPlace[]): CardPlace | undefined {
  return places.find((p) => p.id === scene.location_id) ?? places.find((p) => key(p.name) === key(scene.location));
}
/** The shoot day a scene is on, by id, else by number. */
function dayOf(scene: CardScene, days: CardDay[]): CardDay | undefined {
  return days.find((d) => d.id === scene.shoot_day_id) ?? (scene.shoot_day != null ? days.find((d) => d.day_number === scene.shoot_day) : undefined);
}

function attachedTo(id: string, input: CardInput): CardGroup[] {
  const byId = new Map(input.entities.map((e) => [e.id, e]));
  const seen = new Set<string>();
  const groups = new Map<EntityKind, CardItem[]>();
  for (const l of input.links) {
    const other = l.from_entity === id ? l.to_entity : l.to_entity === id ? l.from_entity : null;
    if (!other || seen.has(other)) continue;
    const e = byId.get(other);
    if (!e) continue;
    seen.add(other);
    const list = groups.get(e.kind) ?? [];
    list.push({ id: e.id, label: e.label, kind: e.kind });
    groups.set(e.kind, list);
  }
  return KIND_ORDER.filter((k) => groups.has(k)).map((k) => ({
    title: GROUP_TITLE[k],
    items: groups.get(k)!.sort((a, b) => a.label.localeCompare(b.label)),
  }));
}

/** The card for an entity, or null when it isn't one the card knows (yet). */
export function cardOf(id: string, input: CardInput): Card | null {
  const entity = input.entities.find((e) => e.id === id);
  if (!entity) return null;
  const attached = attachedTo(id, input);
  const base = { id, kind: entity.kind, title: entity.label, attached };

  if (entity.kind === 'scene') {
    const scene = input.scenes.find((s) => s.id === id);
    if (!scene) return { ...base, facts: [], connected: [] };
    const place = placeOf(scene, input.places);
    const day = dayOf(scene, input.days);
    const cast = input.sceneCharacters
      .filter((l) => l.scene_id === id)
      .map((l) => input.characters.find((c) => c.id === l.character_id))
      .filter((c): c is CardCharacter => !!c)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => ({ id: c.id, label: c.name, kind: 'character' as const }));
    const connected: CardGroup[] = [];
    if (cast.length) connected.push({ title: 'Characters', items: cast });
    if (place) connected.push({ title: 'Location', items: [{ id: place.id, label: place.name, kind: 'location' }] });
    if (day) connected.push({ title: 'Shoots on', items: [{ id: day.id, label: `Day ${day.day_number}`, kind: 'shoot_day' }] });
    const facts: Card['facts'] = [];
    if (scene.time_of_day) facts.push({ label: 'Time', value: scene.time_of_day });
    if (!place && scene.location) facts.push({ label: 'Location', value: scene.location });
    if (!day) facts.push({ label: 'Schedule', value: 'Not scheduled yet' });
    if (!cast.length) {
      const names = input.castOf(scene);
      if (names.length) facts.push({ label: 'Cast', value: names.join(', ') });
    }
    return { ...base, facts, connected };
  }

  if (entity.kind === 'character') {
    const inScenes = input.sceneCharacters.filter((l) => l.character_id === id).map((l) => l.scene_id);
    const scenes = input.scenes.filter((s) => inScenes.includes(s.id));
    return {
      ...base,
      facts: [{ label: 'Appears in', value: `${scenes.length} scene${scenes.length === 1 ? '' : 's'}` }],
      connected: scenes.length ? [{ title: 'Scenes', items: sceneItems(scenes) }] : [],
    };
  }

  if (entity.kind === 'location') {
    const place = input.places.find((p) => p.id === id);
    const scenes = input.scenes.filter((s) => s.location_id === id || (!s.location_id && place && key(s.location) === key(place.name)));
    return {
      ...base,
      facts: [{ label: 'Scenes here', value: String(scenes.length) }],
      connected: scenes.length ? [{ title: 'Scenes', items: sceneItems(scenes) }] : [],
    };
  }

  if (entity.kind === 'shoot_day') {
    const day = input.days.find((d) => d.id === id);
    const scenes = input.scenes.filter((s) => s.shoot_day_id === id || (!s.shoot_day_id && day && s.shoot_day === day.day_number));
    const facts: Card['facts'] = [{ label: 'Scenes', value: String(scenes.length) }];
    if (day?.shoot_date) facts.unshift({ label: 'Date', value: day.shoot_date });
    return { ...base, facts, connected: scenes.length ? [{ title: 'Scenes', items: sceneItems(scenes) }] : [] };
  }

  // task, document, media: their own tools draw them; the card shows what they are attached to.
  return { ...base, facts: [], connected: [] };
}
