// The suite's context as priors (L5 of the deep-brain plan, the rung after B7): what the rest of the suite already knows
// about a project, in the form the reader can weigh. Pure: where the rows come from (lib/studio/api.ts
// listSuitePriorRows, under the reader's own access) is the caller's business.
//
// The one rule that shapes it (the plan, "B7, and one rule that shapes it"): only what a PERSON put into the suite goes in,
// so a wrong read can never confirm itself on the next one. So:
//
//   - a character bible entry counts only when a person wrote something in it (a description, a backstory, a full name,
//     an age, notes ...) or gave it a look-board; the editor saves an empty entry for every name it reads, and an empty
//     entry is the reader's own output, not evidence;
//   - a breakdown element counts (a person tagged it, or accepted the suggestion); one in the Cast category is a
//     character, one in an object category (props, wardrobe, vehicles, effects, sound, equipment, set dressing, hair and
//     makeup) is a THING: a line that is only its name is evidence against a cue. Extras, stunts and a project's own
//     categories say nothing either way (an extra may speak);
//   - a casting candidate means someone is casting that role: the role is a character;
//   - the `characters` and `scene_characters` rows are NOT used: the scene sync writes them from the reader's output.
//
// And a person's word always wins over the suite's: a name someone said is not a character is never made a cue by the
// bible or the breakdown (it is listed as overruled, so the panel can say so), a name someone confirmed (or cast) is never
// held back as a thing, and a line override is fixed before any prior is weighed (parser.ts decode()).
//
// Crew and the brief are deliberately not priors. A crew member's real name says nothing about the lines of a script (an
// actor may play themselves; a writer's name on a title page is read by the title-page rules), and putting people's names
// into the reader's explanations would show them where they do not belong. The brief's answers (genre, runtime, goals)
// carry no evidence about how a line is written; the script's format already chooses the grammar (reading-format.ts).

import type { ParseContext } from './parser';

/** Where the suite's knowledge that a name is a character comes from. */
export type PersonSource = 'cast' | 'confirmed' | 'bible' | 'breakdown' | 'casting';

/** How each source is said in an explanation ("Known to the project: in the cast, in the character bible"). */
export const PERSON_SOURCE_LABEL: Record<PersonSource, string> = {
  cast: 'in the cast',
  confirmed: 'among the confirmed characters',
  bible: 'in the character bible',
  breakdown: 'tagged as cast in the breakdown',
  casting: 'in casting (a role with candidates)',
};

/** The breakdown categories (by their key, lib/breakdown) whose elements are things, never speakers. */
export const THING_CATEGORY_KEYS: ReadonlySet<string> = new Set(['props', 'wardrobe', 'makeup', 'set-dressing', 'vehicles', 'sfx', 'vfx', 'sound', 'equipment']);
/** The breakdown category whose elements are characters. */
export const CAST_CATEGORY_KEY = 'cast';

export interface SuitePerson { name: string; source: PersonSource; /** For a bible full name: the cue name it belongs to. */ aliasOf?: string }
export interface SuiteThing { name: string; /** The category's label, as the project calls it ("Props"). */ category: string }
export interface Overruled {
  name: string;
  /** What the suite said. */
  said: PersonSource | 'thing';
  /** The person's word that stands instead: they said it is not a character, or that it is one. */
  because: 'not_character' | 'character';
}

/** What the suite knows, in the reader's terms. Kept on the ParseContext as `suite`. */
export interface SuitePriors {
  people: ReadonlyArray<SuitePerson>;
  things: ReadonlyArray<SuiteThing>;
  /** What the suite said that a person's word overrules: shown, never used. */
  overruled: ReadonlyArray<Overruled>;
}

/** The rows the priors are read from, as the database keeps them. */
export interface SuiteRows {
  /** This script's character bible (`script_characters`). */
  bible?: ReadonlyArray<{ id?: string | null; name: string; full_name?: string | null; age?: string | null; description?: string | null; backstory?: string | null; motivation?: string | null; arc?: string | null; relationships?: string | null; notes?: string | null }>;
  /** The bible entries that have a look-board (`character_media.character_id`). */
  lookBoards?: ReadonlyArray<{ character_id: string }>;
  /** The project's breakdown elements with their category's key and label. */
  elements?: ReadonlyArray<{ name: string; category_key: string; category_label: string }>;
  /** The project's casting candidates (`casting_candidates.character_name`: the role). */
  candidates?: ReadonlyArray<{ character_name: string }>;
}

