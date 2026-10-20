// Server-side reads for the Discord bridge (/api/discord/notify). Each takes
// the client it must run as: channel visibility is asked as the signed-in
// user (RLS decides), the webhook and sender name are read with the service
// role because discord_integrations is not readable by members.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

type Db = SupabaseClient<Database>;

/** Can this user see the channel? Run with a client carrying the user's token — RLS is the answer. */
export async function canSeeChannel(asUser: Db, channelId: string): Promise<boolean> {
  const { data, error } = await asUser.from('channels').select('id').eq('id', channelId).maybeSingle();
  return !error && !!data;
}

/** The channel's Discord webhook URL, or null (none set, or the read failed). Service-role client. */
export async function getChannelWebhookUrl(admin: Db, channelId: string): Promise<string | null> {
  const { data, error } = await admin.from('discord_integrations').select('webhook_url').eq('channel_id', channelId).maybeSingle();
  return error ? null : data?.webhook_url ?? null;
}

/** A person's username, or null. Service-role client. */
export async function getUsername(admin: Db, userId: string): Promise<string | null> {
  const { data } = await admin.from('profiles').select('username').eq('id', userId).maybeSingle();
  return data?.username ?? null;
}
