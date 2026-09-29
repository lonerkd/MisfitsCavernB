// ScriptOS reads the brief out of the screenplay: each option's `detect`
// (public.brief_questions) says how to find it — words in action lines,
// night exteriors in scene headings, a child's age in a character intro —
// and scanScript returns what it found, scene by scene.

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

interface Line { type: string; text: string }
interface DetectableOption { id: string; label: string; detect?: Detect }
interface DetectableQuestion { key: string; options: DetectableOption[] }

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Whole words, with an optional plural / past / -ing ending ("punch" → "punches", "punched"). */
export function wordPattern(words: string[]): RegExp | null {
  const alts = words.map((w) => w.trim().toLowerCase()).filter(Boolean).map((w) => escape(w).replace(/\s+/g, '\\s+'));
  if (!alts.length) return null;
  return new RegExp(`\\b(?:${alts.join('|')})(?:s|es|ed|d|ing)?\\b`, 'gi');
}

const EXTERIOR = /^(?:EXT|I\/E|INT\.?\s*\/\s*EXT|EXT\.?\s*\/\s*INT)\b/i;
const AGE_INTRO = /\b[A-Z][A-Z' -]{1,30}\s*\((\d{1,2})\)/g;

/** Scan the script's lines for every option that says how to be found. */
export function scanScript(lines: Line[], questions: DetectableQuestion[]): Evidence[] {
  // Split into scenes: heading line + the action under it.
  const scenes: { heading: string; action: string[] }[] = [];
  for (const l of lines) {
    if (l.type === 'slug') scenes.push({ heading: l.text.trim(), action: [] });
    else if (l.type === 'action' && scenes.length) scenes[scenes.length - 1].action.push(l.text);
  }

  const out: Evidence[] = [];
  for (const q of questions) {
    for (const o of q.options) {
      const d = o.detect;
      if (!d) continue;
      const found = new Map<number, Set<string>>();
      const add = (i: number, hit: string) => { const s = found.get(i) ?? new Set<string>(); s.add(hit); found.set(i, s); };
      const re = d.words?.length ? wordPattern(d.words) : null;
      scenes.forEach((sc, i) => {
        if (d.night_exteriors && EXTERIOR.test(sc.heading) && /\bNIGHT\b/i.test(sc.heading)) add(i, sc.heading);
        for (const text of sc.action) {
          if (re) for (const m of text.matchAll(re)) add(i, m[0].toLowerCase());
          if (d.ages_under != null) {
            for (const m of text.matchAll(AGE_INTRO)) if (Number(m[1]) < d.ages_under) add(i, m[0].trim());
          }
        }
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

/** "scene 3", "scenes 3 and 7", "scenes 2, 5, 9 and 4 more". */
export function sceneList(scenes: number[]): string {
  if (scenes.length === 1) return `scene ${scenes[0]}`;
  const shown = scenes.slice(0, 3);
  const more = scenes.length - shown.length;
  if (more > 0) return `scenes ${shown.join(', ')} and ${more} more`;
  return `scenes ${shown.slice(0, -1).join(', ')} and ${shown[shown.length - 1]}`;
}
