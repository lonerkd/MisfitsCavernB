import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { getCurrentUser } from '@/lib/supabase/auth';

export function useScriptSync(scriptId: string, localContent: string, onRemoteChange: (content: string) => void) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [channel, setChannel] = useState<any>(null);

  // Initialize sync
  useEffect(() => {
    if (!scriptId) return;

    const setupSync = async () => {
      const user = await getCurrentUser();
      if (!user) return; // Only sync if logged in

      // 1. Fetch initial remote state
      const { data, error } = await supabase
        .from('scripts')
        .select('content, updated_at')
        .eq('id', scriptId)
        .single();

      if (data && data.content) {
        // If remote has data and we just loaded, we should maybe prefer remote or prompt
        // For now, let's just use it if local is empty or we force it.
        // Actually, if we just landed on the page, we should load from local storage FIRST,
        // then if remote is newer, replace local. (Conflict resolution is tricky, keeping simple)
      }

      // 2. Setup Realtime Channel for Broadcast
      const newChannel = supabase.channel(`script_${scriptId}`, {
        config: { broadcast: { self: false } }
      });

      newChannel.on('broadcast', { event: 'content_update' }, (payload) => {
        if (payload.payload.content !== undefined) {
          onRemoteChange(payload.payload.content);
        }
      }).subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Realtime sync established for script:', scriptId);
        }
      });

      setChannel(newChannel);
    };

    setupSync();

    return () => {
      if (channel) supabase.removeChannel(channel);
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

  return { isSyncing, lastSyncedAt };
}
