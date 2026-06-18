import { supabase } from './client';
import { logActivity } from './activity';

export interface DBCharacterProfile {
  id: string;
  script_id: string;
  name: string;
  full_name: string;
  age: string;
  description: string;
  backstory: string;
  motivation: string;
  arc: string;
  relationships: string;
  notes: string;
  color: string;
  played_by_crew_id?: string | null;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export const PROFILE_COLORS = [
  '#ff3c00', '#0099ff', '#00cc66', '#ff6b9d', '#ffd43b',
  '#a855f7', '#f97316', '#06b6d4', '#ec4899', '#84cc16',
];

export async function getScriptCharacters(scriptId: string): Promise<DBCharacterProfile[]> {
  const { data, error } = await supabase
    .from('script_characters')
    .select('*')
    .eq('script_id', scriptId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

// Detected character names (parsed from script content) that don't have a
// bible entry yet get a default row created — the bible is then the real,
// queryable cast list for the script, not a re-parse of raw text every time.
export async function ensureScriptCharacters(scriptId: string, detectedNames: string[]): Promise<DBCharacterProfile[]> {
  const existing = await getScriptCharacters(scriptId);
  if (detectedNames.length === 0) return existing;

  const existingNames = new Set(existing.map(c => c.name.toUpperCase()));
  const missing = detectedNames.filter(n => !existingNames.has(n.toUpperCase()));
  if (missing.length === 0) return existing;

  const inserts = missing.map((name, i) => ({
    script_id: scriptId,
    name,
    color: PROFILE_COLORS[(existing.length + i) % PROFILE_COLORS.length],
  }));

  const { data, error } = await supabase
    .from('script_characters')
    .insert(inserts)
    .select();

  if (error) throw error;

  const { data: { user } } = await supabase.auth.getUser();
  if (user) await logActivity(user.id, 'added_characters', 'script', scriptId, { names: missing });

  return [...existing, ...(data || [])];
}

export async function updateScriptCharacter(id: string, updates: Partial<DBCharacterProfile>): Promise<DBCharacterProfile> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('script_characters')
    .update({ ...updates, updated_by: user?.id, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export function subscribeToScriptCharacters(scriptId: string, callback: (payload: any) => void) {
  return supabase
    .channel(`script_characters:${scriptId}:${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'script_characters', filter: `script_id=eq.${scriptId}` }, callback)
    .subscribe();
}
