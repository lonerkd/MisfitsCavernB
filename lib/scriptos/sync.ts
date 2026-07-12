import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { getCurrentUser } from '@/lib/supabase/auth';

export interface Collaborator {
  userId: string;
  username: string;
  color: string;
  line?: number;
}

const CURSOR_COLORS = ['#ff6b00', '#00cc66', '#0099ff', '#a855f7', '#ec4899', '#eab308'];
const colorForUser = (userId: string) => CURSOR_COLORS[Math.abs(userId.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % CURSOR_COLORS.length];

export interface ConflictInfo {
  detected: boolean;
  remoteContent: string;
  remoteLength: number;
  localLength: number;
  message: string;
}

const NO_CONFLICT: ConflictInfo = { detected: false, remoteContent: '', remoteLength: 0, localLength: 0, message: '' };

export function useScriptSync(scriptId: string, localContent: string, onRemoteChange: (content: string) => void) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [conflict, setConflict] = useState<ConflictInfo>(NO_CONFLICT);

  const channelRef = useRef<any>(null);
  const meRef = useRef<{ id: string; username: string; color: string } | null>(null);

  const localRef = useRef(localContent);
  const lastRemoteRef = useRef<string>('');
  const lastLocalEditRef = useRef<number>(0);
  const lastCursorSentRef = useRef<number>(0);
  localRef.current = localContent;

  const noteLocalEdit = useCallback(() => { lastLocalEditRef.current = Date.now(); }, []);

  useEffect(() => {
    if (!scriptId) return;
    let cancelled = false;

    (async () => {
      const user = await getCurrentUser();
      if (!user || cancelled) return;
      const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single();
      const username = profile?.username || user.email?.split('@')[0] || 'Anonymous';
      meRef.current = { id: user.id, username, color: colorForUser(user.id) };

      const channel = supabase.channel(`script_${scriptId}`, {
        config: { broadcast: { self: false }, presence: { key: user.id } },
      });

      channel
        .on('broadcast', { event: 'content_update' }, (payload) => {
          const remote = payload.payload?.content;
          if (remote === undefined) return;
          const local = localRef.current;
          const base = lastRemoteRef.current;

          const typingNow = Date.now() - lastLocalEditRef.current < 1000;
          if (typingNow && base && local !== base && remote !== base &&
              Math.abs(local.length - base.length) > 5 && Math.abs(remote.length - base.length) > 5) {
            setConflict({ detected: true, remoteContent: remote, remoteLength: remote.length, localLength: local.length, message: 'A collaborator saved changes while you were typing.' });
            return;
          }

          lastRemoteRef.current = remote;
          if (remote !== local) onRemoteChange(remote);
        })
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const others: Collaborator[] = Object.keys(state)
            .filter(key => key !== user.id)
            .map(key => {
              const meta = (state[key][0] || {}) as any;
              return { userId: key, username: meta.username || 'Anonymous', color: colorForUser(key), line: meta.line };
            });
          setCollaborators(others);
        })
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') channel.track({ username, line: 1 });
        });

      channelRef.current = channel;
    })();

    return () => {
      cancelled = true;
      if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
      setCollaborators([]);
      setConflict(NO_CONFLICT);
      lastRemoteRef.current = '';
    };
  }, [scriptId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!scriptId || !channelRef.current) return;
    const timer = setTimeout(async () => {
      setIsSyncing(true);
      channelRef.current.send({ type: 'broadcast', event: 'content_update', payload: { content: localContent, timestamp: Date.now() } });
      lastRemoteRef.current = localContent;
      const user = await getCurrentUser();
      if (user) await supabase.from('scripts').update({ content: localContent, updated_at: new Date().toISOString(), last_edited_by: user.id }).eq('id', scriptId);
      setLastSyncedAt(new Date());
      setIsSyncing(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, [localContent, scriptId]);

  const broadcastCursor = useCallback((caretIndex: number) => {
    const ch = channelRef.current, me = meRef.current;
    if (!ch || !me) return;
    const now = Date.now();
    if (now - lastCursorSentRef.current < 320) return;
    lastCursorSentRef.current = now;
    const line = localRef.current.slice(0, caretIndex).split('\n').length;
    ch.track({ username: me.username, line });
  }, []);

  const resolveConflict = useCallback((choice: 'accept-remote' | 'keep-mine') => {
    setConflict(prev => {
      if (choice === 'accept-remote' && prev.remoteContent) { lastRemoteRef.current = prev.remoteContent; onRemoteChange(prev.remoteContent); }

      return NO_CONFLICT;
    });
  }, [onRemoteChange]);

  return { isSyncing, lastSyncedAt, collaborators, conflict, broadcastCursor, noteLocalEdit, resolveConflict };
}
