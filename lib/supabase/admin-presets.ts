// Admin writes to the channel suggestions (public.channel_presets) that the
// Lounge offers a production by phase. RLS: everyone reads, only an admin writes.

import { supabase } from './client';
import type { PresetInput } from '@/lib/lounge/presetCheck';

/** Add a suggestion at the end of the list. Returns an error message, or null. */
export async function addPreset(preset: PresetInput, position: number): Promise<string | null> {
  const { error } = await supabase.from('channel_presets').insert({ ...preset, position });
  return error ? error.message : null;
}

/** Remove a suggestion by key. Channels already made from it are untouched. Returns an error message, or null. */
export async function removePreset(key: string): Promise<string | null> {
  const { error } = await supabase.from('channel_presets').delete().eq('key', key);
  return error ? error.message : null;
}

export interface PresetRow { key: string; name: string; type: string; audience: string; post_policy: string; phase: string; topic: string | null; why: string; position: number }

/** Every suggestion, in list order. Throws on failure. */
export async function listPresets(): Promise<PresetRow[]> {
  const { data, error } = await supabase.from('channel_presets').select('*').order('position');
  if (error) throw error;
  return (data ?? []) as PresetRow[];
}
