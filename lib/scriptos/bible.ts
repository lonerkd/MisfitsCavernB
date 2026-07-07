// ============================================================================
// SCRIPTOS CHARACTER BIBLE
// Manage character profiles, backstories, and notes.
// Persisted in Supabase (script_characters) so every collaborator on a script
// shares one character bible — and so Studio's Casting Board (which reads/
// writes this same table for casting slots and look-board references) stays
// in sync with what's written here instead of drifting apart. localStorage is
// an offline cache only, mirroring lib/scriptos/revisions.ts and titlepage.ts.
// ============================================================================

import { setCacheItem, getCacheItem } from '@/lib/storage/cache-versioning';
import { supabase } from '@/lib/supabase/client';

export interface CharacterProfile {
  id?: string;
  name: string;
  fullName: string;
  age: string;
  description: string;
  backstory: string;
  motivation: string;
  arc: string;
  relationships: string;
  notes: string;
  color: string;
}

const PROFILE_KEY = 'scriptos_char_profiles';

const PROFILE_COLORS = [
  '#d7340b', '#0099ff', '#00cc66', '#ff6b9d', '#ffd43b',
  '#a855f7', '#f97316', '#06b6d4', '#ec4899', '#84cc16',
];

export function getDefaultProfile(name: string, index: number): CharacterProfile {
  return {
    name,
    fullName: '',
    age: '',
    description: '',
    backstory: '',
    motivation: '',
    arc: '',
    relationships: '',
    notes: '',
    color: PROFILE_COLORS[index % PROFILE_COLORS.length],
  };
}

function rowToProfile(row: any): CharacterProfile {
  return {
    id: row.id,
    name: row.name,
    fullName: row.full_name || '',
    age: row.age || '',
    description: row.description || '',
    backstory: row.backstory || '',
    motivation: row.motivation || '',
    arc: row.arc || '',
    relationships: row.relationships || '',
    notes: row.notes || '',
    color: row.color || PROFILE_COLORS[0],
  };
}

// Synchronous cache read for instant first paint.
export function loadCharacterProfilesCached(scriptId: string): CharacterProfile[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = getCacheItem(`${PROFILE_KEY}_${scriptId}`, 'profiles');
    return Array.isArray(stored) ? stored : [];
  } catch { return []; }
}

export async function loadCharacterProfiles(scriptId: string): Promise<CharacterProfile[]> {
  const cached = loadCharacterProfilesCached(scriptId);
  try {
    const { data, error } = await supabase
      .from('script_characters')
      .select('*')
      .eq('script_id', scriptId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    const profiles = (data || []).map(rowToProfile);
    setCacheItem(`${PROFILE_KEY}_${scriptId}`, profiles);
    return profiles;
  } catch { /* offline — fall back to cache */ }
  return cached;
}

export async function saveCharacterProfiles(scriptId: string, profiles: CharacterProfile[]): Promise<void> {
  if (typeof window !== 'undefined') setCacheItem(`${PROFILE_KEY}_${scriptId}`, profiles);
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: existing } = await supabase.from('script_characters').select('id,name').eq('script_id', scriptId);
    const existingByName = new Map((existing || []).map((r: any) => [r.name, r.id]));

    await Promise.all(profiles.map(async (p) => {
      const id = p.id || existingByName.get(p.name);
      const payload = {
        script_id: scriptId,
        name: p.name,
        full_name: p.fullName || null,
        age: p.age || null,
        description: p.description || null,
        backstory: p.backstory || null,
        motivation: p.motivation || null,
        arc: p.arc || null,
        relationships: p.relationships || null,
        notes: p.notes || null,
        color: p.color,
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      };
      if (id) {
        await supabase.from('script_characters').update(payload).eq('id', id);
      } else {
        await supabase.from('script_characters').insert(payload);
      }
    }));

    // Characters detected in an earlier pass but no longer present in the
    // script (renamed/removed) are left in place rather than deleted here —
    // Studio's look-board references (character_references) point at these
    // rows by id, so a silent delete would orphan any linked casting/look
    // references. Removing a character from the bible is a deliberate,
    // explicit action, not a side effect of a script edit.
  } catch { /* offline — cache already written */ }
}

// Merge detected characters with stored profiles
export function mergeProfiles(
  detectedNames: string[],
  storedProfiles: CharacterProfile[]
): CharacterProfile[] {
  const profileMap = new Map(storedProfiles.map(p => [p.name.toUpperCase(), p]));
  const merged: CharacterProfile[] = [];

  detectedNames.forEach((name, i) => {
    const key = name.toUpperCase();
    if (profileMap.has(key)) {
      merged.push(profileMap.get(key)!);
    } else {
      merged.push(getDefaultProfile(name, i));
    }
  });

  return merged;
}