/** A name as the reader compares it: capitals, single spaces, no extension. */
export const priorKey = (name: string): string => name.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();

/** A full name that can stand as a cue: letters, at most four words, not the name itself. */
const aliasShape = (full: string): boolean => /^[\p{L}][\p{L}'’.\- ]*$/u.test(full) && full.split(/\s+/).length <= 4 && full.length <= 40;

const BIBLE_FIELDS = ['full_name', 'age', 'description', 'backstory', 'motivation', 'arc', 'relationships', 'notes'] as const;

/**
 * Which rows are a person's evidence, and what each says. Deterministic: the same rows give the same priors in the same
 * order, so every surface that reads a script with them reads it the same way.
 */
export function suitePriorsFromRows(rows: SuiteRows): SuitePriors {
  const people: SuitePerson[] = [];
  const things: SuiteThing[] = [];
  const boarded = new Set((rows.lookBoards ?? []).map((b) => b.character_id));
  for (const b of rows.bible ?? []) {
    const name = priorKey(b.name ?? '');
    if (!name) continue;
    const written = BIBLE_FIELDS.some((f) => (b[f] ?? '').trim() !== '') || (!!b.id && boarded.has(b.id));
    if (!written) continue; // an entry with nothing in it is the editor's, not a person's
    people.push({ name, source: 'bible' });
    const full = (b.full_name ?? '').trim();
    if (full && priorKey(full) !== name && aliasShape(full)) people.push({ name: priorKey(full), source: 'bible', aliasOf: name });
  }
  for (const e of rows.elements ?? []) {
    const name = priorKey(e.name ?? '');
    if (!name) continue;
    if (e.category_key === CAST_CATEGORY_KEY) people.push({ name, source: 'breakdown' });
    else if (THING_CATEGORY_KEYS.has(e.category_key)) things.push({ name, category: e.category_label || e.category_key });
  }
  for (const c of rows.candidates ?? []) {
    const name = priorKey(c.character_name ?? '');
    if (name) people.push({ name, source: 'casting' });
  }
  return { people: dedupePeople(people), things: dedupeThings(things), overruled: [] };
}

function dedupePeople(people: SuitePerson[]): SuitePerson[] {
  const seen = new Set<string>();
  const out: SuitePerson[] = [];
  for (const p of people) { const k = `${p.name}|${p.source}`; if (!seen.has(k)) { seen.add(k); out.push(p); } }
  return out.sort((a, b) => a.name.localeCompare(b.name) || a.source.localeCompare(b.source));
}

function dedupeThings(things: SuiteThing[]): SuiteThing[] {
  const by = new Map<string, SuiteThing>();
  for (const t of things) if (!by.has(t.name)) by.set(t.name, t);
  return [...by.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * The context with the suite's priors in it, a person's word kept above them: a rejected name loses every suite source
 * that says it is a character, and a name someone cast, confirmed or the suite names as a character is never a thing.
 * The cast and the confirmed names already in the context are recorded as sources too, so every explanation can say
 * where a name came from. Pure; the result is what the parser reads.
 */
export function withSuitePriors(context: ParseContext, priors: SuitePriors | null | undefined): ParseContext {
  const rejected = new Set([...(context.rejectedNames ?? []), ...(context.writerMemory?.rejectedNames ?? [])].map(priorKey));
  const overruled: Overruled[] = [...(context.suite?.overruled ?? [])];
  // The names a person gave the project directly (cast, confirmed: contextFromProject records them), and any other name the
  // context already believes (a writer's own confirmed names), so every explanation can say where a name came from.
  const people: SuitePerson[] = (context.suite?.people ?? []).filter((p) => !rejected.has(p.name));
  const direct = new Set(people.map((p) => p.name));
  for (const name of [...(context.characters ?? []), ...(context.writerMemory?.confirmedNames ?? [])].map(priorKey)) {
    if (name && !direct.has(name) && !rejected.has(name)) { people.push({ name, source: 'confirmed' }); direct.add(name); }
  }
  for (const p of priors?.people ?? []) {
    if (rejected.has(p.name) || (p.aliasOf && rejected.has(p.aliasOf))) { overruled.push({ name: p.name, said: p.source, because: 'not_character' }); continue; }
    people.push(p);
  }
  const personNames = new Set(people.map((p) => p.name));
  const things: SuiteThing[] = [...(context.suite?.things ?? []).filter((t) => !personNames.has(t.name))];
  for (const t of priors?.things ?? []) {
    if (personNames.has(t.name)) { overruled.push({ name: t.name, said: 'thing', because: 'character' }); continue; }
    if (!things.some((x) => x.name === t.name)) things.push(t);
  }
  const characters = Array.from(new Set([...(context.characters ?? []), ...people.map((p) => p.name)]));
  return {
    ...context,
    characters,
    suite: { people: dedupePeople(people), things: dedupeThings(things), overruled: dedupeOverruled(overruled) },
  };
}

function dedupeOverruled(xs: Overruled[]): Overruled[] {
  const seen = new Set<string>();
  return xs.filter((x) => { const k = `${x.name}|${x.said}|${x.because}`; if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => a.name.localeCompare(b.name) || a.said.localeCompare(b.said));
}

/** How a line's reading used the suite (parser.ts explainFromContext writes it on `meta.suite`). */
export interface LineSuiteNote {
  /** The name or thing the note is about. */
  name: string;
  /** `for`: the suite knows it as a character and the line is read as its cue. `against`: it is a thing and the line is not read as a cue. `disagrees`: the suite says thing, the script makes it speak. */
  effect: 'for' | 'against' | 'disagrees';
  /** The sources, said the way the explanation says them. */
  said: string[];
}

/** What the suite added to a reading, for the panel: the names it vouched for, the lines it kept from being cues, and where the script and the suite disagree. */
export interface SuiteUse {
  /** Names the suite knows that this script reads as cues, with their sources. */
  vouched: Array<{ name: string; said: string[]; cues: number }>;
  /** Lines held back from being read as a cue because the production names the thing. */
  heldBack: Array<{ name: string; category: string; lines: number }>;
  /** Names the suite lists as things that the script still has speak (a person should settle it). */
  disagreements: Array<{ name: string; category: string; cues: number }>;
  /** What the suite said that a person's word overrules. */
  overruled: ReadonlyArray<Overruled>;
  /** How many names and things the suite gave the reader at all. */
  told: { people: number; things: number };
}

export function suiteUse(lines: ReadonlyArray<{ meta?: unknown }>, suite: SuitePriors | undefined): SuiteUse {
  const vouched = new Map<string, { name: string; said: string[]; cues: number }>();
  const held = new Map<string, { name: string; category: string; lines: number }>();
  const disagree = new Map<string, { name: string; category: string; cues: number }>();
  for (const l of lines) {
    const note = (l.meta as { suite?: LineSuiteNote } | undefined)?.suite;
    if (!note) continue;
    if (note.effect === 'for') { const v = vouched.get(note.name) ?? { name: note.name, said: note.said, cues: 0 }; v.cues++; vouched.set(note.name, v); }
    else if (note.effect === 'against') { const h = held.get(note.name) ?? { name: note.name, category: note.said[0] ?? '', lines: 0 }; h.lines++; held.set(note.name, h); }
    else { const d = disagree.get(note.name) ?? { name: note.name, category: note.said[0] ?? '', cues: 0 }; d.cues++; disagree.set(note.name, d); }
  }
  const byName = <T extends { name: string }>(m: Map<string, T>) => [...m.values()].sort((a, b) => a.name.localeCompare(b.name));
  return {
    vouched: byName(vouched),
    heldBack: byName(held),
    disagreements: byName(disagree),
    overruled: suite?.overruled ?? [],
    told: { people: new Set((suite?.people ?? []).map((p) => p.name)).size, things: suite?.things.length ?? 0 },
  };
}

/** True when the suite told the reader anything worth showing. */
export const hasSuiteUse = (u: SuiteUse): boolean => u.vouched.length > 0 || u.heldBack.length > 0 || u.disagreements.length > 0 || u.overruled.length > 0;
