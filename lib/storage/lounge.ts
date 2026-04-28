const LOUNGE_KEY = 'misfits_cavern_lounge';

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

function getDefaultLounge(): LoungeState {
  return {
    channels: [
      {
        id: 'general',
        name: 'general',
        description: 'General discussion',
        messages: [],
        pinnedMessages: [],
        createdAt: new Date().toISOString()
      },
      {
        id: 'writing-room',
        name: 'writing-room',
        description: 'Collaborative writing space',
        messages: [],
        pinnedMessages: [],
        createdAt: new Date().toISOString()
      },
      {
        id: 'music',
        name: 'music',
        description: 'Music and sound design',
        messages: [],
        pinnedMessages: [],
        createdAt: new Date().toISOString()
      },
      {
        id: 'feedback',
        name: 'feedback',
        description: 'Project feedback and reviews',
        messages: [],
        pinnedMessages: [],
        createdAt: new Date().toISOString()
      }
    ],
    currentUserId: generateId(),
    currentUsername: 'Anonymous'
  };
}

export function getLounge(): LoungeState {
  if (typeof window === 'undefined') return getDefaultLounge();

  try {
    const stored = localStorage.getItem(LOUNGE_KEY);
    if (!stored) {
      const defaultLounge = getDefaultLounge();
      localStorage.setItem(LOUNGE_KEY, JSON.stringify(defaultLounge));
      return defaultLounge;
    }

    const parsed = JSON.parse(stored);
    // Convert reaction Maps back from JSON
    parsed.channels.forEach((channel: Channel) => {
      channel.messages.forEach((msg: any) => {
        msg.reactions = new Map(Object.entries(msg.reactions || {}));
      });
    });
    return parsed;
  } catch (error) {
    console.error('Error loading lounge:', error);
    return getDefaultLounge();
  }
}

export function saveLounge(state: LoungeState): void {
  if (typeof window === 'undefined') return;

  const toSave = {
    ...state,
    channels: state.channels.map(ch => ({
      ...ch,
      messages: ch.messages.map(msg => ({
        ...msg,
        reactions: Object.fromEntries(msg.reactions)
      }))
    }))
  };

  localStorage.setItem(LOUNGE_KEY, JSON.stringify(toSave));
}

export function sendMessage(content: string): void {
  const lounge = getLounge();
  const channel = lounge.channels[0]; // general by default

  const message: Message = {
    id: generateId(),
    channelId: channel.id,
    userId: lounge.currentUserId,
    username: lounge.currentUsername,
    content,
    reactions: new Map(),
    pinned: false,
    createdAt: new Date().toISOString()
  };

  channel.messages.push(message);
  saveLounge(lounge);
}

export function addReaction(messageId: string, emoji: string): void {
  const lounge = getLounge();

  lounge.channels.forEach(channel => {
    const message = channel.messages.find(m => m.id === messageId);
    if (message) {
      if (!message.reactions.has(emoji)) {
        message.reactions.set(emoji, []);
      }

      const reactors = message.reactions.get(emoji)!;
      if (!reactors.includes(lounge.currentUserId)) {
        reactors.push(lounge.currentUserId);
      }

      saveLounge(lounge);
    }
  });
}

export function removeReaction(messageId: string, emoji: string): void {
  const lounge = getLounge();

  lounge.channels.forEach(channel => {
    const message = channel.messages.find(m => m.id === messageId);
    if (message) {
      const reactors = message.reactions.get(emoji) || [];
      message.reactions.set(
        emoji,
        reactors.filter(r => r !== lounge.currentUserId)
      );

      if ((message.reactions.get(emoji) || []).length === 0) {
        message.reactions.delete(emoji);
      }

      saveLounge(lounge);
    }
  });
}

export function pinMessage(messageId: string): void {
  const lounge = getLounge();

  lounge.channels.forEach(channel => {
    const message = channel.messages.find(m => m.id === messageId);
    if (message) {
      message.pinned = true;
      if (!channel.pinnedMessages.includes(messageId)) {
        channel.pinnedMessages.push(messageId);
      }
      saveLounge(lounge);
    }
  });
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
