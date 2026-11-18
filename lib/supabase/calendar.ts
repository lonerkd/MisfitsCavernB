import { supabase } from './client';

// The person's calendar-feed link (`calendar_feeds`, owner-only). The link is the secret.

export async function getFeedToken(userId: string): Promise<string | null> {
  const { data, error } = await supabase.from('calendar_feeds').select('token').eq('user_id', userId).maybeSingle();
  if (error) throw new Error('Could not load your calendar link');
  return data?.token ?? null;
}

export async function createFeed(userId: string): Promise<string> {
  const { data, error } = await supabase.from('calendar_feeds').insert({ user_id: userId }).select('token').single();
  if (error || !data) throw new Error('Could not make the link');
  return data.token;
}

/** A new token: the old link stops working. */
export async function replaceFeedToken(userId: string): Promise<string> {
  const { data, error } = await supabase.from('calendar_feeds').update({ token: crypto.randomUUID() }).eq('user_id', userId).select('token').single();
  if (error || !data) throw new Error('Could not replace the link');
  return data.token;
}

export async function deleteFeed(userId: string): Promise<void> {
  const { error } = await supabase.from('calendar_feeds').delete().eq('user_id', userId);
  if (error) throw new Error('Could not turn it off');
}
