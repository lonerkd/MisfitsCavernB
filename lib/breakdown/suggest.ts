// Breakdown intelligence (4.10): suggest elements from action lines.
// Suggestions are never tagged automatically — the person accepts them.

const KEYWORDS: Record<string, string[]> = {
  prop: ['gun', 'knife', 'phone', 'letter', 'key', 'bag', 'book', 'glass', 'bottle', 'map', 'watch', 'ring'],
  vehicle: ['car', 'truck', 'bike', 'motorcycle', 'boat', 'plane', 'helicopter', 'train', 'bus'],
  wardrobe: ['coat', 'hat', 'dress', 'suit', 'uniform', 'jacket', 'boots', 'gloves', 'mask'],
  vfx: ['explosion', 'fire', 'rain', 'snow', 'smoke', 'blood', 'ghost', 'monster', 'laser'],
  sfx: ['gunshot', 'thunder', 'scream', 'crash', 'bang', 'whisper'],
  animal: ['dog', 'cat', 'horse', 'bird', 'snake', 'wolf'],
};

export type Suggestion = { category: string; term: string };

export function suggestFromAction(text: string): Suggestion[] {
  const lower = text.toLowerCase();
  const out: Suggestion[] = [];
  const seen = new Set<string>();
  for (const [cat, words] of Object.entries(KEYWORDS)) {
    for (const w of words) {
      const re = new RegExp(`\\b${w}s?\\b`, 'i');
      if (re.test(lower)) {
        const key = `${cat}:${w}`;
        if (!seen.has(key)) { seen.add(key); out.push({ category: cat, term: w }); }
      }
    }
  }
  return out;
}
