// Script share links (/s/<token>). A shared script is read only through
// get_shared_script(token); the scripts_share_guard trigger lets only the
// owner (or a shaper, on a project script) turn sharing on or off or make a
// new link, and refuses short tokens.
import { supabase } from '@/lib/supabase/client';

export interface ScriptShare { shared: boolean; token: string | null }

/** A fresh unguessable link token: 32 hex characters (128 bits). */
export function newShareToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** The link anyone can open while sharing is on. */
export function scriptShareUrl(token: string, origin = typeof window !== 'undefined' ? window.location.origin : ''): string {
  return `${origin}/s/${token}`;
}

export async function getScriptShare(scriptId: string): Promise<ScriptShare> {
  const { data, error } = await supabase.from('scripts').select('shared, share_token').eq('id', scriptId).single();
  if (error) throw error;
  return { shared: !!data.shared, token: data.share_token };
}

/** Turns the link on or off. Turning it on gives the script a token if it has none. */
export async function setScriptShared(scriptId: string, shared: boolean, current: string | null): Promise<ScriptShare> {
  const patch = shared && !current ? { shared, share_token: newShareToken() } : { shared };
  const { data, error } = await supabase.from('scripts').update(patch).eq('id', scriptId).select('shared, share_token').single();
  if (error) throw error;
  return { shared: !!data.shared, token: data.share_token };
}

/** A new link; the old one stops working at once. */
export async function rotateScriptShareToken(scriptId: string): Promise<ScriptShare> {
  const { data, error } = await supabase.from('scripts').update({ share_token: newShareToken() }).eq('id', scriptId).select('shared, share_token').single();
  if (error) throw error;
  return { shared: !!data.shared, token: data.share_token };
}
