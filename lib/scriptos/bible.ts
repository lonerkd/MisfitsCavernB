// ============================================================================
// SCRIPTOS CHARACTER BIBLE
// Manage character profiles, backstories, and notes.
// Persisted in Supabase (script_metadata.character_bible) so every collaborator
// on a script shares one character bible. localStorage is an offline cache only,
// mirroring lib/scriptos/revisions.ts and titlepage.ts.
// ============================================================================

import { setCacheItem, getCacheItem } from '@/lib/storage/cache-versioning';
import { supabase } from '@/lib/supabase/client';

export interface CharacterProfile {
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
    const { data } = await supabase
      .from('script_metadata')
      .select('character_bible')
      .eq('script_id', scriptId)
      .maybeSingle();
    if (data?.character_bible && Array.isArray(data.character_bible)) {
      setCacheItem(`${PROFILE_KEY}_${scriptId}`, data.character_bible);
      return data.character_bible as CharacterProfile[];
    }
  } catch { /* offline — fall back to cache */ }
  return cached;
}

export async function saveCharacterProfiles(scriptId: string, profiles: CharacterProfile[]): Promise<void> {
  if (typeof window !== 'undefined') setCacheItem(`${PROFILE_KEY}_${scriptId}`, profiles);
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('script_metadata').upsert(
      { script_id: scriptId, character_bible: profiles, updated_by: user?.id, updated_at: new Date().toISOString() },
      { onConflict: 'script_id' }
    );
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
