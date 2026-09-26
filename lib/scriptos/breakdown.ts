// Pure, offline breakdown/budget core. No Supabase, no network — this is the
// deterministic part of the "script -> props/wardrobe/vehicles/sfx/vfx -> budget"
// bridge. The Supabase write path (lib/supabase/breakdown.ts) is a thin adapter
// over this.

export const ELEMENT_CATEGORIES = ['props', 'wardrobe', 'vehicles', 'sfx', 'vfx'] as const;
export type ElementCategory = (typeof ELEMENT_CATEGORIES)[number];

// The shape stored on a scene row (arrays are optional: a scene may have no
// elements for a given category).
export interface SceneElements {
  props?: string[];
  wardrobe?: string[];
  vehicles?: string[];
  sfx?: string[];
  vfx?: string[];
}

// Rough per-item cost estimates, used to synthesise a first-pass budget line
// per category. Deliberately configurable so a production can tune them.
export const BUDGET_RATE: Record<ElementCategory, number> = {
  props: 75,
  wardrobe: 120,
  vehicles: 400,
  sfx: 300,
  vfx: 500,
};

const items = (n: number) => `${n} item${n === 1 ? '' : 's'}`;

export const CATEGORY_LABEL: Record<ElementCategory, (n: number) => string> = {
  props: (n) => `Props (${items(n)})`,
  wardrobe: (n) => `Wardrobe (${items(n)})`,
  vehicles: (n) => `Vehicles (${n})`,
  sfx: (n) => `Special FX (${n})`,
  vfx: (n) => `Visual FX (${n})`,
};

export const CATEGORY_PREFIX: Record<ElementCategory, string> = {
  props: 'Props (',
  wardrobe: 'Wardrobe (',
  vehicles: 'Vehicles (',
  sfx: 'Special FX (',
  vfx: 'Visual FX (',
};

/** Merge per-scene element lists into one de-duplicated list per category. */
export function aggregateElements(scenes: { elements?: SceneElements }[]): Record<ElementCategory, string[]> {
  const out: Record<ElementCategory, Set<string>> = {
    props: new Set(),
    wardrobe: new Set(),
    vehicles: new Set(),
    sfx: new Set(),
    vfx: new Set(),
  };
  for (const scene of scenes) {
    for (const cat of ELEMENT_CATEGORIES) {
      for (const item of scene.elements?.[cat] || []) out[cat].add(item);
    }
  }
  return {
    props: Array.from(out.props),
    wardrobe: Array.from(out.wardrobe),
    vehicles: Array.from(out.vehicles),
    sfx: Array.from(out.sfx),
    vfx: Array.from(out.vfx),
  };
}

export interface BudgetLine {
  category: string;
  count: number;
  amount: number;
}

/** Synthesise a budget line per non-empty category (count × rate). */
export function computeBudgetLines(aggregated: Record<ElementCategory, string[]>): BudgetLine[] {
  const lines: BudgetLine[] = [];
  for (const cat of ELEMENT_CATEGORIES) {
    const count = aggregated[cat].length;
    if (count === 0) continue;
    lines.push({
      category: CATEGORY_LABEL[cat](count),
      count,
      amount: count * BUDGET_RATE[cat],
    });
  }
  return lines;
}
// Lines a breakdown can't count as tagged items: speaking roles and the
// shooting days implied by page count.
export const CAST_RATE = 500;
export const CREW_RATE_PER_PAGE = 200;

/**
 * First-pass budget from a parsed script: one line per speaking-role count,
 * per tagged element category, and camera & crew by page count (8 eighths =
 * 1 page, at least one page).
 */
export function estimateBudgetFromScript(script: {
  characters?: unknown[];
  scenes: { eighths?: number; elements?: SceneElements }[];
}): { category: string; amount: number }[] {
  const cast = script.characters?.length ?? 0;
  const pages = Math.max(1, Math.round(script.scenes.reduce((s, sc) => s + (sc.eighths || 0), 0) / 8));
  return [
    ...(cast ? [{ category: `Cast (${cast} role${cast === 1 ? '' : 's'})`, amount: cast * CAST_RATE }] : []),
    ...computeBudgetLines(aggregateElements(script.scenes)).map(({ category, amount }) => ({ category, amount })),
    { category: `Camera & Crew (${pages} pg)`, amount: pages * CREW_RATE_PER_PAGE },
  ];
}
