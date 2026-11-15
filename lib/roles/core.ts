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

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const joinWith = (word: string) => (xs: string[]) => (xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} ${word} ${xs[xs.length - 1]}`);
const joinWords = joinWith('and');
const joinOr = joinWith('or');

/** The three kinds of information a member does not get by default; what a role sees of them is said out loud. */
const SENSITIVE: ReadonlyArray<{ read: string; write: string; thing: string }> = [
  { read: 'budget.read', write: 'budget.write', thing: 'the budget' },
  { read: 'casting.read', write: 'casting.decide', thing: 'casting submissions' },
  { read: 'paperwork.read', write: 'paperwork.write', thing: 'paperwork' },
];

export interface RoleDescription {
  /** What the role can do beyond adding to and editing the project's tools, in plain lower-case phrases. */
  can: string[];
  /** What the role cannot see or change among the budget, casting and paperwork. */
  cannot: string[];
  /** One sentence pair a person can read: who they are on the project, what they can do, what they cannot. */
  text: string;
}

/**
 * Says in words what a person on a project can and cannot do: the sentence on the invitation, in Recruit and on Your day.
 * `held` is the set of capabilities they hold (the database's answer, or `resolveCapabilities` for someone not yet on the
 * project); `tier` is the access they were given (a view-only member can read and never change).
 */
export function describeRole(a: { craft: string | null; tier: CrewTier; held: ReadonlySet<string>; defs: ReadonlyArray<CapabilityDef> }): RoleDescription {
  const sensitiveKeys = new Set(SENSITIVE.flatMap((s) => [s.read, s.write]));
  const can: string[] = [];
  for (const d of a.defs) {
    if (!a.held.has(d.key)) continue;
    if (sensitiveKeys.has(d.key)) continue; // said once, below, so "run" does not repeat "see"
    can.push(lower(d.label));
  }
  const cannot: string[] = [];
  for (const s of SENSITIVE) {
    const reads = a.held.has(s.read);
    const writes = a.held.has(s.write);
    if (writes) can.push(`run ${s.thing}`);
    else if (reads) { can.push(`see ${s.thing}`); cannot.push(`edit ${s.thing}`); }
    else cannot.push(`see ${s.thing}`);
  }
  const who = a.craft ?? (a.tier === 'viewer' ? 'Viewer' : 'Crew member');
  const head = a.tier === 'viewer' ? 'You can read the project but not change it' : "You can add to and edit the project's tools";
  let text = `${who}: ${head}${can.length ? `, and ${joinWords(can)}` : ''}.`;
  // "cannot see the budget, casting submissions or paperwork", then "or edit the budget": one verb per group.
  const unseen = cannot.filter((c) => c.startsWith('see ')).map((c) => c.slice(4));
  const uneditable = cannot.filter((c) => c.startsWith('edit ')).map((c) => c.slice(5));
  const parts = [unseen.length ? `see ${joinOr(unseen)}` : '', uneditable.length ? `edit ${joinOr(uneditable)}` : ''].filter(Boolean);
  if (parts.length) text += ` You cannot ${parts.join(' or ')}.`;
  return { can, cannot, text };
}
