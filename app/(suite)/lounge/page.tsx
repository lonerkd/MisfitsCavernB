'use client';

import { ViewAsBanner } from '@/components/projects/ViewAs';
import { useViewAs, effectiveOwner } from '@/lib/os/viewAs';
import { useState, useRef, useEffect, useEffectEvent, useCallback, useMemo } from 'react';
import { Send, Users, Smile, Hash, Lock, Settings as SettingsIcon, X, Volume2, BookOpen, Globe, Shield, Crown, ArrowUp, ArrowDown, UserCheck, Pin, Search, ChevronLeft } from 'lucide-react';
import { audienceLabel, groupChannels } from '@/lib/lounge/audience';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import GrainOverlay from '@/components/ui/GrainOverlay';
import { supabase } from '@/lib/supabase/client';
import { getProjectTeam } from '@/lib/supabase/crew-management';
import { getDMThread, sendDirectMessage, toggleReaction, getThreadReplies, getReplyCounts, sendChannelMessage, getChannelMessagesByUuid, subscribeToChannelUuid, deleteMessage, editMessage, pinMessage, markLoungeRead, getLoungeUnread, type LoungeHit, type LoungeUnread } from '@/lib/supabase/messages';
import { LoungeSearch, PinnedPanel } from '@/components/lounge/LoungePanels';
import { getMyAccount, getProfile } from '@/lib/supabase/profiles';
import { listChannels, createChannel, canPostChannel, canManageChannel, type Channel } from '@/lib/supabase/channels';
import { useProject } from '@/lib/os';
import { usePillStage } from '@/lib/os/PillContext';
import { useOSGate } from '@/lib/os';
import { notify } from '@/lib/supabase/notifications';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/Confirm';
import Avatar from '@/components/ui/Avatar';
import { useOnlinePresence } from '@/lib/hooks/usePresence';
import { awaitOSUser } from '@/lib/os';
import { useProjectBrief, loadChannelPresets, suggestChannels, type ChannelPreset } from '@/lib/brief';
import { mapStatusToPhase } from '@/lib/os/phases';
import { useSearchParam } from '@/lib/hooks/useSearchParam';
import type { Message } from '@/components/lounge/types';
import { ProductionFeed } from '@/components/lounge/ProductionFeed';
import { MessageBubble, GuideSections } from '@/components/lounge/MessageParts';
import { VoiceRoom } from '@/components/lounge/VoiceRoom';
import { NewChannelModal, ManageChannelModal } from '@/components/lounge/ChannelModals';

const NO_CREW: any[] = [];
const NO_REPLIES: Message[] = [];

