// ScriptOS reads the brief out of the screenplay: each option's `detect`
// (public.brief_questions) says how to find it — words in action lines,
// night exteriors in scene headings, a child's age in a character intro.
// Each kind of evidence is its own extractor; scanScript splits the script
// into scenes and composes them. Nothing here knows the brief engine
// (core.ts) — only the screenplay's lines.

export interface Detect { words?: string[]; night_exteriors?: boolean; ages_under?: number }

export interface Evidence {
  question: string;
  option: string;
  label: string;
  /** Scene numbers (1-based, in script order) where it was found. */
  scenes: number[];
  /** What was found, as written ("punches", "EXT. FOREST - NIGHT"). */
  hits: string[];
}

export interface Line { type: string; text: string }
export interface DetectableOption { id: string; label: string; detect?: Detect }
export interface DetectableQuestion { key: string; options: DetectableOption[] }
export interface SceneText { heading: string; action: string[] }

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Whole words, with an optional plural / past / -ing ending ("punch" → "punches", "punched"). */
export function wordPattern(words: string[]): RegExp | null {
  const alts = words.map((w) => w.trim().toLowerCase()).filter(Boolean).map((w) => escape(w).replace(/\s+/g, '\\s+'));
  if (!alts.length) return null;
  return new RegExp(`\\b(?:${alts.join('|')})(?:s|es|ed|d|ing)?\\b`, 'gi');
}

const EXTERIOR = /^(?:EXT|I\/E|INT\.?\s*\/\s*EXT|EXT\.?\s*\/\s*INT)\b/i;
const AGE_INTRO = /\b[A-Z][A-Z' -]{1,30}\s*\((\d{1,2})\)/g;

/** Split the lines into scenes: heading line + the action under it (action before the first heading is dropped). */
export function splitScenes(lines: Line[]): SceneText[] {
  const scenes: SceneText[] = [];
  for (const l of lines) {
    if (l.type === 'slug') scenes.push({ heading: l.text.trim(), action: [] });
    else if (l.type === 'action' && scenes.length) scenes[scenes.length - 1].action.push(l.text);
  }
  return scenes;
}

/** The extractors: what one heading or one action line shows, as written. */
export function nightExteriorHits(heading: string): string[] {
  return EXTERIOR.test(heading) && /\bNIGHT\b/i.test(heading) ? [heading] : [];
}

export function wordHits(text: string, re: RegExp): string[] {
  return [...text.matchAll(re)].map((m) => m[0].toLowerCase());
}

export function ageHits(text: string, under: number): string[] {
  return [...text.matchAll(AGE_INTRO)].filter((m) => Number(m[1]) < under).map((m) => m[0].trim());
}

/** Everything one `detect` rule finds in one scene, in reading order. */
export function detectInScene(scene: SceneText, d: Detect, re: RegExp | null): string[] {
  const hits = d.night_exteriors ? nightExteriorHits(scene.heading) : [];
  for (const text of scene.action) {
    if (re) hits.push(...wordHits(text, re));
    if (d.ages_under != null) hits.push(...ageHits(text, d.ages_under));
  }
  return hits;
}

/** Scan the script's lines for every option that says how to be found. */
export function scanScript(lines: Line[], questions: DetectableQuestion[]): Evidence[] {
  const scenes = splitScenes(lines);
  const out: Evidence[] = [];
  for (const q of questions) {
    for (const o of q.options) {
      const d = o.detect;
      if (!d) continue;
      const re = d.words?.length ? wordPattern(d.words) : null;
      const found = new Map<number, Set<string>>();
      scenes.forEach((sc, i) => {
        const hits = detectInScene(sc, d, re);
        if (hits.length) found.set(i, new Set(hits));
      });
      if (!found.size) continue;
      const order = [...found.keys()].sort((a, b) => a - b);
      out.push({
        question: q.key, option: o.id, label: o.label,
        scenes: order.map((i) => i + 1),
        hits: [...new Set(order.flatMap((i) => [...found.get(i)!]))].slice(0, 6),
      });
    }
  }
  return out;
}
