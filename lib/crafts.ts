'use client';

// The suite's one list of film crafts (public.crafts): what a profile says
// someone does, what a job is for, what a crew member does on a project.
// Reference data — read by everyone, extended by admins — so it's fetched
// once per page load and shared.

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export interface Craft {
  name: string;
  department: string;
  color: string;
  position: number;
}

let cache: Promise<Craft[]> | null = null;

export function loadCrafts(force = false): Promise<Craft[]> {
  if (!cache || force) {
    cache = (async () => {
      const { data, error } = await supabase.from('crafts').select('name, department, color, position').order('position');
      if (error) { cache = null; throw new Error(error.message || 'Could not load crafts'); }
      return data;
    })();
  }
  return cache;
}

export function useCrafts(): { crafts: Craft[]; byName: Map<string, Craft>; loading: boolean } {
  const [crafts, setCrafts] = useState<Craft[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    loadCrafts().then((c) => { if (alive) setCrafts(c); }).catch(() => {}).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return { crafts, byName: new Map(crafts.map((c) => [c.name, c])), loading };
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
