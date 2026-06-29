'use client';

import { supabase } from '@/lib/supabase/client';
import {
  getChannels,
  getChannelMessages,
  sendMessage as sbSendMessage,
  addReaction as sbAddReaction,
  removeReaction as sbRemoveReaction,
  pinMessage as sbPinMessage,
  initializeChannels,
} from '@/lib/supabase/lounge';

export interface Message {
  id: string;
  channelId: string;
  userId: string;
  username: string;
  content: string;
  reactions: Map<string, string[]>;
  pinned: boolean;
  createdAt: string;
  editedAt?: string;
}

export interface Channel {
  id: string;
  name: string;
  description: string;
  messages: Message[];
  pinnedMessages: string[];
  createdAt: string;
}

export interface LoungeState {
  channels: Channel[];
  currentUserId: string;
  currentUsername: string;
}

let currentUserId: string = '';
let currentUsername: string = 'Anonymous';

export async function initLounge() {
  try {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      currentUserId = data.user.id;
      currentUsername = data.user.email?.split('@')[0] || 'Anonymous';
    }
    await initializeChannels();
  } catch (error) {
    console.error('Failed to init lounge:', error);
  }
}

export async function getLounge(): Promise<LoungeState> {
  await initLounge();

  try {
    const sbChannels = await getChannels();

    const channels: Channel[] = await Promise.all(
      sbChannels.map(async (ch) => {
        const messages = await getChannelMessages(ch.id);

        return {
          id: ch.id,
          name: ch.name,
          description: ch.description,
          messages: messages.map((m) => ({
            id: m.id,
            channelId: m.channel_id,
            userId: m.user_id,
            username: m.username,
            content: m.content,
            reactions: new Map(Object.entries(m.reactions || {})),
            pinned: m.pinned,
            createdAt: m.created_at,
            editedAt: m.edited_at,
          })),
          pinnedMessages: messages.filter((m) => m.pinned).map((m) => m.id),
          createdAt: ch.created_at,
        };
      })
    );

    return {
      channels,
      currentUserId,
      currentUsername,
    };
  } catch (error) {
    console.error('Error loading lounge:', error);
    return {
      channels: [],
      currentUserId,
      currentUsername,
    };
  }
}

export async function saveLounge(state: LoungeState): Promise<void> {
  // Lounge state is now persisted to Supabase automatically
  // This function is a no-op for backwards compatibility
}

export async function sendMessage(content: string): Promise<void> {
  try {
    await sbSendMessage('general', currentUserId, currentUsername, content);
  } catch (error) {
    console.error('Failed to send message:', error);
    throw error;
  }
}

export async function addReaction(messageId: string, emoji: string): Promise<void> {
  try {
    await sbAddReaction(messageId, currentUserId, emoji);
  } catch (error) {
    console.error('Failed to add reaction:', error);
    throw error;
  }
}

export async function removeReaction(messageId: string, emoji: string): Promise<void> {
  try {
    await sbRemoveReaction(messageId, currentUserId, emoji);
  } catch (error) {
    console.error('Failed to remove reaction:', error);
    throw error;
  }
}

export async function pinMessage(messageId: string): Promise<void> {
  try {
    await sbPinMessage(messageId);
  } catch (error) {
    console.error('Failed to pin message:', error);
    throw error;
  }
}
