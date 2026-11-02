// What a scene costs, and what a shoot day costs, read from the breakdown (BACKLOG 4.6, slice 1). Pure.
//
// An element's cost is the figure someone entered, or its category's unit cost as a default estimate. An
// element tagged in several scenes (one prop used three times) is paid for once, so its cost is SPLIT across
// the scenes it is tagged in: a scene's total is what its own elements cost plus its share of the shared ones,
// and the scenes add up to the project's total with nothing counted twice. A day is the sum of the scenes
// scheduled on it. All arithmetic is in whole cents so the split never leaves a stray fraction.

export interface CostCategory { id: string; unit_cost: number | string | null }
export interface CostElement { id: string; category_id: string; cost: number | string | null }
export interface CostTag { scene_id: string; element_id: string }
export interface CostScene { id: string; shoot_day: number | null }

export interface SceneCost {
  sceneId: string;
  /** Elements used in this scene and no other. */
  own: number;
  /** This scene's share of elements it uses together with other scenes. */
  shared: number;
  total: number;
  /** The part of `total` that rests on a category's default unit cost rather than a figure someone entered. */
  estimated: number;
  /** Elements in this scene with no cost anywhere (no figure, no unit cost): the total is low by whatever they cost. */
  unpriced: number;
  elements: number;
}

export interface DayCost {
  /** null: scenes not on any shoot day yet. */
  day: number | null;
  scenes: number;
  total: number;
  estimated: number;
  unpriced: number;
}

export interface SceneCosts {
  byScene: Map<string, SceneCost>;
  /** In day order, the unscheduled scenes last. */
  byDay: DayCost[];
  /** What the scenes given here add up to (equal to the days added up). */
  placed: number;
  /** The share of elements that sit in scenes this call was not given (another script's, or since removed). */
  elsewhere: number;
  /** Cost of elements that are tagged in no scene at all. */
  unplaced: number;
  /** Everything the breakdown's elements cost: placed + elsewhere + unplaced. */
  projectTotal: number;
}

const toCents = (v: number | string | null | undefined): number => {
  if (v == null || v === '') return 0;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
};
const money = (cents: number) => cents / 100;

export function sceneCosts(input: { scenes: CostScene[]; categories: CostCategory[]; elements: CostElement[]; tags: CostTag[] }): SceneCosts {
  const unitCents = new Map(input.categories.map((c) => [c.id, toCents(c.unit_cost)]));
  const elementById = new Map(input.elements.map((e) => [e.id, e]));

  // The scenes each element is tagged in, once each, in a stable order. A tag may name a scene this call was not
  // given (a project can hold several scripts, and the caller may show one): it still counts as a share, so a
  // prop used in two scripts is split across all its scenes and not charged in full to the one on screen.
  const scenesOf = new Map<string, string[]>();
  for (const t of input.tags) {
    if (!elementById.has(t.element_id)) continue;
    const list = scenesOf.get(t.element_id) ?? [];
    if (!list.includes(t.scene_id)) list.push(t.scene_id);
    scenesOf.set(t.element_id, list);
  }

  const acc = new Map<string, { own: number; shared: number; estimated: number; unpriced: number; elements: number }>();
  for (const s of input.scenes) acc.set(s.id, { own: 0, shared: 0, estimated: 0, unpriced: 0, elements: 0 });

  let projectCents = 0;
  let unplacedCents = 0;
  let elsewhereCents = 0;
  for (const e of input.elements) {
    const entered = e.cost != null && e.cost !== '';
    const unit = unitCents.get(e.category_id) ?? 0;
    const cents = entered ? toCents(e.cost) : unit;
    projectCents += cents;
    const where = (scenesOf.get(e.id) ?? []).slice().sort();
    if (where.length === 0) { unplacedCents += cents; continue; }
    const base = Math.floor(cents / where.length);
    const extra = cents - base * where.length; // the first `extra` scenes carry one more cent, so the parts add up exactly
    where.forEach((sceneId, i) => {
      const part = base + (i < extra ? 1 : 0);
      const a = acc.get(sceneId);
      if (!a) { elsewhereCents += part; return; }
      if (where.length === 1) a.own += part; else a.shared += part;
      if (!entered && unit > 0) a.estimated += part;
      if (!entered && unit === 0) a.unpriced += 1;
      a.elements += 1;
    });
  }

  const byScene = new Map<string, SceneCost>();
  for (const [sceneId, a] of acc) {
    byScene.set(sceneId, { sceneId, own: money(a.own), shared: money(a.shared), total: money(a.own + a.shared), estimated: money(a.estimated), unpriced: a.unpriced, elements: a.elements });
  }

  const days = new Map<number | null, { scenes: number; total: number; estimated: number; unpriced: number }>();
  for (const s of input.scenes) {
    const a = acc.get(s.id)!;
    const d = days.get(s.shoot_day) ?? { scenes: 0, total: 0, estimated: 0, unpriced: 0 };
    d.scenes += 1; d.total += a.own + a.shared; d.estimated += a.estimated; d.unpriced += a.unpriced;
    days.set(s.shoot_day, d);
  }
  const byDay: DayCost[] = [...days.entries()]
    .sort(([x], [y]) => (x === null ? 1 : y === null ? -1 : x - y))
    .map(([day, d]) => ({ day, scenes: d.scenes, total: money(d.total), estimated: money(d.estimated), unpriced: d.unpriced }));

  const placedCents = projectCents - unplacedCents - elsewhereCents;
  return { byScene, byDay, placed: money(placedCents), elsewhere: money(elsewhereCents), unplaced: money(unplacedCents), projectTotal: money(projectCents) };
}
