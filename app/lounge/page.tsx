'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Send, Smile } from 'lucide-react';
import Link from 'next/link';
import { getLounge, saveLounge, addReaction, removeReaction, type Channel } from '@/lib/storage/lounge';

const REACTION_EMOJIS = ['👍', '❤️', '🔥', '👀', '😂', '🎉'];

export default function LoungePage() {
  const [lounge, setLounge] = useState(getLounge());
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [username, setUsername] = useState(lounge.currentUsername);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);

  useEffect(() => {
    const loaded = getLounge();
    setLounge(loaded);
    setCurrentChannel(loaded.channels[0]);
  }, []);

  const handleUsernameChange = (newName: string) => {
    setUsername(newName);
    lounge.currentUsername = newName;
    saveLounge(lounge);
  };

  const handleSend = () => {
    if (newMessage.trim() && currentChannel) {
      const message = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        channelId: currentChannel.id,
        userId: lounge.currentUserId,
        username: username,
        content: newMessage,
        reactions: new Map(),
        pinned: false,
        createdAt: new Date().toISOString()
      };

      currentChannel.messages.push(message);
      saveLounge(lounge);
      setLounge(getLounge());
      setNewMessage('');
    }
  };

  const handleReaction = (messageId: string, emoji: string) => {
    addReaction(messageId, emoji);
    setLounge(getLounge());
  };

  const handleRemoveReaction = (messageId: string, emoji: string) => {
    removeReaction(messageId, emoji);
    setLounge(getLounge());
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', display: 'flex' }}>
      {/* Header */}
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: 60,
          background: 'rgba(8, 8, 8, 0.95)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 100
        }}
      >
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--fg)', textDecoration: 'none' }}>
          <ArrowLeft size={20} />
          <h1 style={{ fontFamily: 'var(--display)', fontSize: '1.2rem', letterSpacing: 4, margin: 0 }}>
            LOUNGE
          </h1>
        </Link>
        <input
          type="text"
          value={username}
          onChange={(e) => handleUsernameChange(e.target.value)}
          style={{
            padding: 8,
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: 'var(--fg)',
            fontFamily: 'var(--mono)',
            fontSize: 10,
            width: 150
          }}
          placeholder="Your name..."
        />
      </header>

      {/* Main Content */}
      <div style={{ marginTop: 60, display: 'flex', width: '100%', height: 'calc(100vh - 60px)' }}>
        {/* Channel List */}
        <div
          style={{
            width: 200,
            background: '#0a0a0a',
            borderRight: '1px solid rgba(255, 255, 255, 0.04)',
            padding: 16,
            overflowY: 'auto'
          }}
        >
          <h3 style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2, marginBottom: 16, opacity: 0.5 }}>
            CHANNELS
          </h3>
          {lounge.channels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => setCurrentChannel(channel)}
              style={{
                width: '100%',
                padding: 12,
                marginBottom: 8,
                background: currentChannel?.id === channel.id ? 'rgba(255, 60, 0, 0.1)' : 'transparent',
                border: currentChannel?.id === channel.id ? '1px solid var(--accent)' : '1px solid rgba(255, 255, 255, 0.1)',
                color: 'var(--fg)',
                fontFamily: 'var(--mono)',
                fontSize: 11,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (currentChannel?.id !== channel.id) {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                if (currentChannel?.id !== channel.id) {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }
              }}
            >
              <div># {channel.name}</div>
              <div style={{ fontSize: 9, opacity: 0.5, marginTop: 2 }}>{channel.messages.length} msgs</div>
            </button>
          ))}
        </div>

        {/* Messages Area */}
        {currentChannel && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Channel Header */}
            <div
              style={{
                height: 40,
                borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                padding: '12px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: 12
              }}
            >
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11 }}># {currentChannel.name}</div>
              <div style={{ fontSize: 9, opacity: 0.5 }}>{currentChannel.description}</div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
              <div style={{ maxWidth: 900 }}>
                {currentChannel.messages.map((msg) => (
                  <div key={msg.id} style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
                      <span
                        style={{
                          fontFamily: 'var(--display)',
                          fontSize: 13,
                          letterSpacing: 1,
                          color: 'var(--accent)'
                        }}
                      >
                        {msg.username}
                      </span>
                      <span style={{ fontSize: 9, opacity: 0.4 }}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.5, opacity: 0.9, marginBottom: 6 }}>
                      {msg.content}
                    </div>

                    {/* Reactions */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', fontSize: 11 }}>
                      {Array.from(msg.reactions.entries()).map(([emoji, reactors]) => (
                        <button
                          key={emoji}
                          onClick={() => {
                            if (reactors.includes(lounge.currentUserId)) {
                              handleRemoveReaction(msg.id, emoji);
                            } else {
                              handleReaction(msg.id, emoji);
                            }
                          }}
                          style={{
                            padding: '2px 6px',
                            background: reactors.includes(lounge.currentUserId) ? 'rgba(255, 60, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                            border: reactors.includes(lounge.currentUserId) ? '1px solid var(--accent)' : '1px solid rgba(255, 255, 255, 0.1)',
                            color: 'var(--fg)',
                            cursor: 'pointer',
                            borderRadius: 2
                          }}
                        >
                          {emoji} {reactors.length}
                        </button>
                      ))}

                      {/* Add Reaction Button */}
                      <div style={{ position: 'relative' }}>
                        <button
                          onClick={() => setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)}
                          style={{
                            padding: '2px 6px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: 'var(--fg)',
                            cursor: 'pointer',
                            borderRadius: 2
                          }}
                        >
                          <Smile size={12} />
                        </button>

                        {showEmojiPicker === msg.id && (
                          <div
                            style={{
                              position: 'absolute',
                              bottom: 30,
                              left: 0,
                              background: '#1a1a1a',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              borderRadius: 4,
                              padding: 8,
                              display: 'flex',
                              gap: 4,
                              zIndex: 50
                            }}
                          >
                            {REACTION_EMOJIS.map((emoji) => (
                              <button
                                key={emoji}
                                onClick={() => {
                                  handleReaction(msg.id, emoji);
                                  setShowEmojiPicker(null);
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontSize: 16,
                                  padding: 4
                                }}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Input */}
            <div
              style={{
                padding: 16,
                borderTop: '1px solid rgba(255, 255, 255, 0.04)',
                background: '#0a0a0a'
              }}
            >
              <div style={{ display: 'flex', gap: 12 }}>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Share your thoughts..."
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: 'var(--fg)',
                    fontFamily: 'var(--mono)',
                    fontSize: 11,
                    outline: 'none'
                  }}
                />
                <button
                  onClick={handleSend}
                  style={{
                    padding: '12px 20px',
                    background: 'var(--accent)',
                    border: 'none',
                    color: 'var(--bg)',
                    fontFamily: 'var(--mono)',
                    fontSize: 9,
                    letterSpacing: 1,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <Send size={12} /> SEND
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
