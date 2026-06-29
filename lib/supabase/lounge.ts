import { supabase } from './client';

export interface LoungeChannel {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export interface LoungeMessage {
  id: string;
  channel_id: string;
  user_id: string;
  username: string;
  content: string;
  reactions: Record<string, string[]>;
  pinned: boolean;
  created_at: string;
  edited_at?: string;
}

export async function initializeChannels() {
  const defaultChannels = [
    { id: 'general', name: 'general', description: 'General discussion' },
    { id: 'writing-room', name: 'writing-room', description: 'Collaborative writing space' },
    { id: 'music', name: 'music', description: 'Music and sound design' },
    { id: 'feedback', name: 'feedback', description: 'Project feedback and reviews' },
  ];

  for (const ch of defaultChannels) {
    const { error } = await supabase
      .from('lounge_channels')
      .insert(ch)
      .eq('id', ch.id)
      .single();
    // Ignore if it already exists
  }
}

export async function getChannels(): Promise<LoungeChannel[]> {
  const { data, error } = await supabase
    .from('lounge_channels')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getChannelMessages(channelId: string): Promise<LoungeMessage[]> {
  const { data, error } = await supabase
    .from('lounge_messages')
    .select('*')
    .eq('channel_id', channelId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function sendMessage(
  channelId: string,
  userId: string,
  username: string,
  content: string
): Promise<LoungeMessage> {
  const { data, error } = await supabase
    .from('lounge_messages')
    .insert({
      channel_id: channelId,
      user_id: userId,
      username,
      content,
      reactions: {},
      pinned: false,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function addReaction(
  messageId: string,
  userId: string,
  emoji: string
): Promise<void> {
  const { data: message, error: fetchError } = await supabase
    .from('lounge_messages')
    .select('reactions')
    .eq('id', messageId)
    .single();

  if (fetchError) throw fetchError;

  const reactions = message?.reactions || {};
  if (!reactions[emoji]) {
    reactions[emoji] = [];
  }
  if (!reactions[emoji].includes(userId)) {
    reactions[emoji].push(userId);
  }

  const { error: updateError } = await supabase
    .from('lounge_messages')
    .update({ reactions })
    .eq('id', messageId);

  if (updateError) throw updateError;
}

export async function removeReaction(
  messageId: string,
  userId: string,
  emoji: string
): Promise<void> {
  const { data: message, error: fetchError } = await supabase
    .from('lounge_messages')
    .select('reactions')
    .eq('id', messageId)
    .single();

  if (fetchError) throw fetchError;

  const reactions = message?.reactions || {};
  if (reactions[emoji]) {
    reactions[emoji] = reactions[emoji].filter((id: string) => id !== userId);
    if (reactions[emoji].length === 0) {
      delete reactions[emoji];
    }
  }

  const { error: updateError } = await supabase
    .from('lounge_messages')
    .update({ reactions })
    .eq('id', messageId);

  if (updateError) throw updateError;
}

export async function pinMessage(messageId: string): Promise<void> {
  const { error } = await supabase
    .from('lounge_messages')
    .update({ pinned: true })
    .eq('id', messageId);

  if (error) throw error;
}
