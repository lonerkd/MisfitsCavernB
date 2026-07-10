import { supabase } from './client';

export interface Channel {
  id: string;
  project_id: string | null;
  name: string;
  type: 'text' | 'voice';
  topic: string | null;
  position: number;
  is_private: boolean;
  post_policy: 'viewers' | 'members' | 'managers';
  created_by: string | null;
  created_at: string;
}

export interface ChannelMember {
  id: string;
  channel_id: string;
  user_id: string;
  can_post: boolean;
  can_manage: boolean;
  profiles?: { username: string; avatar_url?: string };
}

// RLS already filters to channels the caller can view, so a plain select is
// safe. Global (community) channels have project_id null.
export async function listChannels(projectId?: string | null): Promise<Channel[]> {
  let q = supabase.from('channels').select('*').order('position').order('created_at');
  const { data } = await q;
  const all = (data as Channel[]) || [];
  // Return community channels plus the active project's channels.
  return all.filter(c => c.project_id === null || (projectId && c.project_id === projectId));
}

export async function createChannel(input: {
  project_id: string;
  name: string;
  type?: 'text' | 'voice';
  is_private?: boolean;
  post_policy?: 'viewers' | 'members' | 'managers';
  topic?: string;
}): Promise<{ channel: Channel | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  const name = input.name.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 40);

  // NOTE: this insert deliberately does NOT chain .select() (i.e. no
  // RETURNING). Postgres re-evaluates the table's SELECT RLS policy
  // (can_view_channel, which re-queries `channels` by id) to satisfy a
  // RETURNING clause, and that re-query happens within the SAME command as
  // the INSERT — the just-inserted row isn't visible to it under Postgres's
  // MVCC command-counter rules, so INSERT ... RETURNING always failed here
  // even though the exact same policy check passes an instant later as its
  // own statement. Splitting into an insert then a separate fetch sidesteps
  // the issue entirely (confirmed against the live DB).
  const { error } = await supabase.from('channels').insert({
    project_id: input.project_id,
    name,
    type: input.type || 'text',
    is_private: input.is_private || false,
    post_policy: input.post_policy || 'viewers',
    topic: input.topic || null,
    created_by: user?.id,
  });
  if (error) return { channel: null, error: error.message };

  const { data, error: fetchError } = await supabase
    .from('channels')
    .select('*')
    .eq('project_id', input.project_id)
    .eq('name', name)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (fetchError || !data) return { channel: null, error: fetchError?.message || 'Channel created but could not be re-fetched' };

  // The creator (project owner) is implicitly a manager, but for private
  // channels we also add them as an explicit member so they show in the roster.
  if (input.is_private) {
    await supabase.from('channel_members').insert({ channel_id: data.id, user_id: user?.id, can_post: true, can_manage: true });
  }
  return { channel: data as Channel, error: null };
}

export async function updateChannel(id: string, patch: Partial<Pick<Channel, 'name' | 'topic' | 'is_private' | 'post_policy' | 'position'>>) {
  const { error } = await supabase.from('channels').update(patch).eq('id', id);
  return error?.message || null;
}

export async function deleteChannel(id: string) {
  const { error } = await supabase.from('channels').delete().eq('id', id);
  return error?.message || null;
}

export async function listChannelMembers(channelId: string): Promise<ChannelMember[]> {
  const { data } = await supabase
    .from('channel_members')
    .select('*, profiles(username, avatar_url)')
    .eq('channel_id', channelId);
  return (data as ChannelMember[]) || [];
}

export async function addChannelMember(channelId: string, userId: string, opts?: { can_post?: boolean; can_manage?: boolean }) {
  const { error } = await supabase.from('channel_members').insert({
    channel_id: channelId, user_id: userId,
    can_post: opts?.can_post ?? true, can_manage: opts?.can_manage ?? false,
  });
  return error?.message || null;
}

export async function removeChannelMember(id: string) {
  const { error } = await supabase.from('channel_members').delete().eq('id', id);
  return error?.message || null;
}

// UI gating: can the current user post / manage this channel?
export async function canPostChannel(channelId: string): Promise<boolean> {
  const { data } = await supabase.rpc('can_post_channel', { cid: channelId });
  return !!data;
}
export async function canManageChannel(channelId: string): Promise<boolean> {
  const { data } = await supabase.rpc('can_manage_channel', { cid: channelId });
  return !!data;
}

// Discord webhook bridge: discord_integrations has no SELECT policy, so the
// only thing the UI can ever learn is whether one is set (via the
// SECURITY DEFINER has_discord_webhook helper) — never the URL itself.
export async function hasDiscordWebhook(channelId: string): Promise<boolean> {
  const { data } = await supabase.rpc('has_discord_webhook', { cid: channelId });
  return !!data;
}
export async function setDiscordWebhook(channelId: string, webhookUrl: string): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  // discord_integrations has no SELECT policy, so there's no way to tell
  // insert-vs-update apart from the client side (a plain upsert's internal
  // conflict check and update() both need the row visible under standard
  // RLS SELECT semantics, which doesn't exist here). Delete-then-insert only
  // ever needs the DELETE and INSERT policies, both of which are real.
  await supabase.from('discord_integrations').delete().eq('channel_id', channelId);
  const { error } = await supabase.from('discord_integrations').insert({
    channel_id: channelId, webhook_url: webhookUrl, created_by: user?.id,
  });
  return error?.message || null;
}
export async function removeDiscordWebhook(channelId: string): Promise<string | null> {
  const { error } = await supabase.from('discord_integrations').delete().eq('channel_id', channelId);
  return error?.message || null;
}
