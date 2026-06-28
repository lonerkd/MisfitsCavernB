import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { getCurrentUser } from '@/lib/supabase/auth';

export interface Collaborator {
  userId: string;
  username: string;
  color: string;
}

const CURSOR_COLORS = ['#ff6b00', '#00cc66', '#0099ff', '#a855f7', '#ec4899', '#eab308'];
const colorForUser = (userId: string) => CURSOR_COLORS[Math.abs(userId.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % CURSOR_COLORS.length];

export function useScriptSync(scriptId: string, localContent: string, onRemoteChange: (content: string) => void) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [channel, setChannel] = useState<any>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);

  // Initialize sync
  useEffect(() => {
    if (!scriptId) return;

    const setupSync = async () => {
      const user = await getCurrentUser();
      if (!user) return; // Only sync if logged in

      const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single();
      const username = profile?.username || user.email?.split('@')[0] || 'Anonymous';

      // Realtime channel: content broadcast + presence (who's currently editing)
      const newChannel = supabase.channel(`script_${scriptId}`, {
        config: { broadcast: { self: false }, presence: { key: user.id } }
      });

      newChannel
        .on('broadcast', { event: 'content_update' }, (payload) => {
          if (payload.payload.content !== undefined) {
            onRemoteChange(payload.payload.content);
          }
        })
        .on('presence', { event: 'sync' }, () => {
          const state = newChannel.presenceState();
          const others: Collaborator[] = Object.keys(state)
            .filter(key => key !== user.id)
            .map(key => {
              const meta = state[key][0] as any;
              return { userId: key, username: meta.username, color: colorForUser(key) };
            });
          setCollaborators(others);
        })
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            newChannel.track({ username });
          }
        });

      setChannel(newChannel);
    };

    setupSync();

    return () => {
      setChannel((current: any) => {
        if (current) supabase.removeChannel(current);
        return null;
      });
      setCollaborators([]);
    };
  }, [scriptId]);

  // Push local changes
  useEffect(() => {
    if (!scriptId || !channel) return;

    const pushChanges = async () => {
      setIsSyncing(true);

      // Broadcast to other clients immediately
      channel.send({
        type: 'broadcast',
        event: 'content_update',
        payload: { content: localContent, timestamp: Date.now() }
      });

      // Debounce saving to DB (handled by storage.ts or we can do it here)
      // Let's do DB save here so storage.ts can remain local-first
      const user = await getCurrentUser();
      if (user) {
        await supabase
          .from('scripts')
          .update({ content: localContent, updated_at: new Date().toISOString() })
          .eq('id', scriptId);
      }

      setLastSyncedAt(new Date());
      setIsSyncing(false);
    };

    const timer = setTimeout(pushChanges, 1500); // Debounce push
    return () => clearTimeout(timer);
  }, [localContent, scriptId, channel]);

  return { isSyncing, lastSyncedAt, collaborators };
}
