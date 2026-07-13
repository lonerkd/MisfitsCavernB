import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

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
