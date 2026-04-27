'use client';

import React, { useState } from 'react';
import { ArrowLeft, Send, Music, Users } from 'lucide-react';
import Link from 'next/link';
import GrainOverlay from '@/components/GrainOverlay';

interface Message {
  id: string;
  user: string;
  text: string;
  timestamp: Date;
}

export default function LoungePage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      user: 'Peter',
      text: 'Working on the final edit for 10 Million. The timing is perfect.',
      timestamp: new Date('2026-04-27T01:30:00')
    },
    {
      id: '2',
      user: 'Creative',
      text: 'Can\'t wait to see it! The rough cut was incredible.',
      timestamp: new Date('2026-04-27T01:32:00')
    }
  ]);
  const [newMessage, setNewMessage] = useState('');

  const handleSend = () => {
    if (newMessage.trim()) {
      setMessages([
        ...messages,
        {
          id: Date.now().toString(),
          user: 'You',
          text: newMessage,
          timestamp: new Date()
        }
      ]);
      setNewMessage('');
    }
  };

  return (
    <main style={{ background: 'var(--bg)', color: 'var(--fg)', minHeight: '100vh' }}>
      <GrainOverlay />

      {/* Header */}
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          padding: '18px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 100,
          background: 'rgba(8, 8, 8, 0.95)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.04)'
        }}
      >
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
          <ArrowLeft size={18} color="var(--fg)" />
          <div style={{ fontFamily: 'var(--display)', fontSize: '1.15rem', letterSpacing: 6, color: 'var(--fg)' }}>
            LOUNGE
          </div>
        </Link>

        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, opacity: 0.5 }}>
            <Users size={14} /> 3 Online
          </div>
          <button className="link-btn" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Music size={12} /> Now Playing
          </button>
        </div>
      </nav>

      {/* Lounge Content */}
      <div style={{ paddingTop: 80, display: 'flex', height: 'calc(100vh - 80px)' }}>
        {/* Main Chat */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Messages */}
          <div style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
            <div style={{ maxWidth: 800, margin: '0 auto' }}>
              {messages.map((msg) => (
                <div key={msg.id} style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
                    <span
                      style={{
                        fontFamily: 'var(--display)',
                        fontSize: 14,
                        letterSpacing: 2,
                        color: 'var(--accent)'
                      }}
                    >
                      {msg.user}
                    </span>
                    <span style={{ fontSize: 9, opacity: 0.3 }}>
                      {msg.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <p
                    style={{
                      fontFamily: 'var(--serif)',
                      fontSize: 14,
                      lineHeight: 1.6,
                      opacity: 0.8
                    }}
                  >
                    {msg.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Input */}
          <div
            style={{
              padding: 24,
              borderTop: '1px solid rgba(255, 255, 255, 0.04)',
              background: '#0a0a0a'
            }}
          >
            <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', gap: 12 }}>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Share your thoughts..."
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'var(--fg)',
                  fontFamily: 'var(--mono)',
                  fontSize: 12,
                  outline: 'none'
                }}
              />
              <button
                onClick={handleSend}
                style={{
                  padding: '12px 24px',
                  background: 'var(--accent)',
                  border: 'none',
                  color: 'var(--bg)',
                  fontFamily: 'var(--mono)',
                  fontSize: 10,
                  letterSpacing: 2,
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

        {/* Sidebar */}
        <div
          style={{
            width: 300,
            borderLeft: '1px solid rgba(255, 255, 255, 0.04)',
            background: '#0a0a0a',
            padding: 24,
            overflowY: 'auto'
          }}
        >
          <h3
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 10,
              letterSpacing: 3,
              marginBottom: 20,
              opacity: 0.5
            }}
          >
            CREW ONLINE
          </h3>

          {['Peter Olowude', 'Creative Director', 'Producer'].map((name, i) => (
            <div
              key={i}
              style={{
                padding: 12,
                marginBottom: 8,
                border: '1px solid rgba(255, 255, 255, 0.04)',
                display: 'flex',
                alignItems: 'center',
                gap: 10
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: i === 0 ? 'var(--accent)' : '#666'
                }}
              />
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{name}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
