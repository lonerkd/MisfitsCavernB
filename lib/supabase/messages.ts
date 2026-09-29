import { supabase } from './client';

export interface DBMessage {
  id: string;
  sender_id: string;
  receiver_id?: string;
  channel_id?: string;
  content: string;
  reactions: Record<string, string[]>;
  pinned: boolean;
  created_at: string;
}

export async function sendDirectMessage(senderId: string, receiverId: string, content: string) {
  const { data, error } = await supabase
    .from('messages')
    .insert({ sender_id: senderId, receiver_id: receiverId, content, reactions: {} })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ── UUID-based channels (Discord-style project/community channels) ──────────
export async function sendChannelMessage(senderId: string, content: string, channelUuid: string, parentMessageId?: string) {
  const { data, error } = await supabase.from('messages').insert({
    sender_id: senderId,
    content,
    channel_uuid: channelUuid,
    reactions: {},
    parent_message_id: parentMessageId ?? null,
  }).select().single();
  if (error) throw error;

  supabase.auth.getSession().then(({ data: { session } }) => {
    if (!session?.access_token) return;
    return fetch('/api/discord/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ channelId: channelUuid, content }),
    });
  }).catch(() => {  });

  return data;
}

export async function getChannelMessagesByUuid(channelUuid: string, limit = 100) {
  const { data, error } = await supabase
    .from('messages')
    .select('*, profiles!messages_sender_id_fkey(username, avatar_url)')
    .eq('channel_uuid', channelUuid)
    .is('parent_message_id', null)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data.reverse();
}

export function subscribeToChannelUuid(channelUuid: string, callback: (payload: any) => void) {
  return supabase
    .channel(`chan:${channelUuid}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_uuid=eq.${channelUuid}` }, callback)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `channel_uuid=eq.${channelUuid}` }, callback)
    .subscribe();
}

/** Removes a message: your own, or any in a channel you run. */
export async function deleteMessage(messageId: string) {
  const { error, count } = await supabase.from('messages').delete({ count: 'exact' }).eq('id', messageId);
  if (error) throw error;
  if (!count) throw new Error('You can’t remove that message');
}

export async function getThreadReplies(parentMessageId: string) {
  const { data, error } = await supabase
    .from('messages')
    .select('*, profiles!messages_sender_id_fkey(username, avatar_url)')
    .eq('parent_message_id', parentMessageId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function getReplyCounts(parentIds: string[]): Promise<Record<string, number>> {
  if (parentIds.length === 0) return {};
  const { data, error } = await supabase
    .from('messages')
    .select('parent_message_id')
    .in('parent_message_id', parentIds);
  if (error || !data) return {};
  const counts: Record<string, number> = {};
  for (const row of data as any[]) if (row.parent_message_id) counts[row.parent_message_id] = (counts[row.parent_message_id] || 0) + 1;
  return counts;
}

export async function getDMThread(userId1: string, userId2: string) {
  const { data, error } = await supabase
    .from('messages')
    .select('*, profiles!messages_sender_id_fkey(username, avatar_url)')
    .or(`and(sender_id.eq.${userId1},receiver_id.eq.${userId2}),and(sender_id.eq.${userId2},receiver_id.eq.${userId1})`)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

export async function toggleReaction(messageId: string, emoji: string, _userId?: string) {
  const { data, error } = await supabase.rpc('toggle_message_reaction', { p_message: messageId, p_emoji: emoji });
  if (error) throw error;
  return (data || {}) as Record<string, string[]>;
}

// ── Editing, pinning, unread, search (20260929000000_lounge.sql) ────────────

/** Rewords your own message; it's marked edited. */
export async function editMessage(messageId: string, content: string) {
  const { data, error } = await supabase.rpc('edit_message', { p_message: messageId, p_content: content });
  if (error) throw new Error(error.message || 'Could not edit the message');
  return data;
}

/** Pins or unpins a message: whoever runs the channel, or either side of a DM. */
export async function pinMessage(messageId: string, pinned: boolean) {
  const { data, error } = await supabase.rpc('pin_message', { p_message: messageId, p_pinned: pinned });
  if (error) throw new Error(error.message || 'Could not pin the message');
  return data;
}

export async function getPinnedMessages(channelUuid: string) {
  const { data, error } = await supabase
    .from('messages')
    .select('id, content, created_at, pinned_at, sender_id, parent_message_id, profiles!messages_sender_id_fkey(username)')
    .eq('channel_uuid', channelUuid)
    .eq('pinned', true)
    .order('pinned_at', { ascending: false });
  if (error) throw error;
  return data;
}

/** Marks a channel, or a direct conversation with someone, read up to now. */
export async function markLoungeRead(target: { channel: string } | { partner: string }) {
  const { error } = await supabase.rpc('mark_lounge_read', 'channel' in target ? { p_channel: target.channel } : { p_partner: target.partner });
  if (error) console.warn('mark read', error.message);
}

export interface LoungeUnread { channels: Record<string, number>; people: Record<string, number> }

/** What arrived from others since you last read, per channel and per person. */
export async function getLoungeUnread(): Promise<LoungeUnread> {
  const { data, error } = await supabase.rpc('lounge_unread');
  const out: LoungeUnread = { channels: {}, people: {} };
  if (error || !data) return out;
  for (const r of data) {
    if (r.channel_id) out.channels[r.channel_id] = r.unread;
    else if (r.partner_id) out.people[r.partner_id] = r.unread;
  }
  return out;
}

export interface LoungeHit {
  id: string; content: string; created_at: string; sender_id: string; sender: string | null;
  channel_uuid: string | null; channel_name: string | null; project_id: string | null;
  parent_message_id: string | null; receiver_id: string | null;
}

/** Words (and word starts) across every message you can read; optionally one channel. */
export async function searchLounge(query: string, channelUuid?: string | null): Promise<LoungeHit[]> {
  const { data, error } = await supabase.rpc('search_lounge', { p_query: query, p_channel: channelUuid ?? undefined, p_limit: 40 });
  if (error) throw new Error(error.message || 'Search failed');
  return (data ?? []) as LoungeHit[];
}
