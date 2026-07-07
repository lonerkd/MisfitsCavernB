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

export async function sendMessage(senderId: string, content: string, channelId?: string, receiverId?: string, parentMessageId?: string) {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      sender_id: senderId,
      receiver_id: receiverId,
      channel_id: channelId,
      content,
      reactions: {},
      parent_message_id: parentMessageId ?? null,
    })
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

  // Mirror to Discord if this channel has a webhook configured. Fire-and-
  // forget: the Lounge message already sent successfully above, so a slow or
  // failed Discord post must never block or fail the sender's own send.
  // senderId (not a username) is passed since the client has no cheap access
  // to the sender's profile here — the route resolves it server-side, in the
  // same request that already needs a DB round-trip for the webhook lookup.
  fetch('/api/discord/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channelId: channelUuid, senderId, content }),
  }).catch(() => { /* best-effort only */ });

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

// Top-level channel messages only (thread replies are hidden from the main
// stream and read via getThreadReplies).
export async function getChannelMessages(channelId: string, limit = 100) {
  const { data, error } = await supabase
    .from('messages')
    .select('*, profiles!messages_sender_id_fkey(username, avatar_url)')
    .eq('channel_id', channelId)
    .is('parent_message_id', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data.reverse();
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

// Reply counts for a set of parent message ids (for the "N replies" affordance).
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

export async function addReaction(messageId: string, emoji: string, userId: string) {
  const { data: message, error: fetchError } = await supabase
    .from('messages')
    .select('reactions')
    .eq('id', messageId)
    .single();

  if (fetchError) throw fetchError;

  const reactions = message.reactions || {};
  if (!reactions[emoji]) {
    reactions[emoji] = [];
  }

  if (!reactions[emoji].includes(userId)) {
    reactions[emoji].push(userId);
  }

  const { data, error } = await supabase
    .from('messages')
    .update({ reactions })
    .eq('id', messageId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Add or remove the user's reaction to a message (toggle). Runs through a
// SECURITY DEFINER RPC because there is no row-level UPDATE policy on messages
// (writing reactions client-side would otherwise be blocked by RLS). The
// function only touches the reactions column and verifies the caller can see
// the message. userId is unused but kept for call-site compatibility.
export async function toggleReaction(messageId: string, emoji: string, _userId?: string) {
  const { data, error } = await supabase.rpc('toggle_message_reaction', { p_message: messageId, p_emoji: emoji });
  if (error) throw error;
  return (data || {}) as Record<string, string[]>;
}

export function subscribeToChannel(channelId: string, callback: (payload: any) => void) {
  return supabase
    .channel(`channel:${channelId}`)
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${channelId}` },
      callback
    )
    .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'messages', filter: `channel_id=eq.${channelId}` },
      callback
    )
    .subscribe();
}
