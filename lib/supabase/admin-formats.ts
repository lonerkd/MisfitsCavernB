// Admin writes to the project formats (public.project_formats). RLS: everyone
// reads, only an admin writes. Projects keep the format name they were made
// with, so removing a format only stops it being offered.

import { supabase } from './client';
import type { FormatInput } from '@/lib/formats/check';

/** Add a format at the end of the list. Returns an error message, or null. */
export async function addFormat(format: FormatInput, position: number): Promise<string | null> {
  const { error } = await supabase.from('project_formats').insert({ ...format, position });
  return error ? error.message : null;
}

/** Remove a format by name. Returns an error message, or null. */
export async function removeFormat(name: string): Promise<string | null> {
  const { error } = await supabase.from('project_formats').delete().eq('name', name);
  return error ? error.message : null;
}
