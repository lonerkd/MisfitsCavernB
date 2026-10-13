// Admin writes to the crafts list (public.crafts). RLS lets only an admin
// insert, update or delete; everyone reads (lib/crafts/crafts).

import { supabase } from './client';
import type { CraftInput } from '@/lib/crafts/validate';

/** Add a craft at the end of the list. Returns an error message, or null. */
export async function addCraft(craft: CraftInput, position: number): Promise<string | null> {
  const { error } = await supabase.from('crafts').insert({ ...craft, position });
  return error ? error.message : null;
}

/** Remove a craft by name. People and jobs that use it keep the name. Returns an error message, or null. */
export async function removeCraft(name: string): Promise<string | null> {
  const { error } = await supabase.from('crafts').delete().eq('name', name);
  return error ? error.message : null;
}
