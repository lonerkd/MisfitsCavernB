// World building (4.11): locations, lore, rules, timeline, continuity.

export type WorldLocation = { id: string; name: string; description: string; mood: string; lat?: number; lng?: number };

export type WorldLore = { id: string; title: string; body: string };

export type WorldRule = { id: string; rule: string };

export type WorldTimelineEvent = { id: string; when: string; what: string };

export type World = {
  projectId: string;
  locations: WorldLocation[];
  lore: WorldLore[];
  rules: WorldRule[];
  timeline: WorldTimelineEvent[];
};

export function emptyWorld(projectId: string): World {
  return { projectId, locations: [], lore: [], rules: [], timeline: [] };
}

export function addLocation(w: World, loc: WorldLocation): World {
  return { ...w, locations: [...w.locations, loc] };
}
