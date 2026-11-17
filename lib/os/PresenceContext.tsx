'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useProject } from '@/lib/os';
import { awaitOSUser } from '@/lib/os';

export interface PresenceState {
  userId: string;
  email: string;
  color: string;
  sceneIdx: number | null;
  /** The tool they have open in the Studio ("production:safety"), or null when they are elsewhere. */
  tool?: string | null;
  lastActive: string;
}

interface PresenceContextType {
  onlineUsers: PresenceState[];
  updateScenePresence: (sceneIdx: number | null) => void;
  /** Say which tool this person has open (null when they leave it), so others in the project see who is where. */
  updateToolPresence: (tool: string | null) => void;
}

const PresenceContext = createContext<PresenceContextType>({
  onlineUsers: [],
  updateScenePresence: () => {},
  updateToolPresence: () => {},
});

const PRESENCE_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef'
];

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const { activeProject } = useProject();
  const [onlineUsers, setOnlineUsers] = useState<PresenceState[]>([]);
  const channelRef = useRef<any>(null);
  // What this person is showing the others; each change re-tracks the whole of it.
  const mineRef = useRef<{ sceneIdx: number | null; tool: string | null }>({ sceneIdx: null, tool: null });

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
        config: { private: true, presence: { key: myUserId } }
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
              sceneIdx: mineRef.current.sceneIdx,
              tool: mineRef.current.tool,
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
  }, [activeProject?.id]);

  const updateScenePresence = async (sceneIdx: number | null) => {
    mineRef.current = { ...mineRef.current, sceneIdx };
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
        tool: mineRef.current.tool,
        lastActive: new Date().toISOString()
      });
    }
  };

  const updateToolPresence = useCallback(async (tool: string | null) => {
    mineRef.current = { ...mineRef.current, tool };
    const currentChannel = channelRef.current;
    if (currentChannel && currentChannel.state === 'joined') {
      const user = await awaitOSUser();
      if (!user) return;
      const myColor = PRESENCE_COLORS[(user.id.charCodeAt(0) + user.id.charCodeAt(user.id.length - 1)) % PRESENCE_COLORS.length];
      await currentChannel.track({ userId: user.id, email: user.email || 'Unknown', color: myColor, sceneIdx: mineRef.current.sceneIdx, tool, lastActive: new Date().toISOString() });
    }
  }, []);

  return (
    <PresenceContext.Provider value={{ onlineUsers, updateScenePresence, updateToolPresence }}>
      {children}
    </PresenceContext.Provider>
  );
}

export const usePresence = () => useContext(PresenceContext);
