// What a person's crafts let them do on a project, pure: no Supabase import, so it is safe anywhere (and in tests).
// The database decides (`internal.has_capability`); this mirrors it so the interface can show the same answer for
// someone else (the owner looking at a crew member) and, later, say it in words ("sees the script and the schedule…").

export type CrewTier = 'lead' | 'contributor' | 'viewer';

export interface CapabilityDef {
  key: string;
  label: string;
  area: string;
  /** True when it changes project data, so a view-only member never holds it. */
  edits: boolean;
}

/** craft name → the capabilities it grants (public.craft_capabilities). */
export type Templates = ReadonlyMap<string, ReadonlySet<string>>;

export interface MemberRights {
  tier: CrewTier;
  /** Their primary craft first, then any others they hold on the project. */
  crafts: ReadonlyArray<string>;
  /** The owner's per-person change: true adds a capability, false takes it away. */
  overrides: Readonly<Record<string, boolean>>;
}

export type CapabilitySource = 'craft' | 'granted' | 'removed' | 'tier' | null;

export function templatesFrom(rows: ReadonlyArray<{ craft: string; capability: string }>): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const r of rows) {
    const set = out.get(r.craft);
    if (set) set.add(r.capability); else out.set(r.craft, new Set([r.capability]));
  }
  return out;
}

/** Why a member does or does not hold one capability: what the interface shows beside a switch. */
export function capabilitySource(def: CapabilityDef, member: MemberRights, templates: Templates): CapabilitySource {
  const fromCraft = member.crafts.some((c) => templates.get(c)?.has(def.key));
  const override = member.overrides[def.key];
  const wanted = override ?? fromCraft;
  if (wanted && def.edits && member.tier === 'viewer') return 'tier'; // would hold it, but the tier is the ceiling
  if (override === true) return 'granted';
  if (override === false) return fromCraft ? 'removed' : null;
  return fromCraft ? 'craft' : null;
}

/** The capabilities a confirmed member holds (the owner holds all: not modelled here). */
export function resolveCapabilities(defs: ReadonlyArray<CapabilityDef>, member: MemberRights, templates: Templates): Set<string> {
  const held = new Set<string>();
  for (const d of defs) {
    const s = capabilitySource(d, member, templates);
    if (s === 'craft' || s === 'granted') held.add(d.key);
  }
  return held;
}

/** Capabilities grouped by area, in the order the list gives them. */
export function groupByArea(defs: ReadonlyArray<CapabilityDef>): Array<{ area: string; defs: CapabilityDef[] }> {
  const out: Array<{ area: string; defs: CapabilityDef[] }> = [];
  for (const d of defs) {
    const g = out.find((x) => x.area === d.area);
    if (g) g.defs.push(d); else out.push({ area: d.area, defs: [d] });
  }
  return out;
}
