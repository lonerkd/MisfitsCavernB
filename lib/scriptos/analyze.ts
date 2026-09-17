// Script "analysis" layer — deterministic, offline, explainable. Every result
// carries the rule that produced it and a confidence. This is the foundation
// the on-device model (Transformers.js NER / zero-shot) upgrades later behind
// the same interface.

import type { ParseResult } from '@/types/screenplay';
import { KNOWLEDGE, BREAKDOWN_STOPWORDS } from './parser';
import { analyzeCharacters } from './characters';

export type ResolvedCategory = 'props' | 'wardrobe' | 'vehicles' | 'sfx' | 'vfx' | 'character';

export interface ResolvedElement {
  item: string;
  category: ResolvedCategory;
  confidence: number;
  evidence: string;
  scenes: number[];
}

export interface ContinuityFlag {
  severity: 'info' | 'warn';
  message: string;
  sceneIndex?: number;
}

export interface ScriptAnalysis {
  characters: { name: string; dialogueLines: number; scenes: number[] }[];
  locations: { name: string; scenes: number[] }[];
  elements: ResolvedElement[];
  flags: ContinuityFlag[];
  pacing: {
    scenes: number;
    estRuntimeMinutes: number;
    dialogueRatio: number;
    avgSceneWords: number;
    timeOfDay: Record<string, number>;
  };
}

const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');

const VEHICLE_ONLY = new Set(['PICKUP', 'SEDAN', 'COUPE', 'JEEP', 'LIMO', 'LIMOUSINE', 'RIG', 'TANKER']);
const WARDROBE_ONLY = new Set(['JACKET', 'BLAZER', 'SCARF', 'TIE', 'VEST', 'GLOVES', 'HEELS', 'SNEAKERS', 'HOODIE']);

export function analyzeScript(parsed: ParseResult): ScriptAnalysis {
  const { lines, scenes } = parsed;

  const fullCast = new Set<string>();
  scenes.forEach((sc) => {
    for (const c of sc.characters) {
      const n = norm(c);
      if (n) fullCast.add(n);
    }
  });

  const elementMap = new Map<string, ResolvedElement>();
  const push = (item: string, category: ResolvedCategory, confidence: number, evidence: string, sceneIdx: number) => {
    const key = norm(item);
    if (!key) return;
    let e = elementMap.get(key);
    if (!e) {
      e = { item, category, confidence, evidence, scenes: [] };
      elementMap.set(key, e);
    }
    if (!e.scenes.includes(sceneIdx)) e.scenes.push(sceneIdx);
  };

  scenes.forEach((sc, idx) => {
    const actionLines = lines
      .slice(sc.startIndex, sc.endIndex + 1)
      .filter((l) => l.type === 'action' || l.type === 'shot')
      .map((l) => l.text);
    for (const line of actionLines) {
      const tokens = line.match(/\b[A-Z][A-Z0-9'’.&/-]{1,}\b/g) || [];
      for (const raw of tokens) {
        const w = raw.replace(/[’']s$/i, '').trim();
        if (w.length < 2) continue;
        const u = norm(w);
        if (!u || BREAKDOWN_STOPWORDS.has(u)) continue;

        if (fullCast.has(u)) push(w, 'character', 0.95, 'matched a cast member', idx);
        else if (KNOWLEDGE.VEHICLES.has(u) || VEHICLE_ONLY.has(u)) push(w, 'vehicles', 0.9, 'vehicle term', idx);
        else if (KNOWLEDGE.WARDROBE.has(u) || WARDROBE_ONLY.has(u)) push(w, 'wardrobe', 0.9, 'garment/wardrobe term', idx);
        else if (KNOWLEDGE.SOUNDS.has(u)) push(w, 'sfx', 0.88, 'sound cue', idx);
        else if (KNOWLEDGE.VFX.has(u)) push(w, 'vfx', 0.88, 'visual-effect term', idx);
        else push(w, 'props', 0.5, 'capitalised noun, uncategorised', idx);
      }
    }
  });
  const elements = Array.from(elementMap.values());

  // ── Characters / locations ─────────────────────────────────────────
  const charStats = analyzeCharacters(lines, scenes);
  const characters = charStats
    .map((c) => ({ name: c.name, dialogueLines: c.dialogueLines, scenes: c.scenesIn }))
    .sort((a, b) => b.dialogueLines - a.dialogueLines);

  const locationMap = new Map<string, number[]>();
  scenes.forEach((sc, i) => {
    const loc = sc.location && sc.location !== 'UNKNOWN' ? sc.location : 'UNESTABLISHED';
    if (!locationMap.has(loc)) locationMap.set(loc, []);
    locationMap.get(loc)!.push(i);
  });
  const locations = Array.from(locationMap.entries()).map(([name, s]) => ({ name, scenes: s }));

  const flags: ContinuityFlag[] = [];
  const headingCount = new Map<string, number>();
  scenes.forEach((sc) => {
    const h = norm(sc.heading);
    headingCount.set(h, (headingCount.get(h) || 0) + 1);
  });
  headingCount.forEach((count, h) => {
    if (count > 1) flags.push({ severity: 'warn', message: `Scene heading "${h}" is used ${count} times` });
  });
  characters.forEach((c) => {
    if (c.dialogueLines === 0 && scenes.length > 1) {
      flags.push({ severity: 'info', message: `"${c.name}" appears in ${c.scenes.length} scene(s) but never speaks` });
    }
  });
  scenes.forEach((sc, i) => {
    if (!sc.location || sc.location === 'UNKNOWN') {
      flags.push({ severity: 'info', message: `Scene ${i + 1} has no established location`, sceneIndex: i });
    }
  });

  let dialogueWords = 0;
  let totalWords = 0;
  lines.forEach((l) => {
    const wc = l.text.split(/\s+/).filter(Boolean).length;
    totalWords += wc;
    if (l.type === 'dialogue') dialogueWords += wc;
  });
  const timeOfDay: Record<string, number> = {};
  scenes.forEach((sc) => {
    const t = sc.timeOfDay && sc.timeOfDay !== 'UNKNOWN' ? sc.timeOfDay : 'UNSPECIFIED';
    timeOfDay[t] = (timeOfDay[t] || 0) + 1;
  });

  return {
    characters,
    locations,
    elements,
    flags,
    pacing: {
      scenes: scenes.length,
      estRuntimeMinutes: Math.round((totalWords / 190) * 0.8),
      dialogueRatio: totalWords ? Math.round((dialogueWords / totalWords) * 100) : 0,
      avgSceneWords: scenes.length ? Math.round(totalWords / scenes.length) : 0,
      timeOfDay,
    },
  };
}