import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

// Real live presence — who is actually online right now — tracked over one
// shared Realtime presence channel so every page reads the same truth
// instead of each maintaining its own guess (originally lived only in
// app/lounge/page.tsx; Crew profiles and Studio's crew hub had no presence
// at all). Calling this also tracks the CURRENT user as online for as long
// as the calling component is mounted, same as the Lounge always has.
export function useOnlinePresence(currentUserId: string | null | undefined): Set<string> {
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!currentUserId) return;
    const ch = supabase.channel('lounge-presence', { config: { presence: { key: currentUserId } } });
    ch.on('presence', { event: 'sync' }, () => {
      setOnlineIds(new Set(Object.keys(ch.presenceState())));
    }).subscribe(async (status) => {
      if (status === 'SUBSCRIBED') await ch.track({ online_at: Date.now() });
    });
    return () => { supabase.removeChannel(ch); };
  }, [currentUserId]);

  return onlineIds;
}
