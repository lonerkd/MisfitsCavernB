// Who talks to whom, read from the script's own parse: a "turn" is one character answering another (adjacent cues in a scene, a different
// speaker each time), and a shared scene is two characters speaking in the same scene. The strength of a pair is two points a turn and one
// a shared scene, so a long exchange outranks two people who merely stand in the same crowd. Pure.
import type { ScriptLine, Scene } from './types';
import { cueName, nameKey } from './character-checks';

export interface RelationshipPair {
  a: string;
  b: string;
  /** Times one answered the other. */
  turns: number;
  /** Scenes in which both speak. */
  scenes: number;
  strength: number;
}

export function relationships(lines: ScriptLine[], scenes: Scene[], opts: { rejectedNames?: readonly string[] } = {}): RelationshipPair[] {
  const rejected = new Set((opts.rejectedNames ?? []).map(nameKey));
  const display = new Map<string, string>(); // key -> first spelling
  const pairs = new Map<string, RelationshipPair>();
  const pair = (x: string, y: string) => {
    const [a, b] = x < y ? [x, y] : [y, x];
    const k = `${a}|${b}`;
    let p = pairs.get(k);
    if (!p) { p = { a: display.get(a)!, b: display.get(b)!, turns: 0, scenes: 0, strength: 0 }; pairs.set(k, p); }
    return p;
  };
  const inScene = new Map<number, Set<string>>();
  let sceneAt = -2;
  let last: string | null = null;
  for (const l of lines) {
    const s = scenes.findIndex((sc) => l.index >= sc.startIndex && l.index <= sc.endIndex);
    if (s !== sceneAt) { sceneAt = s; last = null; }
    if (l.type === 'slug' || l.type === 'transition') last = null;
    if (l.type !== 'character') continue;
    const name = cueName(l);
    const key = nameKey(name);
    if (!key || rejected.has(key)) continue;
    if (!display.has(key)) display.set(key, name);
    if (s >= 0) inScene.set(s, (inScene.get(s) ?? new Set()).add(key));
    if (last && last !== key) pair(last, key).turns++;
    last = key;
  }
  for (const set of inScene.values()) {
    const ks = [...set];
    for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) pair(ks[i], ks[j]).scenes++;
  }
  return [...pairs.values()]
    .map((p) => ({ ...p, strength: p.turns * 2 + p.scenes }))
    .sort((x, y) => y.strength - x.strength || x.a.localeCompare(y.a) || x.b.localeCompare(y.b));
}

/** The people a character talks to, strongest first. */
export function talksToMost(pairs: RelationshipPair[], name: string, limit = 3): Array<{ name: string; strength: number }> {
  const k = nameKey(name);
  return pairs
    .filter((p) => nameKey(p.a) === k || nameKey(p.b) === k)
    .map((p) => ({ name: nameKey(p.a) === k ? p.b : p.a, strength: p.strength }))
    .slice(0, limit);
}

/** The characters with the most connections, for a diagram that stays legible. */
export function topCharacters(pairs: RelationshipPair[], limit = 12): string[] {
  const score = new Map<string, number>();
  for (const p of pairs) { score.set(p.a, (score.get(p.a) ?? 0) + p.strength); score.set(p.b, (score.get(p.b) ?? 0) + p.strength); }
  return [...score.entries()].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0])).slice(0, limit).map(([n]) => n);
}
