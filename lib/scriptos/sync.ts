import { useCallback, useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from 'react';
import { get, set } from 'idb-keyval';
import * as Y from 'yjs';
import { supabase } from '@/lib/supabase/client';
import { awaitOSUser } from '@/lib/os';
import {
  applyScriptText,
  decodeScriptTextUpdate,
  encodeScriptUpdate,
  encodeScriptTextUpdate,
  encodeScriptTextState,
  LOCAL_EDIT_ORIGIN,
  REMOTE_EDIT_ORIGIN,
  restoreScriptTextState,
  SCRIPT_TEXT_FIELD,
  scriptTextStateKey,
  seedScriptText,
  type PersistedScriptText,
} from './cowriting';

export interface Collaborator {
  userId: string;
  username: string;
  color: string;
  line?: number;
}

const CURSOR_COLORS = ['#ff6b00', '#00cc66', '#0099ff', '#a855f7', '#ec4899', '#eab308'];
const colorForUser = (userId: string) => CURSOR_COLORS[Math.abs(userId.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % CURSOR_COLORS.length];
const YJS_UPDATE_EVENT = 'yjs_update';
const YJS_SYNC_REQUEST_EVENT = 'yjs_sync_request';
const YJS_SYNC_EVENT = 'yjs_sync';

export function useScriptSync(scriptId: string, localContent: string, onRemoteChange: (content: string) => void) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);

  const channelRef = useRef<any>(null);
  const usernameRef = useRef('Anonymous');
  const textRef = useRef<Y.Text | null>(null);
  const undoManagerRef = useRef<Y.UndoManager | null>(null);
  const readyRef = useRef(false);
  const localContentRef = useRef(localContent);
  const pendingContentRef = useRef<string | null>(null);
  const lastCursorSentRef = useRef(0);
  useLayoutEffect(() => { localContentRef.current = localContent; });

  const applyRemote = useEffectEvent((content: string) => onRemoteChange(content));

  useEffect(() => {
    if (!scriptId) return;
    let cancelled = false;
    let subscribed = false;
    let saveTimer: ReturnType<typeof setTimeout> | null = null;
    let doc: Y.Doc | null = null;
    let text: Y.Text | null = null;
    let undoManager: Y.UndoManager | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let baseContent = '';
    pendingContentRef.current = null;

    const publish = (content: string) => {
      pendingContentRef.current = content;
      applyRemote(content);
    };

    const sendUpdate = (update: Uint8Array) => {
      if (!channel || !subscribed) return;
      void channel.send({
        type: 'broadcast',
        event: YJS_UPDATE_EVENT,
        payload: { update: encodeScriptUpdate(update) },
      }).then((status) => {
        if (status === 'ok') setLastSyncedAt(new Date());
      }).catch((error) => console.warn('[Script Sync] Could not broadcast a Yjs update:', error));
    };

    const sendState = () => {
      if (!channel || !subscribed || !doc) return;
      void channel.send({
        type: 'broadcast',
        event: YJS_SYNC_EVENT,
        payload: { update: encodeScriptTextUpdate(doc) },
      }).then((status) => {
        if (status === 'ok') setLastSyncedAt(new Date());
      }).catch((error) => console.warn('[Script Sync] Could not broadcast Yjs state:', error));
    };

    const receiveUpdate = ({ payload }: { payload?: { update?: unknown } }) => {
      const encoded = payload?.update;
      if (typeof encoded !== 'string' || encoded.length > 2_700_000) return;
      const update = decodeScriptTextUpdate(encoded);
      if (!update || update.length > 2_000_000) return;
      try { Y.applyUpdate(doc!, update, REMOTE_EDIT_ORIGIN); }
      catch (error) { console.warn('[Script Sync] Ignored an invalid Yjs update:', error); }
    };

    const persist = () => {
      if (!doc) return;
      void set(scriptTextStateKey(scriptId), encodeScriptTextState(doc, baseContent))
        .catch((error) => console.warn('[Script Sync] Could not persist local Yjs state:', error));
    };

    const saveContent = () => {
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(async () => {
        if (!text || cancelled) return;
        const content = text.toString();
        const user = await awaitOSUser();
        if (!user || cancelled) return;
        setIsSyncing(true);
        try {
          const { error } = await supabase.from('scripts').update({
            content,
            yjs_state: encodeScriptTextUpdate(doc!),
            updated_at: new Date().toISOString(),
            last_edited_by: user.id,
          }).eq('id', scriptId);
          if (cancelled) return;
          if (error) console.warn('[Script Sync] Could not save the merged script:', error);
          else setLastSyncedAt(new Date());
        } catch (error) {
          if (!cancelled) console.warn('[Script Sync] Could not save the merged script:', error);
        } finally {
          if (!cancelled) setIsSyncing(false);
        }
      }, 1200);
    };

    const setup = async () => {
      const user = await awaitOSUser();
      if (!user || cancelled) return;

      const [savedState, profileResult, scriptResult] = await Promise.all([
        get<PersistedScriptText>(scriptTextStateKey(scriptId)).catch(() => undefined),
        supabase.from('profiles').select('username').eq('id', user.id).single(),
        supabase.from('scripts').select('content,yjs_state').eq('id', scriptId).maybeSingle(),
      ]);
      if (cancelled) return;

      doc = new Y.Doc();
      text = doc.getText(SCRIPT_TEXT_FIELD);
      const initialServerContent = scriptResult.data?.content ?? localContentRef.current;
      baseContent = savedState?.baseContent ?? initialServerContent;
      if (savedState?.state?.length) {
        try { restoreScriptTextState(doc, savedState); }
        catch (error) {
          console.warn('[Script Sync] Ignored invalid local Yjs state:', error);
          seedScriptText(doc, initialServerContent);
          applyScriptText(text, localContentRef.current, REMOTE_EDIT_ORIGIN);
        }
      }
      else if (scriptResult.data?.yjs_state) {
        const remoteState = decodeScriptTextUpdate(scriptResult.data.yjs_state);
        if (remoteState) {
          try { Y.applyUpdate(doc, remoteState, REMOTE_EDIT_ORIGIN); }
          catch { seedScriptText(doc, initialServerContent); }
        } else seedScriptText(doc, initialServerContent);
      } else {
        seedScriptText(doc, initialServerContent);
        applyScriptText(text, localContentRef.current, REMOTE_EDIT_ORIGIN);
      }
      if (savedState && scriptResult.data?.yjs_state) {
        const remoteState = decodeScriptTextUpdate(scriptResult.data.yjs_state);
        if (remoteState) {
          try { Y.applyUpdate(doc, remoteState, REMOTE_EDIT_ORIGIN); }
          catch (error) { console.warn('[Script Sync] Ignored invalid stored Yjs state:', error); }
        }
      } else if (!savedState && text.toString() !== localContentRef.current) {
        applyScriptText(text, localContentRef.current, REMOTE_EDIT_ORIGIN);
      }

      undoManager = new Y.UndoManager(text, { trackedOrigins: new Set([LOCAL_EDIT_ORIGIN]), captureTimeout: 600 });
      textRef.current = text;
      undoManagerRef.current = undoManager;

      const onTextChange = () => {
        const content = text!.toString();
        if (content !== localContentRef.current) publish(content);
      };
      text.observe(onTextChange);
      doc.on('update', (update) => {
        persist();
        sendUpdate(update);
        saveContent();
      });

      const initialContent = text.toString();
      if (initialContent !== localContentRef.current) publish(initialContent);
      readyRef.current = true;
      persist();

      const username = profileResult.data?.username || user.email?.split('@')[0] || 'Anonymous';
      usernameRef.current = username;
      channel = supabase.channel(`script_${scriptId}`, {
        config: { broadcast: { self: false }, presence: { key: user.id } },
      });
      channel
        .on('broadcast', { event: YJS_UPDATE_EVENT }, receiveUpdate)
        .on('broadcast', { event: YJS_SYNC_EVENT }, receiveUpdate)
        .on('broadcast', { event: YJS_SYNC_REQUEST_EVENT }, sendState)
        .on('broadcast', { event: 'append' }, ({ payload }) => {
          const addition = payload?.text;
          if (typeof addition !== 'string' || !addition) return;
          text!.insert(text!.length, addition, REMOTE_EDIT_ORIGIN);
        })
        .on('presence', { event: 'sync' }, () => {
          const state = channel!.presenceState();
          setCollaborators(Object.keys(state)
            .filter((key) => key !== user.id)
            .map((key) => {
              const meta = (state[key][0] || {}) as { username?: string; line?: number };
              return { userId: key, username: meta.username || 'Anonymous', color: colorForUser(key), line: meta.line };
            }));
        })
        .subscribe((status: string) => {
          if (status !== 'SUBSCRIBED' || cancelled) return;
          subscribed = true;
          void channel!.track({ username, line: 1 });
          void (async () => {
            const { data, error } = await supabase.from('scripts')
              .select('yjs_state')
              .eq('id', scriptId)
              .maybeSingle();
            if (cancelled) return;
            if (error) console.warn('[Script Sync] Could not load the latest shared state:', error);
            else if (data?.yjs_state) {
              const latestState = decodeScriptTextUpdate(data.yjs_state);
              if (latestState) {
                try { Y.applyUpdate(doc!, latestState, REMOTE_EDIT_ORIGIN); }
                catch (updateError) { console.warn('[Script Sync] Ignored invalid shared Yjs state:', updateError); }
              }
            }
            sendUpdate(Y.encodeStateAsUpdate(doc!));
            sendState();
            void channel!.send({ type: 'broadcast', event: YJS_SYNC_REQUEST_EVENT, payload: {} });
            saveContent();
          })();
        });
      channelRef.current = channel;
    };

    void setup().catch((error) => console.error('[Script Sync] Could not start co-writing:', error));

    return () => {
      cancelled = true;
      readyRef.current = false;
      subscribed = false;
      if (saveTimer) clearTimeout(saveTimer);
      if (channel) void supabase.removeChannel(channel);
      if (channelRef.current === channel) channelRef.current = null;
      if (undoManager) undoManager.destroy();
      if (doc) doc.destroy();
      textRef.current = null;
      undoManagerRef.current = null;
      pendingContentRef.current = null;
      setCollaborators([]);
      setIsSyncing(false);
      setLastSyncedAt(null);
    };
  }, [scriptId]);

  useLayoutEffect(() => {
    if (!scriptId || !readyRef.current) return;
    const pending = pendingContentRef.current;
    if (pending !== null) {
      if (localContent === pending) pendingContentRef.current = null;
      else return;
    }
    const text = textRef.current;
    if (text && text.toString() !== localContent) {
      applyScriptText(text, localContent, LOCAL_EDIT_ORIGIN);
    }
  }, [localContent, scriptId]);

  const broadcastCursor = useCallback((caretIndex: number) => {
    const channel = channelRef.current;
    if (!channel) return;
    const now = Date.now();
    if (now - lastCursorSentRef.current < 320) return;
    lastCursorSentRef.current = now;
    const line = localContentRef.current.slice(0, caretIndex).split('\n').length;
    void channel.track({ username: usernameRef.current, line });
  }, []);

  const undo = useCallback(() => undoManagerRef.current?.undo(), []);
  const redo = useCallback(() => undoManagerRef.current?.redo(), []);
  const stopUndoCapturing = useCallback(() => undoManagerRef.current?.stopCapturing(), []);

  return { isSyncing, lastSyncedAt, collaborators, broadcastCursor, undo, redo, stopUndoCapturing };
}
