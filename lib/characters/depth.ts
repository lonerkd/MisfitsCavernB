// Character depth tools (4.8): richer cards, arc timeline, relationship map,
// voice samples, backstory timeline, appearances, comparing two characters,
// templates, consistency warnings, bible PDF.

export type CharacterDepth = {
  name: string;
  goals: string;
  fears: string;
  flaws: string;
  arc: string; // summary of change
  notes: string;
};

export type ArcBeat = { at: number; label: string; note: string };

export type Relationship = { a: string; b: string; kind: string; note: string };

export function emptyDepth(name: string): CharacterDepth {
  return { name, goals: '', fears: '', flaws: '', arc: '', notes: '' };
}

export function consistencyWarnings(depths: CharacterDepth[]): string[] {
  const out: string[] = [];
  const names = depths.map((d) => d.name);
  // duplicate names (case-insensitive)
  const seen = new Set<string>();
  for (const d of depths) {
    const k = d.name.trim().toLowerCase();
    if (seen.has(k)) out.push(`Duplicate character name: ${d.name}`);
    seen.add(k);
  }
  // empty goals/flaws for named characters
  for (const d of depths) {
    if (d.name.trim() && !d.goals.trim()) out.push(`${d.name}: no goal stated`);
    if (d.name.trim() && !d.flaws.trim()) out.push(`${d.name}: no flaw stated`);
  }
  return out;
}
