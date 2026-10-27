'use client';

import { useViewAs, effectiveOwner } from '@/lib/os/viewAs';
import { useState, useRef, useEffect, useEffectEvent, useCallback, useMemo } from 'react';
import { audienceLabel } from '@/lib/lounge/audience';
import { supabase } from '@/lib/supabase/client';
import { getProjectTeam } from '@/lib/supabase/crew-management';
import { getDMThread, sendDirectMessage, toggleReaction, getThreadReplies, getReplyCounts, sendChannelMessage, getChannelMessagesByUuid, subscribeToChannelUuid, deleteMessage, editMessage, pinMessage, markLoungeRead, getLoungeUnread, type LoungeHit, type LoungeUnread } from '@/lib/supabase/messages';
import { getMyAccount, getProfile } from '@/lib/supabase/profiles';
import { listChannels, createChannel, canPostChannel, canManageChannel, type Channel } from '@/lib/supabase/channels';
import { useProject } from '@/lib/os';
import { usePillStage } from '@/lib/os/PillContext';
import { useOSGate } from '@/lib/os';
import { notify } from '@/lib/supabase/notifications';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/Confirm';
import { useOnlinePresence } from '@/lib/hooks/usePresence';
import { awaitOSUser } from '@/lib/os';
import { useProjectBrief, loadChannelPresets, suggestChannels, type ChannelPreset } from '@/lib/brief';
import { mapStatusToPhase } from '@/lib/os/phases';
import { useSearchParam } from '@/lib/hooks/useSearchParam';
import type { Message } from '@/components/lounge/types';

const NO_CREW: any[] = [];
const NO_REPLIES: Message[] = [];

