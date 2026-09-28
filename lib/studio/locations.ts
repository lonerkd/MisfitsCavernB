// Locations: the script's scene locations joined to their records
// (project_locations), and whether each is ready to shoot at. Pure.

export type LocationStatus = 'scouting' | 'option' | 'confirmed';
export type PermitState = 'unknown' | 'not_needed' | 'needed' | 'applied' | 'granted';

export const LOCATION_STATUS: { id: LocationStatus; label: string; hint: string }[] = [
  { id: 'scouting', label: 'Scouting', hint: 'Still looking' },
  { id: 'option', label: 'On hold', hint: 'Pencilled in, not agreed' },
  { id: 'confirmed', label: 'Confirmed', hint: 'Agreed with the owner' },
];

export const PERMIT_STATE: { id: PermitState; label: string }[] = [
  { id: 'unknown', label: 'Permit: not checked' },
  { id: 'not_needed', label: 'No permit needed' },
  { id: 'needed', label: 'Permit needed' },
  { id: 'applied', label: 'Permit applied for' },
  { id: 'granted', label: 'Permit granted' },
];

export interface LocationRecord {
  id: string;
  name: string;
  address: string | null;
  contact: string | null;
  status: string;
  permit: string;
  cost: number | null;
  notes: string | null;
}

export interface SceneAtLocation {
  id: string;
  scene_number: number;
  location: string | null;
  heading: string | null;
  shoot_day: number | null;
  time_of_day?: string | null;
}

export interface LocationRow {
  name: string;
  record: LocationRecord | null;
  scenes: SceneAtLocation[];
  days: number[];
  exterior: boolean;
  night: boolean;
}

/** The key a heading's location is filed under. */
export const locationKey = (name: string | null | undefined) => (name ?? '').trim().toUpperCase();

/** Every location in the script, with its record; then records the script doesn't use. */
export function locationRows(scenes: SceneAtLocation[], records: LocationRecord[]): LocationRow[] {
  const byName = new Map<string, SceneAtLocation[]>();
  for (const sc of scenes) {
    const key = locationKey(sc.location);
    if (!key) continue;
    const list = byName.get(key);
    if (list) list.push(sc); else byName.set(key, [sc]);
  }
  const recordOf = new Map(records.map((r) => [locationKey(r.name), r]));
  const rows: LocationRow[] = Array.from(byName.entries()).map(([name, list]) => {
    const sorted = [...list].sort((a, b) => a.scene_number - b.scene_number);
    const headings = sorted.map((s) => (s.heading ?? '').toUpperCase());
    return {
      name,
      record: recordOf.get(name) ?? null,
      scenes: sorted,
      days: Array.from(new Set(sorted.map((s) => s.shoot_day).filter((d): d is number => d != null && d > 0))).sort((a, b) => a - b),
      exterior: headings.some((h) => /^(EXT|I\/E|INT\/EXT|EXT\/INT)\b/.test(h)),
      night: headings.some((h) => /\bNIGHT\b/.test(h)),
    };
  });
  rows.sort((a, b) => b.scenes.length - a.scenes.length || a.name.localeCompare(b.name));
  const extra = records.filter((r) => !byName.has(locationKey(r.name)))
    .map((r) => ({ name: locationKey(r.name), record: r, scenes: [], days: [], exterior: false, night: false }));
  return [...rows, ...extra.sort((a, b) => a.name.localeCompare(b.name))];
}

/** Can the production shoot here? Confirmed, with any permit it needs granted. */
export function locationReadiness(name: string, record: Pick<LocationRecord, 'status' | 'permit'> | null | undefined): { ready: boolean; detail: string } {
  if (!record) return { ready: false, detail: `${name} not scouted` };
  if (record.status !== 'confirmed') return { ready: false, detail: `${name} ${record.status === 'option' ? 'on hold, not confirmed' : 'not confirmed'}` };
  if (record.permit === 'needed' || record.permit === 'applied') return { ready: false, detail: `${name} permit ${record.permit === 'applied' ? 'pending' : 'needed'}` };
  return { ready: true, detail: '' };
}

export const mapHref = (address: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
