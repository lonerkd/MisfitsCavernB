// The breakdown, pure: finding elements in the script, suggesting tags, and
// costing it. No network. The data lives in breakdown_categories,
// breakdown_elements and scene_elements (see the 20260927010000 migration);
// suggestions come from the script but are only ever offered, never written.

import { extractElementsFromAction } from '@/lib/scriptos/parser';

export type BreakdownCategory = {
  id: string;
  project_id: string;
  key: string;
  label: string;
  color: string;
  position: number;
  unit_cost: number;
  created_at: string;
};

export type ElementStatus = 'needed' | 'sourcing' | 'ready';
export const ELEMENT_STATUSES: ElementStatus[] = ['needed', 'sourcing', 'ready'];

export type BreakdownElement = {
  id: string;
  project_id: string;
  category_id: string;
  name: string;
  notes: string | null;
  status: ElementStatus;
  cost: number | null;
  assigned_to: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type SceneElementTag = {
  scene_id: string;
  element_id: string;
  project_id: string;
  created_by: string | null;
  created_at: string;
};

/** The identity of a name: "The Revolver", "the revolver's" and "REVOLVER" differ; "revolver" == "Revolver". */
export function nameKey(name: string): string {
  return name.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

export interface Mention {
  start: number;
  end: number;
  /** The element (or name) the text refers to. */
  name: string;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Where each name appears in `text` — whole words, any case, allowing a
 * plural or possessive ("revolver", "Revolvers", "REVOLVER'S"). Longer names
 * win where they overlap ("red scarf" over "scarf").
 */
export function findMentions(text: string, names: string[]): Mention[] {
  const unique = Array.from(new Set(names.map((n) => n.trim()).filter(Boolean))).sort((a, b) => b.length - a.length);
  const taken: Mention[] = [];
  for (const name of unique) {
    const pattern = escapeRe(name).replace(/\s+/g, '\\s+');
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${pattern}(?:'s|’s|s|es)?(?![\\p{L}\\p{N}])`, 'giu');
    for (const m of Array.from(text.matchAll(re))) {
      const start = m.index ?? 0;
      const end = start + m[0].length;
      if (taken.some((t) => start < t.end && end > t.start)) continue;
      taken.push({ start, end, name });
    }
  }
  return taken.sort((a, b) => a.start - b.start);
}

// The parser's element hints, mapped to the category keys projects start with.
// A project that renamed or removed a key falls back to its first category.
const HINT_TO_KEY: Record<string, string> = { props: 'props', wardrobe: 'wardrobe', vehicles: 'vehicles', sfx: 'sound', vfx: 'vfx' };

export interface Suggestion {
  name: string;
  categoryId: string;
  /** In the project already, mentioned here but not tagged — or spotted by the script's CAPS convention. */
  reason: 'mentioned' | 'detected';
  elementId?: string;
}

/**
 * What to offer for one scene: project elements its action mentions but that
 * aren't tagged here, then new things the writer CAPITALISED (the industry
 * convention for flagging elements), minus anything tagged or dismissed.
 */
export function suggestForScene(input: {
  actionText: string;
  characters: string[];
  taggedElementIds: Set<string>;
  elements: BreakdownElement[];
  categories: BreakdownCategory[];
  dismissed: Set<string>;
}): Suggestion[] {
  const { actionText, characters, taggedElementIds, elements, categories, dismissed } = input;
  if (!categories.length || !actionText.trim()) return [];
  const out: Suggestion[] = [];
  const seen = new Set<string>();
  const byKey = new Map(elements.map((e) => [nameKey(e.name), e]));

  const mentioned = new Set(findMentions(actionText, elements.map((e) => e.name)).map((m) => nameKey(m.name)));
  for (const e of elements) {
    const k = nameKey(e.name);
    seen.add(k);
    if (taggedElementIds.has(e.id) || dismissed.has(k) || !mentioned.has(k)) continue;
    out.push({ name: e.name, categoryId: e.category_id, reason: 'mentioned', elementId: e.id });
  }

  const fallback = categories.find((c) => c.key === 'props') ?? [...categories].sort((a, b) => a.position - b.position)[0];
  const detected = extractElementsFromAction(actionText, characters);
  for (const [hint, names] of Object.entries(detected)) {
    const category = categories.find((c) => c.key === HINT_TO_KEY[hint]) ?? fallback;
    for (const raw of names) {
      const k = nameKey(raw);
      if (!k || seen.has(k) || dismissed.has(k) || byKey.has(k)) continue;
      seen.add(k);
      out.push({ name: titleCase(raw), categoryId: category.id, reason: 'detected' });
    }
  }
  return out;
}

/** "REVOLVER" → "Revolver"; mixed case is kept as written. */
export function titleCase(s: string): string {
  if (s !== s.toUpperCase()) return s;
  return s.toLowerCase().replace(/(^|[\s/-])(\p{L})/gu, (_, p: string, c: string) => p + c.toUpperCase());
}

export interface CategoryCost {
  category: BreakdownCategory;
  elements: number;
  amount: number;
  /** Elements with no cost of their own in a category with no unit cost. */
  unpriced: number;
}

/** The breakdown's cost per category: each element's cost, or its category's unit cost. */
export function costByCategory(categories: BreakdownCategory[], elements: BreakdownElement[]): CategoryCost[] {
  return [...categories]
    .sort((a, b) => a.position - b.position)
    .map((category) => {
      const own = elements.filter((e) => e.category_id === category.id);
      const unitCost = Number(category.unit_cost) || 0;
      return {
        category,
        elements: own.length,
        amount: own.reduce((sum, e) => sum + (e.cost != null ? Number(e.cost) : unitCost), 0),
        unpriced: own.filter((e) => e.cost == null && unitCost === 0).length,
      };
    })
    .filter((c) => c.elements > 0);
}

export interface SceneGroup {
  category: BreakdownCategory;
  elements: BreakdownElement[];
}

/** A scene's tagged elements, grouped by category in the project's order. */
export function groupForScene(sceneId: string, tags: SceneElementTag[], elements: BreakdownElement[], categories: BreakdownCategory[]): SceneGroup[] {
  const ids = new Set(tags.filter((t) => t.scene_id === sceneId).map((t) => t.element_id));
  const mine = elements.filter((e) => ids.has(e.id));
  return [...categories]
    .sort((a, b) => a.position - b.position)
    .map((category) => ({ category, elements: mine.filter((e) => e.category_id === category.id).sort((a, b) => a.name.localeCompare(b.name)) }))
    .filter((g) => g.elements.length > 0);
}

/** A key for a new category from its label ("Hair & Makeup" → "hair-makeup"), unique among `taken`. */
export function categoryKey(label: string, taken: Set<string>): string {
  const base = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 36) || 'category';
  let key = base;
  for (let i = 2; taken.has(key); i++) key = `${base}-${i}`;
  return key;
}