export function useLounge() {
  const { isLoading } = useOSGate();
  const { toast } = useToast();
  const reportError = useEffectEvent((message: string) => toast(message, 'error'));
  const confirm = useConfirm();
  const { activeProject, projects, setActiveProject } = useProject();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  // What I may do in the open channel, tagged with the channel it answers for.
  const [perms, setPerms] = useState<{ id: string; post: boolean; manage: boolean } | null>(null);
  // Where a new channel goes: the active project, or (admins) the community.
  const [showNewChannel, setShowNewChannel] = useState<false | 'project' | 'community'>(false);
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => { getMyAccount().then((a) => setIsAdmin(!!a?.is_admin)).catch(() => setIsAdmin(false)); }, []);
  const [showManage, setShowManage] = useState(false);
  const [dmTarget, setDmTarget] = useState<{ id: string; name: string } | null>(null);
  const [replyCounts, setReplyCounts] = useState<Record<string, number>>({});
  const [threadParent, setThreadParent] = useState<Message | null>(null);
  const [thread, setThread] = useState<{ parentId: string; replies: Message[] } | null>(null);
  const [threadInput, setThreadInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [myProfile, setMyProfile] = useState<any>(null);
  // The active project's people, tagged with the project they belong to.
  const [crew, setCrew] = useState<{ projectId: string; team: any[] } | null>(null);
  const crewList = crew && crew.projectId === activeProject?.id ? crew.team : NO_CREW;
  const [showEmoji, setShowEmoji] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const onlineIds = useOnlinePresence(currentUser?.id);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingChannelRef = useRef<any>(null);
  const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const lastBroadcast = useRef(0);
  // Unread per channel and per person; search and pinned panels; the message to jump to.
  const [unread, setUnread] = useState<LoungeUnread>({ channels: {}, people: {} });
  const [showSearch, setShowSearch] = useState(false);
  const [showPinned, setShowPinned] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const pendingChannel = useRef<string | null>(null);
  // On a phone the Lounge is one pane at a time: the list (channels and
  // people) or the conversation. Desktop shows both; CSS decides.
  // A link straight into a conversation (/lounge?channel=<id> or ?dm=<person>)
  // opens on the conversation until a choice is made.
  const linkedChannel = useSearchParam('channel');
  const linkedDm = useSearchParam('dm');
  const [paneChoice, setPane] = useState<'list' | 'chat' | null>(null);
  const pane = paneChoice ?? (linkedChannel || linkedDm ? 'chat' : 'list');
  const openChannel = (ch: Channel) => { setActiveChannel(ch); setDmTarget(null); setPane('chat'); };
  const openDM = (t: { id: string; name: string }) => { setDmTarget(t); setPane('chat'); };

  // A link straight into a conversation: /lounge?channel=<id> or ?dm=<person>.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const channel = q.get('channel'), dm = q.get('dm');
    if (channel) pendingChannel.current = channel;
    if (dm) {
      getProfile(dm)
        .then((p) => { if (p) openDM({ id: p.id, name: p.username || 'someone' }); })
        .catch(() => reportError('Could not open that conversation.'));
    }
  }, []);

  const showChannels = useCallback((list: Channel[]) => {
    setChannels(list);
    setActiveChannel(prev => {
      const pending = pendingChannel.current && list.find(c => c.id === pendingChannel.current);
      if (pending) { pendingChannel.current = null; return pending; }
      if (prev && list.some(c => c.id === prev.id)) return prev;
      return list.find(c => c.type === 'text') || list[0] || null;
    });
  }, []);
  const reloadChannels = useCallback(async () => showChannels(await listChannels(activeProject?.id)), [activeProject?.id, showChannels]);

  useEffect(() => {
    let alive = true;
    listChannels(activeProject?.id).then((list) => { if (alive) showChannels(list); });
    return () => { alive = false; };
  }, [activeProject?.id, showChannels]);

  // Channels a production tends to want, offered to its owner when they fit
  // the phase, the brief and the crew (public.channel_presets, lib/brief).
  const viewMode = useViewAs(activeProject?.id);
  const ownsActive = effectiveOwner(!!(activeProject && currentUser && activeProject.creator_id === currentUser.id), viewMode);
  const loungePhase = activeProject ? mapStatusToPhase(activeProject.status) : null;
  const loungeBrief = useProjectBrief(ownsActive ? activeProject!.id : null, activeProject?.project_type ?? null, loungePhase, { script: false });
  const [presets, setPresets] = useState<ChannelPreset[]>([]);
  useEffect(() => { if (ownsActive) loadChannelPresets().then(setPresets).catch(() => setPresets([])); }, [ownsActive]);
  const suggested = useMemo(() => {
    if (!ownsActive || !loungePhase || loungeBrief.loading) return [];
    const open = channels.filter((c) => c.project_id === activeProject!.id).map((c) => c.name);
    return suggestChannels(presets, { phase: loungePhase, context: { ...loungeBrief.context, channels: open }, implied: loungeBrief.implied.channels });
  }, [ownsActive, loungePhase, loungeBrief.loading, loungeBrief.context, loungeBrief.implied.channels, presets, channels, activeProject]);
  const addPreset = async (p: ChannelPreset) => {
    if (!activeProject) return;
    const { channel, error } = await createChannel({ project_id: activeProject.id, name: p.name, type: p.type, audience: p.audience, post_policy: p.post_policy, topic: p.topic });
    if (error) { toast(error, 'error'); return; }
    toast(`Opened #${p.name} for ${audienceLabel(p.audience).toLowerCase()}`, 'success');
    await reloadChannels();
    if (channel) openChannel(channel);
  };

  // The people on the active project: its owner and crew (not the whole platform).
  const crewProjectId = activeProject?.id;
  const crewCreatorId = activeProject?.creator_id;
  useEffect(() => {
    let alive = true;
    if (!crewProjectId) return;
    getProjectTeam(crewProjectId, crewCreatorId).then(
      (team) => { if (alive) setCrew({ projectId: crewProjectId, team }); },
      (e) => { console.error('Failed to load the crew:', e); if (alive) reportError('Could not load the crew list.'); },
    );
    return () => { alive = false; };
  }, [crewProjectId, crewCreatorId]);

  const onlineCrew = crewList.filter(m => onlineIds.has(m.id)).length;
  // What's open doesn't count as unread: it's being read.
  const unreadOf = (channelId: string) => (!dmTarget && activeChannel?.id === channelId ? 0 : unread.channels[channelId] ?? 0);
  const unreadFrom = (personId: string) => (dmTarget?.id === personId ? 0 : unread.people[personId] ?? 0);
  const unreadTotal = Object.keys(unread.channels).filter((id) => channels.some((c) => c.id === id)).reduce((n, id) => n + unreadOf(id), 0)
    + Object.keys(unread.people).reduce((n, id) => n + unreadFrom(id), 0);
  usePillStage(
    {
      module: 'lounge',
      title: activeChannel ? `#${activeChannel.name}` : 'Lounge',
      accent: '#10b981',
      fields: [
        { label: 'Online', value: `${onlineCrew}/${crewList.length}`, color: onlineCrew > 0 ? 'var(--ok)' : undefined },
        { label: 'Msgs', value: `${messages.length}` },
        ...(unreadTotal > 0 ? [{ label: 'Unread', value: `${unreadTotal}`, color: 'var(--ok)' }] : []),
      ],
      actions: [
        { id: 'lounge-search', label: 'Search messages', onClick: () => { setShowPinned(false); setShowSearch(true); } },
        ...(!dmTarget && activeChannel && activeChannel.type !== 'voice' ? [{ id: 'lounge-pinned', label: 'Pinned', onClick: () => { setShowSearch(false); setShowPinned(true); } }] : []),
      ],
    }
  );

  const textChannelId = activeChannel && activeChannel.type !== 'voice' ? activeChannel.id : null;
  const knownPerms = textChannelId && perms?.id === textChannelId ? perms : null;
  const canPost = textChannelId ? knownPerms?.post ?? true : false;
  const canManageActive = knownPerms?.manage ?? false;
  useEffect(() => {
    if (!textChannelId) return;
    let active = true;
    Promise.all([canPostChannel(textChannelId), canManageChannel(textChannelId)]).then(([post, manage]) => {
      if (active) setPerms({ id: textChannelId, post, manage });
    });
    return () => { active = false; };
  }, [textChannelId]);

  // Who's signed in, once. (awaitOSUser returns a fresh object each call, so
  // this can't live in an effect that depends on currentUser — it would loop.)
  useEffect(() => {
    let mounted = true;
    (async () => {
      const user = await awaitOSUser();
      if (user && mounted) {
        setCurrentUser(user);
        const mine = await getProfile(user.id).catch((e) => {
          console.error('Failed to load profile:', e);
          reportError('Could not load your profile.');
          return null;
        });
        if (mounted) setMyProfile(mine);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const currentUserId: string | undefined = currentUser?.id;
  useEffect(() => {
    let mounted = true;
    const loadMessages = async () => {
      try {
        const data = dmTarget && currentUserId
          ? await getDMThread(currentUserId, dmTarget.id)
          : activeChannel
          ? await getChannelMessagesByUuid(activeChannel.id)
          : [];
        if (!mounted) return;
        const formatted = data.map((m: any) => ({
          id: m.id,
          user: m.profiles?.username || 'Deleted account',
          text: m.content,
          timestamp: new Date(m.created_at),
          sender_id: m.sender_id,
          reactions: m.reactions || {},
          avatar_url: m.profiles?.avatar_url,
          edited: !!m.edited_at,
          pinned: !!m.pinned,
          hidden: !!m.hidden_at,
        }));
        setMessages(formatted);
        if (!dmTarget) {
          const counts = await getReplyCounts(formatted.map(f => f.id));
          if (mounted) setReplyCounts(counts);
        }
      } catch (e) {
        console.error(e);
      }
    };
    if (dmTarget && !currentUserId) return () => { mounted = false; };
    loadMessages();

    let channel: any;
    if (dmTarget && currentUserId) {
      const pairKey = [currentUserId, dmTarget.id].sort().join(':');
      channel = supabase.channel(`dm:${pairKey}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: any) => {
          const m = payload.new;
          if ((m.sender_id === currentUserId && m.receiver_id === dmTarget.id) ||
              (m.sender_id === dmTarget.id && m.receiver_id === currentUserId)) loadMessages();
        })
        .subscribe();
    } else if (activeChannel) {
      channel = subscribeToChannelUuid(activeChannel.id, () => loadMessages());
    }

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [activeChannel, dmTarget, currentUserId]);

  useEffect(() => {
    // Jumping to a message (search, pinned) scrolls to it; otherwise follow the newest.
    if (focusId) {
      const el = document.getElementById(`msg-${focusId}`);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Only once the message is in the DOM can it be scrolled to and lit.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- follows the rendered DOM
      setHighlightId(focusId);
      setFocusId(null);
      const t = setTimeout(() => setHighlightId(null), 2600);
      return () => clearTimeout(t);
    }
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, focusId]);

  // Unread counts: loaded once signed in, and again whenever a message arrives
  // anywhere this person can read (Realtime applies the same policy).
  useEffect(() => {
    if (!currentUserId) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const reload = () => { getLoungeUnread().then((u) => { if (alive) setUnread(u); }); };
    reload();
    const ch = supabase.channel(`lounge-unread:${currentUserId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => { clearTimeout(timer); timer = setTimeout(reload, 700); })
      .subscribe();
    return () => { alive = false; clearTimeout(timer); supabase.removeChannel(ch); };
  }, [currentUserId]);

  // Reading what's open: the channel or conversation is marked read when it
  // opens and as messages arrive in it.
  useEffect(() => {
    if (!currentUserId) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    const partner = dmTarget?.id ?? null;
    const channelId = !partner && activeChannel && activeChannel.type !== 'voice' ? activeChannel.id : null;
    if (!partner && !channelId) return;
    const t = setTimeout(() => {
      void markLoungeRead(partner ? { partner } : { channel: channelId! }).then(() => setUnread((u) => partner
        ? { ...u, people: { ...u.people, [partner]: 0 } }
        : { ...u, channels: { ...u.channels, [channelId!]: 0 } }));
    }, 400);
    return () => clearTimeout(t);
  }, [currentUserId, activeChannel, dmTarget, messages.length]);

  useEffect(() => {
    if (!activeChannel) return;
    const uname = myProfile?.username || 'Someone';
    const ch = supabase.channel(`typing:${activeChannel.id}`, { config: { broadcast: { self: false } } });
    ch.on('broadcast', { event: 'typing' }, ({ payload }: any) => {
      const name = payload?.username;
      if (!name) return;
      setTypingUsers(prev => prev.includes(name) ? prev : [...prev, name]);
      clearTimeout(typingTimers.current[name]);
      typingTimers.current[name] = setTimeout(() => setTypingUsers(prev => prev.filter(n => n !== name)), 3200);
    }).subscribe();
    typingChannelRef.current = { ch, uname };
    return () => { supabase.removeChannel(ch); setTypingUsers([]); };
  }, [activeChannel, myProfile?.username]);

  useEffect(() => {
    if (!threadParent) return;
    let mounted = true;
    const load = async () => {
      const data = await getThreadReplies(threadParent.id);
      if (!mounted) return;
      setThread({ parentId: threadParent.id, replies: data.map((m: any) => ({ id: m.id, user: m.profiles?.username || 'Deleted account', text: m.content, timestamp: new Date(m.created_at), sender_id: m.sender_id, reactions: m.reactions || {} })) });
    };
    load();
    const ch = supabase.channel(`thread:${threadParent.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `parent_message_id=eq.${threadParent.id}` }, () => load())
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, [threadParent]);

  const threadReplies = thread && thread.parentId === threadParent?.id ? thread.replies : NO_REPLIES;

  const isGuide = !dmTarget && activeChannel?.type === 'guide';

  const broadcastTyping = () => {
    const now = Date.now();
    if (now - lastBroadcast.current < 1200) return;
    lastBroadcast.current = now;
    typingChannelRef.current?.ch?.send({ type: 'broadcast', event: 'typing', payload: { username: typingChannelRef.current.uname } });
  };

  const handleDeleteGuideSection = async (m: Message) => {
    if (!(await confirm({ title: 'Remove this section?', message: `“${m.text.split('\n')[0].slice(0, 80)}” will be removed from the guide.`, confirmLabel: 'Remove', danger: true }))) return;
    try {
      await deleteMessage(m.id);
      setMessages((prev) => prev.filter((x) => x.id !== m.id));
    } catch (e) { toast(e instanceof Error ? e.message : 'Could not remove it', 'error'); }
  };

  const handleReact = async (messageId: string, emoji: string) => {
    if (!currentUser) return;
    setMessages(prev => prev.map(m => {
      if (m.id !== messageId) return m;
      const r: Record<string, string[]> = { ...(m.reactions || {}) };
      const users = r[emoji] || [];
      if (users.includes(currentUser.id)) { const n = users.filter(u => u !== currentUser.id); if (n.length) r[emoji] = n; else delete r[emoji]; }
      else r[emoji] = [...users, currentUser.id];
      return { ...m, reactions: r };
    }));
    try { await toggleReaction(messageId, emoji, currentUser.id); } catch (e) { console.error(e); }
  };

  const handleEdit = async (m: Message, text: string) => {
    try {
      await editMessage(m.id, text);
      setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, text, edited: true } : x)));
      return true;
    } catch (e) { toast(e instanceof Error ? e.message : 'Could not edit it', 'error'); return false; }
  };

  const handlePin = async (m: Message) => {
    try {
      await pinMessage(m.id, !m.pinned);
      setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, pinned: !m.pinned } : x)));
      toast(m.pinned ? 'Unpinned' : 'Pinned — find it under Pinned', 'success');
    } catch (e) { toast(e instanceof Error ? e.message : 'Could not pin it', 'error'); }
  };

  const unpinById = async (id: string) => {
    try {
      await pinMessage(id, false);
      setMessages((prev) => prev.map((x) => (x.id === id ? { ...x, pinned: false } : x)));
    } catch (e) { toast(e instanceof Error ? e.message : 'Could not unpin it', 'error'); }
  };

  // Opens where a search result lives — its channel (switching project if it's
  // another production's), or the direct conversation — and scrolls to it.
  const jumpTo = (hit: LoungeHit) => {
    setShowSearch(false);
    setPane('chat');
    setFocusId(hit.parent_message_id ?? hit.id);
    if (hit.channel_uuid) {
      const here = channels.find((c) => c.id === hit.channel_uuid);
      if (here) { setDmTarget(null); setActiveChannel(here); return; }
      const project = hit.project_id ? projects.find((p) => p.id === hit.project_id) : null;
      if (project) { pendingChannel.current = hit.channel_uuid; setDmTarget(null); setActiveProject(project); return; }
      toast('That channel isn’t in your list any more', 'info');
      return;
    }
    const partner = hit.sender_id === currentUser?.id ? hit.receiver_id : hit.sender_id;
    if (!partner) return;
    const known = crewList.find((c) => c.id === partner);
    setDmTarget({ id: partner, name: known?.name ?? hit.sender ?? 'someone' });
  };

  const handleThreadSend = async () => {
    const text = threadInput.trim();
    if (!text || !currentUser || !threadParent) return;
    setThreadInput('');
    try {
      if (!activeChannel) return;
      await sendChannelMessage(currentUser.id, text, activeChannel.id, threadParent.id);
      setReplyCounts(prev => ({ ...prev, [threadParent.id]: (prev[threadParent.id] || 0) + 1 }));

      if (threadParent.sender_id && threadParent.sender_id !== currentUser.id) {
        notify(threadParent.sender_id, {
          type: 'reply',
          title: `${myProfile?.username || 'Someone'} replied in a thread`,
          body: text.length > 90 ? text.slice(0, 90) + '…' : text,
          link: `/lounge?channel=${activeChannel.id}`,
        }, currentUser.id);
      }
    } catch (e: any) { console.error(e); setThreadInput(text); toast(e?.message || 'Reply failed to send', 'error'); }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !currentUser) return;
    setInput('');
    try {
      const from = myProfile?.username || 'Someone';
      if (dmTarget) {
        await sendDirectMessage(currentUser.id, dmTarget.id, text);
        notify(dmTarget.id, {
          type: 'reply',
          title: `Direct message from ${from}`,
          body: text.length > 90 ? text.slice(0, 90) + '…' : text,
          link: `/lounge?dm=${currentUser.id}`,
        }, currentUser.id);
        return;
      }
      if (!activeChannel) return;
      await sendChannelMessage(currentUser.id, text, activeChannel.id);

      const mentioned = new Set((text.match(/@([a-zA-Z0-9_]+)/g) || []).map(m => m.slice(1).toLowerCase()));
      if (mentioned.size > 0) {
        crewList
          .filter(m => m.id !== currentUser.id && mentioned.has(String(m.name).toLowerCase()))
          .forEach(m => notify(m.id, {
            type: 'mention',
            title: `${from} mentioned you in #${activeChannel.name}`,
            body: text.length > 90 ? text.slice(0, 90) + '…' : text,
            link: `/lounge?channel=${activeChannel.id}`,
          }, currentUser.id));
      }
    } catch (e: any) {
      console.error(e);
      setInput(text);
      toast(e?.message || 'Message failed to send', 'error');
    }
  };

  return { isLoading, toast, activeProject, projects, setActiveProject, channels, activeChannel, setActiveChannel, setPerms, showNewChannel, setShowNewChannel, isAdmin, showManage, setShowManage, dmTarget, setDmTarget, replyCounts, threadParent, setThreadParent, threadInput, setThreadInput, messages, input, setInput, currentUser, myProfile, crewList, showEmoji, setShowEmoji, typingUsers, onlineIds, bottomRef, showSearch, setShowSearch, showPinned, setShowPinned, setFocusId, highlightId, setPane, pane, openChannel, openDM, reloadChannels, ownsActive, suggested, addPreset, onlineCrew, unreadOf, unreadFrom, canPost, canManageActive, threadReplies, isGuide, broadcastTyping, handleDeleteGuideSection, handleReact, handleEdit, handlePin, unpinById, jumpTo, handleThreadSend, handleSend };
}

export type Lounge = ReturnType<typeof useLounge>;
