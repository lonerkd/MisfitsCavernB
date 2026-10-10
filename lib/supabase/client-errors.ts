// Admin › Errors: the reports in client_errors (written only through the
// report_client_error function; RLS lets admins read and clear them).
import { supabase } from './client';
import type { Tables } from './database.types';

export type ClientErrorRow = Tables<'client_errors'>;

/** Reports since a moment, newest first (at most `limit`). */
export async function listClientErrors(sinceIso: string, limit = 1000): Promise<ClientErrorRow[]> {
  const { data, error } = await supabase.from('client_errors').select('*').gte('created_at', sinceIso)
    .order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return data ?? [];
}

/** Removes reports from the log (once the error is fixed). */
export async function clearClientErrors(ids: number[]): Promise<void> {
  const { error } = await supabase.from('client_errors').delete().in('id', ids);
  if (error) throw error;
}
