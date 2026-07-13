

import { setCacheItem, getCacheItem } from '@/lib/storage/cache-versioning';
import { supabase } from '@/lib/supabase/client';
import { awaitOSUser } from '@/lib/os';

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

export async function getCharacterProfiles(scriptId: string): Promise<CharacterProfile[]> {
  if (typeof window === 'undefined') return [];
  try {
    const stored = await getCacheItem(`${PROFILE_KEY}_${scriptId}`, 'profiles');
    return Array.isArray(stored) ? stored : [];
  } catch { return []; }
}

export async function loadCharacterProfiles(scriptId: string): Promise<CharacterProfile[]> {
  const cached = await getCharacterProfiles(scriptId);
  try {
    const { data, error } = await supabase
      .from('script_characters')
      .select('*')
      .eq('script_id', scriptId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    const profiles = (data || []).map(rowToProfile);
    await setCacheItem(`${PROFILE_KEY}_${scriptId}`, profiles);
    return profiles;
  } catch {  }
  return cached;
}

const saveChains = new Map<string, Promise<void>>();

export async function saveCharacterProfiles(scriptId: string, profiles: CharacterProfile[]): Promise<void> {
  if (typeof window !== 'undefined') await setCacheItem(`${PROFILE_KEY}_${scriptId}`, profiles);
  const prior = saveChains.get(scriptId) || Promise.resolve();
  const next = prior.then(() => doSaveCharacterProfiles(scriptId, profiles)).catch(() => {  });
  saveChains.set(scriptId, next);
  return next;
}

async function doSaveCharacterProfiles(scriptId: string, profiles: CharacterProfile[]): Promise<void> {
  const user = await awaitOSUser();
  const { data: existing } = await supabase.from('script_characters').select('id,name').eq('script_id', scriptId);
  const existingByName = new Map((existing || []).map((r: any) => [r.name, r.id]));

  for (const p of profiles) {
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
      const { data: inserted, error } = await supabase.from('script_characters').insert(payload).select('id').single();

      if (error && (error as any).code === '23505') {
        const { data: raced } = await supabase.from('script_characters').select('id').eq('script_id', scriptId).eq('name', p.name).maybeSingle();
        if (raced?.id) await supabase.from('script_characters').update(payload).eq('id', raced.id);
      } else if (inserted?.id) {
        existingByName.set(p.name, inserted.id);
      }
    }
  }

}

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