export default function LoungePage() {
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
        const mine = await getProfile(user.id).catch(() => null);
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

  if (isLoading) return null;
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

  // Exactly one screen tall: each pane scrolls on its own, so a long channel
  // list never pushes the composer down under the island.
  return (
    <div className="mc-lounge" style={{ background: 'var(--bg)', color: 'var(--fg)', height: '100dvh', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
      <h1 className="sr-only">Lounge{activeProject ? ` — ${activeProject.title}` : ''}</h1>
      <GrainOverlay />
      {activeProject && <ViewAsBanner projectId={activeProject.id} />}

      <nav className="mc-lounge-top" style={{
        position: 'sticky',
        top: 0,
        padding: '0 clamp(16px, 4vw, 28px)',
        height: 62,
        gap: 12,
        display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
        zIndex: 100,
        background: 'var(--surface)',
        backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(var(--ink-rgb), 0.04)',
        boxShadow: '0 1px 0 rgba(16,185,129,0.08) inset',
        flexShrink: 0,
      }}>
        {/* The picker takes what room is left and cuts a long name short — the header never runs off a phone screen. */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(var(--ink-rgb), 0.03)', padding: '6px 14px', borderRadius: 20, border: '1px solid rgba(var(--ink-rgb), 0.06)', minWidth: 0, maxWidth: 'min(320px, 100%)' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: activeProject?.accent_color || 'var(--accent)', flexShrink: 0 }} />
            <select
              aria-label="Active project"
              value={activeProject?.id || ''}
              onChange={(e) => {
                const p = projects.find(p => p.id === e.target.value);
                if (p) setActiveProject(p);
              }}
              style={{ background: 'transparent', border: 'none', color: 'var(--fg-strong)', fontSize: 11, fontWeight: 600, outline: 'none', cursor: 'pointer', minWidth: 0, width: '100%', textOverflow: 'ellipsis' }}
            >
              {projects.map(p => <option key={p.id} value={p.id} style={{ background: 'var(--bg-3)' }}>{p.title}</option>)}
            </select>
          </div>

          <div className="mc-lounge-online" style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 14px',
            background: 'rgba(var(--ink-rgb), 0.03)',
            border: '1px solid rgba(var(--ink-rgb), 0.06)',
            borderRadius: 'var(--radius-full)',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00cc66', boxShadow: '0 0 8px rgba(0,204,102,0.8)' }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)', color: 'var(--fg-muted)' }}>
              {onlineCrew} of {crewList.length} online
            </span>
          </div>
        </div>
      </nav>

      <div className="mc-lounge-body" data-pane={pane} style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        <div className="mc-lounge-channels" style={{
          width: 220,
          background: 'var(--bg-2)',
          borderRight: '1px solid rgba(var(--ink-rgb), 0.04)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0
        }}>
          <div style={{ padding: '16px 12px', overflowY: 'auto', flex: 1 }}>
             {(() => {
               const groups = groupChannels(channels, activeProject?.id ?? null);
               const isOwner = ownsActive;
               const renderGroup = (label: string, list: Channel[], showAdd: boolean, scope: 'project' | 'community') => (
                 <div style={{ marginBottom: 18 }}>
                   <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 6px', marginBottom: 8 }}>
                     <span style={{ fontSize: 'max(9px, var(--mc-min-font, 0px))', fontFamily: 'var(--mono)', color: 'var(--fg-subtle)', textTransform: 'var(--caps)', letterSpacing: 'var(--caps-track)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
                     {showAdd && <button aria-label={scope === 'community' ? 'New community channel' : 'New channel'} title="New channel" onClick={() => setShowNewChannel(scope)} style={{ background: 'none', border: 'none', color: 'var(--fg-subtle)', cursor: 'pointer', fontSize: 15, lineHeight: 1, padding: '0 6px', minWidth: 32, minHeight: 32 }}>+</button>}
                   </div>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                     {list.length === 0 && showAdd && <div style={{ fontSize: 'max(9.5px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)', fontFamily: 'var(--mono)', padding: '2px 6px' }}>No channels yet</div>}
                     {list.map(ch => {
                       const isActive = activeChannel?.id === ch.id && !dmTarget;
                       const AUD_ICON: Record<string, typeof Hash> = { public: Globe, admins: Shield, owners: Crown, above: ArrowUp, below: ArrowDown, guests: UserCheck };
                       const Icon = ch.type === 'guide' ? BookOpen : ch.type === 'voice' ? Volume2 : ch.is_private ? Lock : AUD_ICON[ch.audience] ?? Hash;
                       const who = ch.audience === 'users' || ch.audience === 'team' ? undefined : audienceLabel(ch.audience);
                       const n = unreadOf(ch.id);
                       return (
                         <button key={ch.id} title={[who, ch.is_private ? 'Invite-only' : null, ch.topic].filter(Boolean).join(' · ') || undefined} onClick={() => openChannel(ch)}
                           aria-label={n > 0 ? `${ch.name}, ${n >= 100 ? '99+' : n} unread` : undefined}
                           style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 4, background: isActive ? 'rgba(232, 67, 26,0.1)' : 'transparent', border: 'none', color: isActive || n > 0 ? 'var(--fg-strong)' : 'var(--fg-dim)', fontWeight: n > 0 ? 700 : 400, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'var(--mono)', fontSize: 11, width: '100%', textAlign: 'left' }}>
                           <Icon size={12} color={isActive ? 'var(--accent)' : n > 0 ? 'var(--ok)' : 'var(--fg-dim)'} style={{ flexShrink: 0 }} />
                           <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{ch.name}</span>
                           {n > 0 && <span aria-hidden style={{ marginLeft: 'auto', minWidth: 16, padding: '0 5px', borderRadius: 9999, background: 'var(--lounge-color)', color: '#04110b', fontSize: 'max(9px, var(--mc-min-font, 0px))', fontWeight: 700, lineHeight: '15px', textAlign: 'center' }}>{n >= 100 ? '99+' : n}</span>}
                         </button>
                       );
                     })}
                   </div>
                 </div>
               );
               return (
                 <>
                   {groups.guides.length > 0 && renderGroup('Guides', groups.guides, false, 'community')}
                   {activeProject && renderGroup(activeProject.title, groups.project, isOwner, 'project')}
                   {suggested.length > 0 && (
                     <div style={{ margin: '-8px 0 18px' }} aria-label="Suggested channels" role="group">
                       <div style={{ fontSize: 'max(8.5px, var(--mc-min-font, 0px))', fontFamily: 'var(--mono)', color: 'var(--fg-dim)', textTransform: 'var(--caps)', letterSpacing: 'var(--caps-track)', padding: '0 6px', marginBottom: 6 }}>Suggested for this phase</div>
                       {suggested.map((p) => (
                         <button key={p.key} type="button" onClick={() => void addPreset(p)} title={`${p.why} ${p.topic}`.trim()}
                           aria-label={`Open #${p.name} for ${audienceLabel(p.audience)}`}
                           style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '5px 8px', borderRadius: 4, background: 'transparent', border: '1px dashed rgba(var(--ink-rgb), 0.1)', color: 'var(--fg-muted)', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 11, textAlign: 'left', marginBottom: 4 }}>
                           <span aria-hidden style={{ color: 'var(--accent)' }}>+</span>
                           <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.type === 'voice' ? '🔊 ' : '#'}{p.name}</span>
                           <span style={{ fontSize: 'max(8.5px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)' }}>{audienceLabel(p.audience)}</span>
                         </button>
                       ))}
                     </div>
                   )}
                   {renderGroup('Community', groups.community, isAdmin, 'community')}
                   {groups.open.length > 0 && renderGroup('Other productions', groups.open, false, 'project')}
                 </>
               );
             })()}
          </div>

          <div style={{ marginTop: 'auto', padding: 20, borderTop: '1px solid rgba(var(--ink-rgb), 0.04)' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar src={myProfile?.avatar_url} name={myProfile?.username || currentUser?.email} size={28} radius={6} />
                <div style={{ flex: 1, minWidth: 0 }}>
                   <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-strong)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{myProfile?.username || 'You'}</div>
                   <div style={{ fontSize: 'max(9px, var(--mc-min-font, 0px))', color: myProfile?.status === 'BUSY' ? 'var(--warn)' : 'var(--ok)' }}>● {myProfile?.status === 'BUSY' ? 'Busy' : 'Available'}</div>
                </div>
                <Link href="/settings" title="Settings"><SettingsIcon size={14} color="var(--fg-dim)" style={{ cursor: 'pointer' }} /></Link>
             </div>
          </div>
        </div>

        {/* The island floats over this column alone, so only it makes room; the lists either side run to the foot of the screen. */}
        <div className="mc-lounge-chat" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingBottom: 'var(--taskbar-height, 0px)' }}>
          <div className="mc-lounge-chathead" style={{ padding: '12px 32px', borderBottom: '1px solid rgba(var(--ink-rgb), 0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(var(--ink-rgb), 0.01)' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
               <button type="button" className="mc-phone-only mc-lounge-back" onClick={() => setPane('list')} aria-label="Back to channels and people"><ChevronLeft size={20} aria-hidden /></button>
               {dmTarget ? (
                 <>
                   <span style={{ fontSize: 'max(8px, var(--mc-min-font, 0px))', color: 'var(--ok)', fontFamily: 'var(--mono)', letterSpacing: 'var(--caps-track)', background: 'rgba(16,185,129,0.12)', padding: '2px 7px', borderRadius: 9999 }}>DIRECT</span>
                   <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg-strong)' }}>@{dmTarget.name}</span>
                   {onlineIds.has(dmTarget.id) && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00cc66', boxShadow: '0 0 8px rgba(0,204,102,0.8)' }} />}
                 </>
               ) : activeChannel ? (
                 <>
                   {activeChannel.is_private && <Lock size={12} color="var(--fg-dim)" />}
                   <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg-strong)' }}>{activeChannel.type === 'voice' ? '🔊 ' : activeChannel.type === 'guide' ? '' : '#'}{activeChannel.name}</span>
                   {activeChannel.type === 'guide' && <span style={{ fontSize: 'max(7.5px, var(--mc-min-font, 0px))', color: 'var(--info)', fontFamily: 'var(--mono)', letterSpacing: 'var(--caps-track)', background: 'rgba(0,153,255,0.12)', padding: '2px 6px', borderRadius: 9999 }}>GUIDE</span>}
                   {activeChannel.post_policy === 'managers' && activeChannel.type !== 'guide' && <span style={{ fontSize: 'max(7.5px, var(--mc-min-font, 0px))', color: 'var(--warn)', fontFamily: 'var(--mono)', letterSpacing: 'var(--caps-track)', background: 'rgba(245,158,11,0.12)', padding: '2px 6px', borderRadius: 9999 }}>ANNOUNCE</span>}
                 </>
               ) : (
                 <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg-dim)' }}>No channels</span>
               )}
               <div style={{ width: 1, height: 14, background: 'rgba(var(--ink-rgb), 0.1)', margin: '0 4px' }} />
               <span style={{ fontSize: 11, color: 'var(--fg-muted)', fontFamily: 'var(--mono)' }}>{activeChannel?.topic || `${messages.length} message${messages.length === 1 ? '' : 's'}`}</span>
             </div>
             <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', color: 'var(--fg-muted)' }}>
                {dmTarget ? (
                  <button className="mc-hide-phone" onClick={() => setDmTarget(null)} style={{ background: 'transparent', border: '1px solid rgba(var(--ink-rgb), 0.12)', color: 'var(--fg-muted)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 'max(8.5px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)' }}>← CHANNELS</button>
                ) : (
                  <><Users size={13} color="var(--fg-dim)" /> {crewList.length}</>
                )}
                <button type="button" onClick={() => { setShowPinned(false); setShowSearch(true); }} aria-label="Search messages" title="Search"
                  style={{ background: 'transparent', border: '1px solid rgba(var(--ink-rgb), 0.12)', borderRadius: 8, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: 'var(--fg-muted)', fontFamily: 'var(--mono)', fontSize: 'max(8.5px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)' }}>
                  <Search size={12} /> <span className="mc-hide-phone">SEARCH</span>
                </button>
                {!dmTarget && activeChannel && activeChannel.type !== 'voice' && (
                  <button type="button" onClick={() => { setShowSearch(false); setShowPinned(true); }} aria-label={`Pinned messages in #${activeChannel.name}`} title="Pinned"
                    style={{ background: 'transparent', border: '1px solid rgba(var(--ink-rgb), 0.12)', borderRadius: 8, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: 'var(--fg-muted)', fontFamily: 'var(--mono)', fontSize: 'max(8.5px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)' }}>
                    <Pin size={12} /> <span className="mc-hide-phone">PINNED</span>{messages.some((m) => m.pinned) ? ` · ${messages.filter((m) => m.pinned).length}` : ''}
                  </button>
                )}
                {!dmTarget && activeChannel && canManageActive && (
                  <button onClick={() => setShowManage(true)} title="Manage channel" style={{ background: 'transparent', border: '1px solid rgba(var(--ink-rgb), 0.12)', borderRadius: 8, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: 'var(--fg-muted)', fontFamily: 'var(--mono)', fontSize: 'max(8.5px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)' }}>
                    <SettingsIcon size={12} /> <span className="mc-hide-phone">MANAGE</span>
                  </button>
                )}
             </div>
          </div>

          {activeChannel?.type === 'voice' && !dmTarget ? (
            <VoiceRoom channel={activeChannel} me={currentUser ? { id: currentUser.id, name: myProfile?.username || 'You', avatar: myProfile?.avatar_url } : null} />
          ) : (
          <>
          <div className="mc-lounge-thread" style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
            <div style={{ maxWidth: 'var(--w-reading)', margin: '0 auto' }}>
              {isGuide ? (
                messages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--fg-dim)', marginTop: 100, fontFamily: 'var(--mono)', fontSize: 11 }}>
                    {canPost ? `WRITE THE FIRST SECTION OF ${activeChannel!.name.toUpperCase()} BELOW` : `${activeChannel!.name.toUpperCase()} IS BEING WRITTEN — CHECK BACK SOON`}
                  </div>
                ) : (
                  <GuideSections messages={messages} canEdit={canPost} onDelete={handleDeleteGuideSection} />
                )
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--fg-muted)', marginTop: 100, fontFamily: 'var(--mono)', fontSize: 11, lineHeight: 1.7 }}>
                  {dmTarget
                    ? `Say hello to @${dmTarget.name} — messages here are just between you two.`
                    : activeChannel
                      ? `Nothing in #${activeChannel.name} yet. ${canPost ? 'Start it — write below.' : 'Only whoever runs it posts here.'}`
                      : 'Choose a channel on the left.'}
                  {!dmTarget && !activeChannel && (() => {
                    const start = channels.find((c) => !c.project_id && c.name === 'start-here');
                    return start ? (
                      <div style={{ marginTop: 14 }}>
                        <button type="button" onClick={() => openChannel(start)}
                          style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: 'var(--on-accent)', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 'var(--caps-track)', cursor: 'pointer', fontWeight: 600 }}>
                          Open #start-here
                        </button>
                      </div>
                    ) : null;
                  })()}
                </div>
              ) : messages.map(msg => (
                <MessageBubble key={msg.id} msg={msg} currentUserId={currentUser?.id} onReact={handleReact} onOpenThread={dmTarget ? undefined : setThreadParent} replyCount={replyCounts[msg.id] || 0}
                  canPin={dmTarget ? true : canManageActive} onPin={handlePin} onEdit={dmTarget || canPost ? handleEdit : undefined} highlight={highlightId === msg.id} />
              ))}
              <div ref={bottomRef} />
            </div>
          </div>

          {(!isGuide || canPost) && <div className="mc-lounge-composer" style={{
            padding: '16px 28px',
            borderTop: '1px solid rgba(var(--ink-rgb), 0.04)',
            background: 'var(--bg-2)',
            flexShrink: 0,
          }}>
            <div style={{ maxWidth: 'var(--w-reading)', margin: '0 auto', height: 14, marginBottom: 4 }}>
              {typingUsers.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', color: 'var(--ok)', letterSpacing: 'var(--caps-track)' }}>
                  <span style={{ display: 'inline-flex', gap: 2 }}>
                    {[0, 1, 2].map(i => (
                      <motion.span key={i} animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--lounge-color)', display: 'inline-block' }} />
                    ))}
                  </span>
                  {typingUsers.slice(0, 2).join(', ')}{typingUsers.length > 2 ? ` +${typingUsers.length - 2}` : ''} {typingUsers.length === 1 ? 'is' : 'are'} typing…
                </div>
              )}
            </div>
            <div style={{ maxWidth: 'var(--w-reading)', margin: '0 auto', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <div style={{ position: 'relative', alignSelf: 'center' }}>
                <button style={{ background: 'none', border: 'none', color: showEmoji ? 'var(--fg)' : 'var(--fg-muted)', padding: 10, cursor: 'pointer', transition: 'color 0.2s' }}
                  onClick={() => setShowEmoji(v => !v)} aria-label="emoji">
                  <Smile size={16} />
                </button>
                {showEmoji && (
                  <div style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: 8, background: 'var(--surface)', border: '1px solid rgba(var(--ink-rgb), 0.1)', borderRadius: 8, padding: 8, display: 'flex', gap: 4, flexWrap: 'wrap', width: 180, boxShadow: '0 12px 30px rgba(0,0,0,0.6)' }}>
                    {['😀','😂','🔥','❤️','👍','🎬','🎥','✨','💡','🎉','😮','🙏'].map(e => (
                      <button key={e} onClick={() => { setInput(prev => prev + e); setShowEmoji(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, padding: 2 }}>{e}</button>
                    ))}
                  </div>
                )}
              </div>

              <textarea
                value={input}
                disabled={!dmTarget && !canPost}
                onChange={e => { setInput(e.target.value); if (e.target.value.trim()) broadcastTyping(); }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder={dmTarget ? `Message @${dmTarget.name}...` : isGuide ? `Add a section to ${activeChannel?.name || 'the guide'} — the first line is its heading` : !canPost ? `You don't have permission to post in #${activeChannel?.name || ''}` : `Message #${activeChannel?.name || ''}...`}
                rows={1}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  background: 'rgba(var(--ink-rgb), 0.03)',
                  border: '1px solid rgba(var(--ink-rgb), 0.08)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--fg)',
                  fontFamily: 'var(--serif)',
                  fontSize: 14,
                  resize: 'none',
                  outline: 'none',
                  transition: 'border-color 0.3s',
                  lineHeight: 1.5,
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(232, 67, 26,0.35)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(var(--ink-rgb), 0.08)')}
              />

              <motion.button
                onClick={handleSend}
                whileHover={input.trim() ? { scale: 1.05 } : {}}
                whileTap={input.trim() ? { scale: 0.95 } : {}}
                style={{
                  padding: '11px 18px',
                  background: input.trim() ? 'var(--accent)' : 'rgba(var(--ink-rgb), 0.05)',
                  border: 'none',
                  color: input.trim() ? 'var(--bg)' : 'var(--fg-muted)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)',
                  textTransform: 'var(--caps)',
                  transition: 'background 0.3s, color 0.3s',
                  alignSelf: 'flex-end',
                }}
              >
                <Send size={12} /> {isGuide ? 'Add' : 'Send'}
              </motion.button>
            </div>
          </div>}
          </>
          )}
        </div>

        <div className="mc-lounge-crew" style={{
          width: 240,
          borderLeft: '1px solid rgba(var(--ink-rgb), 0.04)',
          background: 'var(--bg-2)',
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          flexShrink: 0,
          overflowY: 'auto',
        }}>
          {activeProject && <ProductionFeed projectId={activeProject.id} />}

          <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)', color: 'var(--fg-subtle)', marginBottom: 12 }}>
            Crew
          </div>

          {[...crewList].sort((a, b) => Number(onlineIds.has(b.id)) - Number(onlineIds.has(a.id))).map((member, i) => {
            const isOnline = onlineIds.has(member.id);
            const isSelf = member.id === currentUser?.id;
            return (
            <motion.div
              key={member.id || i}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i, 8) * 0.05 }}
              onClick={() => { if (!isSelf) openDM({ id: member.id, name: member.name }); }}
              title={isSelf ? 'This is you' : `Message ${member.name}`}
              style={{
                padding: '10px 12px',
                border: `1px solid ${dmTarget?.id === member.id ? 'rgba(16,185,129,0.4)' : 'rgba(var(--ink-rgb), 0.04)'}`,
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                cursor: isSelf ? 'default' : 'pointer',
                background: dmTarget?.id === member.id ? 'rgba(16,185,129,0.06)' : isOnline ? 'rgba(0,204,102,0.03)' : 'transparent',
              }}
            >
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <Avatar src={member.avatar} name={member.name} size={26} />
                <div style={{
                  position: 'absolute', bottom: -1, right: -1,
                  width: 8, height: 8, borderRadius: '50%',
                  border: '1.5px solid #090909',
                  background: isOnline ? '#00cc66' : '#444',
                  boxShadow: isOnline ? '0 0 6px rgba(0,204,102,0.8)' : 'none',
                }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, lineHeight: 1.3, color: isOnline ? 'var(--fg)' : 'var(--fg-muted)', fontWeight: 600 }}>
                    {member.name}
                  </div>
                  {unreadFrom(member.id) > 0 ? (
                    <div aria-label={`${unreadFrom(member.id)} unread from ${member.name}`} style={{ minWidth: 16, padding: '0 5px', borderRadius: 9999, background: 'var(--lounge-color)', color: '#04110b', fontSize: 'max(9px, var(--mc-min-font, 0px))', fontWeight: 700, lineHeight: '15px', textAlign: 'center', fontFamily: 'var(--mono)' }}>{unreadFrom(member.id)}</div>
                  ) : isOnline && (
                    <div style={{ fontSize: 'max(7px, var(--mc-min-font, 0px))', color: 'var(--ok)', letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)', fontFamily: 'var(--mono)' }}>Live</div>
                  )}
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)', color: 'var(--fg-subtle)', marginTop: 2 }}>
                  <span>{member.role}</span>
                </div>
              </div>
            </motion.div>
          ); })}
        </div>
      </div>

      <AnimatePresence>
        {threadParent && (
          <motion.div
            initial={{ x: 380 }} animate={{ x: 0 }} exit={{ x: 380 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(94vw, 380px)', background: 'var(--surface)', borderLeft: '1px solid rgba(var(--ink-rgb), 0.08)', backdropFilter: 'blur(24px)', zIndex: 200, display: 'flex', flexDirection: 'column', boxShadow: '-20px 0 60px rgba(0,0,0,0.6)' }}
          >
            <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(var(--ink-rgb), 0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)', color: 'var(--ok)' }}>Thread</span>
              <button onClick={() => setThreadParent(null)} aria-label="Close thread" style={{ background: 'transparent', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '18px' }}>
              <div style={{ paddingBottom: 14, marginBottom: 14, borderBottom: '1px solid rgba(var(--ink-rgb), 0.06)' }}>
                <div style={{ fontFamily: 'var(--display)', fontSize: 12, letterSpacing: '-0.02em', color: 'var(--accent)', marginBottom: 4 }}>{threadParent.user}</div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 14, lineHeight: 1.6, color: 'rgba(var(--fg-rgb), 0.85)' }}>{threadParent.text}</div>
              </div>
              {threadReplies.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--fg-dim)', marginTop: 40, fontFamily: 'var(--mono)', fontSize: 'max(9.5px, var(--mc-min-font, 0px))' }}>No replies yet — start the thread.</div>
              ) : threadReplies.map(r => (
                <div key={r.id} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: r.sender_id === currentUser?.id ? '#ff7a4d' : 'var(--ok)', fontWeight: 600 }}>{r.sender_id === currentUser?.id ? 'You' : r.user}</span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 'max(7.5px, var(--mc-min-font, 0px))', color: 'var(--fg-subtle)' }}>{r.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 14, lineHeight: 1.6, color: 'rgba(var(--fg-rgb), 0.82)' }}>{r.text}</div>
                </div>
              ))}
            </div>
            <div style={{ padding: 14, borderTop: '1px solid rgba(var(--ink-rgb), 0.06)', display: 'flex', gap: 8 }}>
              <input value={threadInput} onChange={e => setThreadInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleThreadSend(); } }}
                placeholder="Reply…" style={{ flex: 1, padding: '10px 12px', background: 'rgba(var(--ink-rgb), 0.03)', border: '1px solid rgba(var(--ink-rgb), 0.08)', borderRadius: 8, color: 'var(--fg)', fontFamily: 'var(--serif)', fontSize: 13, outline: 'none' }} />
              <button onClick={handleThreadSend} aria-label="Send message" style={{ padding: '10px 14px', background: threadInput.trim() ? 'var(--accent)' : 'rgba(var(--ink-rgb), 0.05)', border: 'none', color: threadInput.trim() ? 'var(--bg)' : 'var(--fg-muted)', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Send size={13} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSearch && (
          <LoungeSearch channel={!dmTarget && activeChannel && activeChannel.type !== 'voice' ? { id: activeChannel.id, name: activeChannel.name } : null}
            meId={currentUser?.id} onClose={() => setShowSearch(false)} onJump={jumpTo} />
        )}
        {showPinned && !dmTarget && activeChannel && (
          <PinnedPanel channel={{ id: activeChannel.id, name: activeChannel.name }} refreshKey={messages}
            canUnpin={canManageActive} onUnpin={(id) => void unpinById(id)} onClose={() => setShowPinned(false)}
            onJump={(id) => { setShowPinned(false); setFocusId(id); }} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNewChannel && (showNewChannel === 'community' || activeProject) && (
          <NewChannelModal
            projectTitle={showNewChannel === 'community' ? 'Community · everyone on The Cavern' : activeProject!.title}
            scope={showNewChannel}
            onClose={() => setShowNewChannel(false)}
            onCreate={async (vals) => {
              const { channel, error } = await createChannel({ project_id: showNewChannel === 'community' ? null : activeProject!.id, ...vals });
              if (error) { toast(error, 'error'); return; }
              toast(`Created #${channel?.name}`, 'success');
              setShowNewChannel(false);
              await reloadChannels();
              if (channel) setActiveChannel(channel);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showManage && activeChannel && (
          <ManageChannelModal
            channel={activeChannel}
            meId={currentUser?.id}
            onClose={() => setShowManage(false)}
            onChanged={async () => {
              await reloadChannels();
              if (activeChannel) { const id = activeChannel.id; canManageChannel(id).then((manage) => setPerms((p) => (p?.id === id ? { ...p, manage } : p))); }
            }}
          />
        )}
      </AnimatePresence>

      <style>{`
        textarea::placeholder { color: rgba(var(--fg-rgb), 0.18); }
      `}</style>
    </div>
  );
}
