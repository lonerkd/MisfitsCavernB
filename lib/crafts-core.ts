// The crafts list, pure: grouping, search and suggestion over rows of
// public.crafts. No Supabase import, so it's safe anywhere (and in tests).

export interface Craft {
  name: string;
  department: string;
  color: string;
  position: number;
}

/** Departments in list order, each with its crafts. */
export function byDepartment(crafts: Craft[]): Array<{ department: string; crafts: Craft[] }> {
  const out: Array<{ department: string; crafts: Craft[] }> = [];
  for (const c of [...crafts].sort((a, b) => a.position - b.position)) {
    const group = out.find((g) => g.department === c.department);
    if (group) group.crafts.push(c); else out.push({ department: c.department, crafts: [c] });
  }
  return out;
}

/** Crafts whose name or department contains the query. */
export function searchCrafts(crafts: Craft[], query: string): Craft[] {
  const q = query.trim().toLowerCase();
  if (!q) return crafts;
  return crafts.filter((c) => c.name.toLowerCase().includes(q) || c.department.toLowerCase().includes(q));
}

// Breakdown categories and budget lines, in the words the crafts list uses.
const TOPIC_WORDS: Array<[RegExp, string]> = [
  [/\bprops?\b/, 'Prop master'],
  [/\bwardrobe|costumes?\b/, 'Costume designer'],
  [/\bhair|make-?up\b/, 'Makeup artist'],
  [/\bset dress/, 'Set decorator'],
  [/\bstunts?\b/, 'Stunt performer'],
  [/\bextras|cast\b/, 'Actor'],
  [/\bvisual effects|vfx\b/, 'VFX artist'],
  [/\bsound|music\b/, 'Sound designer'],
  [/\bcamera\b/, 'Camera operator'],
  [/\blight|electric|grip\b/, 'Gaffer'],
  [/\blocations?\b/, 'Location manager'],
  [/\bedit/, 'Editor'],
];

/**
 * The craft a piece of text (a budget line, a breakdown category) is most
 * likely about: an exact craft name, then the craft a topic belongs to,
 * else "Other". Only returns crafts that exist in `crafts`.
 */
export function suggestCraft(text: string, crafts: Craft[]): string {
  const names = new Set(crafts.map((c) => c.name));
  const t = text.replace(/^breakdown\s*·\s*/i, '').trim().toLowerCase();
  const exact = crafts.find((c) => c.name.toLowerCase() === t);
  if (exact) return exact.name;
  for (const [re, craft] of TOPIC_WORDS) if (re.test(t) && names.has(craft)) return craft;
  const mentioned = crafts.find((c) => t.includes(c.name.toLowerCase()));
  if (mentioned) return mentioned.name;
  return names.has('Other') ? 'Other' : crafts[crafts.length - 1]?.name ?? 'Other';
}
