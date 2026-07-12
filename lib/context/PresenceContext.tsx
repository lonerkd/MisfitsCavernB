'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useProject } from '@/lib/os';
import { awaitOSUser } from '@/lib/os';

export interface PresenceState {
  userId: string;
  email: string;
  color: string;
  sceneIdx: number | null;
  lastActive: string;
}

interface PresenceContextType {
  onlineUsers: PresenceState[];
  updateScenePresence: (sceneIdx: number | null) => void;
}

const PresenceContext = createContext<PresenceContextType>({
  onlineUsers: [],
  updateScenePresence: () => {},
});

const PRESENCE_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef'
];

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const { activeProject } = useProject();
  const [onlineUsers, setOnlineUsers] = useState<PresenceState[]>([]);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!activeProject?.id || typeof window === 'undefined') return;

    let myUserId = '';
    let myEmail = '';
    let cancelled = false;

    const setupPresence = async () => {
      const user = await awaitOSUser();
      if (!user || cancelled) return;

      myUserId = user.id;
      myEmail = user.email || 'Unknown';
      const myColor = PRESENCE_COLORS[(myUserId.charCodeAt(0) + myUserId.charCodeAt(myUserId.length - 1)) % PRESENCE_COLORS.length];

      const room = supabase.channel(`presence:project_${activeProject.id}`, {
        config: { presence: { key: myUserId } }
      });

      channelRef.current = room;

      room
        .on('presence', { event: 'sync' }, () => {
          const state = room.presenceState();
          const users: PresenceState[] = [];

          for (const id in state) {

            const p = state[id][0] as any;
            if (p) users.push(p);
          }

          setOnlineUsers(users.filter(u => u.userId !== myUserId));
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED' && !cancelled) {
            await room.track({
              userId: myUserId,
              email: myEmail,
              color: myColor,
              sceneIdx: null,
              lastActive: new Date().toISOString()
            });
          }
        });
    };

    setupPresence();

    return () => {
      cancelled = true;
      const room = channelRef.current;
      if (room) {
        channelRef.current = null;
        supabase.removeChannel(room);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProject?.id]);

  const updateScenePresence = async (sceneIdx: number | null) => {
    const currentChannel = channelRef.current;
    if (currentChannel && currentChannel.state === 'joined') {
      const user = await awaitOSUser();
      if (!user) return;
      const myColor = PRESENCE_COLORS[(user.id.charCodeAt(0) + user.id.charCodeAt(user.id.length - 1)) % PRESENCE_COLORS.length];

      await currentChannel.track({
        userId: user.id,
        email: user.email || 'Unknown',
        color: myColor,
        sceneIdx,
        lastActive: new Date().toISOString()
      });
    }
  };

  return (
    <PresenceContext.Provider value={{ onlineUsers, updateScenePresence }}>
      {children}
    </PresenceContext.Provider>
  );
}

export const usePresence = () => useContext(PresenceContext);
