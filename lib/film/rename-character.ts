// The graph half of renaming a character (the text half is lib/scriptos/rename.ts): the `characters` row takes the new name, and the
// database's own rename trigger carries the castings and call-sheet calls along by id. Returns a sentence to show when it cannot.
import { supabase } from '@/lib/supabase/client';

export async function renameCharacterRow(projectId: string, from: string, to: string): Promise<string | null> {
  const upper = (n: string) => n.trim().replace(/\s+/g, ' ').toUpperCase();
  const { data, error } = await supabase.from('characters').select('id, name').eq('project_id', projectId);
  if (error) return error.message;
  const rows = data ?? [];
  const row = rows.find((r) => upper(r.name) === upper(from));
  // Nothing in the graph yet (the scenes have not synced): the text rewrite alone is the rename.
  if (!row) return null;
  if (rows.some((r) => r.id !== row.id && upper(r.name) === upper(to))) return `${upper(to)} is already a character here. Merging two characters is not supported: rename one of them to something else first.`;
  const { error: updateError } = await supabase.from('characters').update({ name: upper(to) }).eq('id', row.id);
  return updateError ? updateError.message : null;
}
