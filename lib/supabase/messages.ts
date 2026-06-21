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

export async function sendMessage(senderId: string, content: string, channelId?: string, receiverId?: string) {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      sender_id: senderId,
      receiver_id: receiverId,
      channel_id: channelId,
      content,
      reactions: {}
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getChannelMessages(channelId: string, limit = 100) {
  const { data, error } = await supabase
    .from('messages')
    .select('*, profiles!messages_sender_id_fkey(username, avatar_url)')
    .eq('channel_id', channelId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data.reverse();
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

export function subscribeToChannel(channelId: string, callback: (payload: any) => void) {
  return supabase
    .channel(`channel:${channelId}:${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${channelId}` },
      callback
    )
    .subscribe();
}

// DMs aren't filterable server-side by participant pair (Realtime filters
// only support a single equality clause), so subscribe to all new DMs
// addressed to or from the current user and let the caller decide if a
// given payload belongs to the open thread.
export function subscribeToDMs(userId: string, callback: (payload: any) => void) {
  return supabase
    .channel(`dm:${userId}:${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${userId}` },
      callback
    )
    .subscribe();
}

// Distinct people the current user has exchanged DMs with, most recent first.
export async function listDMConversations(userId: string) {
  const { data, error } = await supabase
    .from('messages')
    .select('*, sender:profiles!messages_sender_id_fkey(id, username, avatar_url), receiver:profiles!messages_receiver_id_fkey(id, username, avatar_url)')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .not('receiver_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) throw error;

  const seen = new Map<string, { id: string; username: string; avatar_url?: string; lastMessage: string; lastAt: string }>();
  for (const m of data || []) {
    const otherId = m.sender_id === userId ? m.receiver_id : m.sender_id;
    const other = m.sender_id === userId ? m.receiver : m.sender;
    if (!otherId || seen.has(otherId)) continue;
    seen.set(otherId, {
      id: otherId,
      username: other?.username || 'Unknown',
      avatar_url: other?.avatar_url,
      lastMessage: m.content,
      lastAt: m.created_at,
    });
  }
  return Array.from(seen.values());
}
