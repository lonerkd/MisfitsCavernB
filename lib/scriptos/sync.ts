import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { getCurrentUser } from '@/lib/supabase/auth';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Single source of truth for autosaving a script's content to Supabase.
// Debounces on `localContent` changes, broadcasts to collaborators in real
// time, and exposes `flushSave` so a manual "Save" button can funnel through
// the exact same write path (guarded by `inFlight`) instead of racing it.
export function useScriptSync(scriptId: string, localContent: string, onRemoteChange: (content: string) => void) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const channelRef = useRef<any>(null);
  const inFlight = useRef(false);
  const latestContent = useRef(localContent);
  latestContent.current = localContent;

  // Initialize the realtime broadcast channel for this script.
  useEffect(() => {
    if (!scriptId) return;
    let active = true;
    let localChannel: any = null;

    const setupSync = async () => {
      const user = await getCurrentUser();
      if (!user || !active) return; // Only sync if logged in

      localChannel = supabase.channel(`script_${scriptId}:${Math.random().toString(36).slice(2)}`, {
        config: { broadcast: { self: false } }
      });

      localChannel.on('broadcast', { event: 'content_update' }, (payload: any) => {
        if (payload.payload.content !== undefined) {
          onRemoteChange(payload.payload.content);
        }
      }).subscribe();

      channelRef.current = localChannel;
    };

    setupSync();

    return () => {
      active = false;
      if (localChannel) supabase.removeChannel(localChannel);
      channelRef.current = null;
    };
  }, [scriptId]);

  // The single write path: broadcasts to collaborators, then persists to
  // Supabase. Guarded by `inFlight` so the debounced autosave and a manual
  // save can never both be mid-write at once and clobber each other.
  const flushSave = useCallback(async () => {
    if (!scriptId || !UUID_RE.test(scriptId) || inFlight.current) return;
    inFlight.current = true;
    setIsSyncing(true);
    try {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'content_update',
        payload: { content: latestContent.current, timestamp: Date.now() }
      });

      const user = await getCurrentUser();
      if (user) {
        const { error } = await supabase
          .from('scripts')
          .update({ content: latestContent.current, updated_at: new Date().toISOString() })
          .eq('id', scriptId);
        if (error) console.error('Error syncing script content:', error);
      }

      setLastSyncedAt(new Date());
    } finally {
      setIsSyncing(false);
      inFlight.current = false;
    }
  }, [scriptId]);

  // Debounce the push whenever local content changes.
  useEffect(() => {
    if (!scriptId) return;
    const timer = setTimeout(flushSave, 1500);
    return () => clearTimeout(timer);
  }, [localContent, scriptId, flushSave]);

  return { isSyncing, lastSyncedAt, flushSave };
}
