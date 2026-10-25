'use client';

import { ViewAsBanner } from '@/components/projects/ViewAs';
import { AnimatePresence } from 'framer-motion';
import GrainOverlay from '@/components/ui/GrainOverlay';
import { LoungeSearch, PinnedPanel } from '@/components/lounge/LoungePanels';
import { createChannel, canManageChannel } from '@/lib/supabase/channels';
import { VoiceRoom } from '@/components/lounge/VoiceRoom';
import { NewChannelModal, ManageChannelModal } from '@/components/lounge/ChannelModals';
import { useLounge } from '@/components/lounge/useLounge';
import { LoungeTopBar } from '@/components/lounge/LoungeTopBar';
import { ChannelRail } from '@/components/lounge/ChannelRail';
import { ChatHeader } from '@/components/lounge/ChatHeader';
import { MessagePane } from '@/components/lounge/MessagePane';
import { Composer } from '@/components/lounge/Composer';
import { CrewList } from '@/components/lounge/CrewList';
import { ThreadPanel } from '@/components/lounge/ThreadPanel';

export default function LoungePage() {
  const l = useLounge();
  const { isLoading, toast, activeProject, activeChannel, setActiveChannel, setPerms, showNewChannel, setShowNewChannel, showManage, setShowManage, dmTarget, threadParent, messages, currentUser, myProfile, showSearch, setShowSearch, showPinned, setShowPinned, setFocusId, pane, reloadChannels, canPost, canManageActive, isGuide, unpinById, jumpTo } = l;
  if (isLoading) return null;

  // Exactly one screen tall: each pane scrolls on its own, so a long channel
  // list never pushes the composer down under the island.
  return (
    <div className="mc-lounge" style={{ background: 'var(--bg)', color: 'var(--fg)', height: '100dvh', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
      <h1 className="sr-only">Lounge{activeProject ? ` — ${activeProject.title}` : ''}</h1>
      <GrainOverlay />
      {activeProject && <ViewAsBanner projectId={activeProject.id} />}

      <LoungeTopBar l={l} />

      <div className="mc-lounge-body" data-pane={pane} style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        <ChannelRail l={l} />

        {/* The island floats over this column alone, so only it makes room; the lists either side run to the foot of the screen. */}
        <div className="mc-lounge-chat" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingBottom: 'var(--taskbar-height, 0px)' }}>
          <ChatHeader l={l} />

          {activeChannel?.type === 'voice' && !dmTarget ? (
            <VoiceRoom channel={activeChannel} me={currentUser ? { id: currentUser.id, name: myProfile?.username || 'You', avatar: myProfile?.avatar_url } : null} />
          ) : (
          <>
          <MessagePane l={l} />

          {(!isGuide || canPost) && <Composer l={l} />}
          </>
          )}
        </div>

        <CrewList l={l} />
      </div>

      <AnimatePresence>
        {threadParent && <ThreadPanel l={l} />}
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
