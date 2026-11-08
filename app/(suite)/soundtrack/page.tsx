'use client';

import React, { useState, useEffect, useEffectEvent, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Disc, Search, Music, ShieldAlert, Play, Plus, Wand2 } from 'lucide-react';
import { useSpotify } from '@/lib/os/SpotifyContext';
import { redirectToSpotifyAuth } from '@/lib/spotify/auth';
import { searchSpotify, generateContextualSearchQuery } from '@/lib/spotify/search';
import { SpotifyPreview } from '@/components/audio/SpotifyPreview';
import { SoundDeck } from '@/components/audio/SoundDeck';
import { ListenWithoutPremium } from '@/components/audio/ListenWithoutPremium';
import { scriptMoods, type MoodGroup } from '@/lib/spotify/moods';
import { useProject, useOSGate } from '@/lib/os';
import { useCanShape } from '@/lib/brief';
import dynamic from 'next/dynamic';
import { addAudioRef, getLatestScript } from '@/lib/supabase/audio';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { awaitOSUser } from '@/lib/os';

// The Library is its own tab: loaded when it is opened, so the page's first load stays light.
const SoundLibrary = dynamic(() => import('@/components/audio/SoundLibrary').then((m) => m.SoundLibrary), {
  loading: () => <div className="animate-pulse h-16 w-full rounded-xl bg-[var(--sunken)]" />,
});

export default function SoundtrackPage() {
  const { isAuthenticated, playUri } = useSpotify();
  const { activeProject } = useProject();
  const { toast } = useToast();
  const { user } = useOSGate();
  const canTag = useCanShape(activeProject?.id, !!user?.id && activeProject?.creator_id === user.id);
  const reportError = useEffectEvent((message: string) => toast(message, 'error'));

  const [activeTab, setActiveTab] = useState<'search'|'moods'|'library'>('search');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Moods come from the project's script (lib/spotify/moods), scene by scene.
  const [moodsFor, setMoods] = useState<{ projectId: string; title: string | null; groups: MoodGroup[] } | null>(null);
  const moods = moodsFor && moodsFor.projectId === activeProject?.id
    ? { status: 'ready' as const, title: moodsFor.title, groups: moodsFor.groups }
    : { status: 'loading' as const, title: null, groups: [] as MoodGroup[] };
  useEffect(() => {
    if (activeTab !== 'moods' || !activeProject?.id) return;
    const projectId = activeProject.id;
    let on = true;
    getLatestScript(projectId).then(
      (script) => { if (on) setMoods({ projectId, title: script?.title ?? null, groups: script?.content ? scriptMoods(script.content) : [] }); },
      () => {
        if (!on) return;
        setMoods({ projectId, title: null, groups: [] });
        reportError('Could not read the script’s moods.');
      },
    );
    return () => { on = false; };
  }, [activeTab, activeProject?.id]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await searchSpotify(searchQuery, 'track');
      setSearchResults(results || []);
    } catch (err: any) {
      toast('Search failed: ' + err.message, 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const searchMood = async (mood: MoodGroup) => {
    setActiveTab('search');
    setSearchQuery(mood.query);
    setIsSearching(true);
    try {
      setSearchResults(await searchSpotify(mood.query, 'playlist'));
    } catch (err: any) {
      toast('Search failed: ' + err.message, 'error');
    } finally {
      setIsSearching(false);
    }
  };

  // The script's own mood fills the search: its words become the query and the tracks load, with nothing to press. Done once a
  // project is in view and Spotify is connected; "Refresh from the script" does it again, and typing a query is still yours.
  const [filledFor, setFilledFor] = useState<string | null>(null);
  const fillFromScript = useCallback(async (projectId: string, quiet: boolean) => {
    setIsSearching(true);
    try {
      const content = (await getLatestScript(projectId))?.content;
      if (!content || !content.trim()) { if (!quiet) toast('This project has no script content yet to read mood from', 'error'); return; }
      const query = await generateContextualSearchQuery(content);
      setSearchQuery(query);
      setSearchResults((await searchSpotify(query, 'track')) || []);
      setFilledFor(projectId);
    } catch (err: any) {
      if (!quiet) toast('Could not search from the script: ' + err.message, 'error');
    } finally {
      setIsSearching(false);
    }
  }, [toast]);
  useEffect(() => {
    if (activeTab !== 'search' || !isAuthenticated || !activeProject?.id || filledFor === activeProject.id) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads the script's mood once per project
    void fillFromScript(activeProject.id, true);
  }, [activeTab, isAuthenticated, activeProject?.id, filledFor, fillFromScript]);

  const saveToProject = async (item: any) => {
    if (!activeProject?.id) {
      toast('No active project selected', 'error');
      return;
    }
    try {
      const userData = { user: await awaitOSUser() };
      await addAudioRef({
        projectId: activeProject.id,
        userId: userData.user?.id ?? null,
        type: 'spotify',
        uri: item.uri,
        title: item.name,
        description: item.artists?.[0]?.name || (item.type === 'playlist' ? 'Spotify playlist' : 'Spotify'),
      });
      toast('Saved to the library', 'success');
    } catch (err: any) {
      toast('Failed to save to project: ' + err.message, 'error');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="mc-page p-12 flex flex-col items-center justify-center text-center">
        <Disc size={48} className="mb-6 opacity-20" />
        <h1 className="mc-title text-4xl mb-4">Sound</h1>
        <p className="mc-text mb-8 max-w-md text-[var(--fg-dim)]">Connect your Spotify account to unlock the global background player and cinematic mood library.</p>
        <Button variant="solid" onClick={async () => { const problem = await redirectToSpotifyAuth(); if (problem) toast(problem, 'error'); }} className="gap-2 px-8">
          <Disc size={16} /> Connect Spotify
        </Button>
      </div>
    );
  }

  return (
    <div className="mc-page p-12">
      <header className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="mc-title text-4xl tracking-wide">Sound</h1>
          <p className="mc-text text-[var(--fg-dim)] [text-transform:var(--caps)] tracking-[var(--caps-track)] text-xs mt-2">Find music, place it in scenes, and keep the project’s sound</p>
        </div>
      </header>

      <SoundDeck />
      <ListenWithoutPremium />

      <div className="flex gap-4 mb-8 border-b border-[rgba(var(--ink-rgb),0.06)] pb-2">
        {(['search', 'moods', 'library'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`mc-text [text-transform:var(--caps)] tracking-[var(--caps-track)] text-xs px-4 py-2 rounded-full transition-colors ${
              activeTab === tab ? 'bg-[rgba(var(--ink-rgb),0.1)] text-[var(--fg-strong)]' : 'text-[var(--fg-dim)] hover:text-[var(--fg-muted)]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'moods' && (
            <div className="space-y-6">
              {!activeProject?.id ? (
                <p className="mc-text text-[var(--fg-dim)]">Pick a project — its script’s moods appear here, scene by scene.</p>
              ) : moods.status !== 'ready' ? (
                <p className="mc-text text-[var(--fg-dim)]">Reading the script…</p>
              ) : !moods.groups.length ? (
                <p className="mc-text text-[var(--fg-dim)]">No scenes to read yet. Write a scene heading (INT. / EXT.) in ScriptOS and its mood shows up here — or search Spotify directly.</p>
              ) : (
                <>
                  <p className="mc-text text-sm text-[var(--fg-dim)]">
                    Read from <strong className="text-[var(--fg-muted)]">{moods.title ?? 'the script'}</strong>: each scene’s strongest mood from what happens in it. Pick one to find music for those scenes.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {moods.groups.map((g) => (
                      <button
                        key={g.mood}
                        type="button"
                        onClick={() => void searchMood(g)}
                        title={`Find “${g.query}” playlists`}
                        className="text-left p-5 rounded-2xl border border-[rgba(var(--ink-rgb),0.06)] bg-[var(--sunken)] hover:bg-[rgba(var(--ink-rgb),0.05)] transition-all group relative overflow-hidden"
                      >
                        <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity" style={{ background: `radial-gradient(circle at 15% 20%, ${g.color}, transparent 70%)` }} aria-hidden />
                        <div className="relative z-10 flex items-center gap-3 mb-3">
                          <span className="w-10 h-10 rounded-full bg-[rgba(var(--ink-rgb),0.05)] flex items-center justify-center" style={{ boxShadow: `0 0 18px ${g.color}55` }} aria-hidden><Music size={16} /></span>
                          <span className="mc-title text-lg">{g.mood}</span>
                          <span className="mc-text text-xs text-[var(--fg-dim)] ml-auto">{g.scenes.length} scene{g.scenes.length === 1 ? '' : 's'}</span>
                        </div>
                        <ul className="relative z-10 space-y-1">
                          {g.scenes.slice(0, 4).map((sc) => (
                            <li key={sc.number} className="mc-text text-xs text-[var(--fg-dim)] truncate">{sc.number}. {sc.heading}</li>
                          ))}
                          {g.scenes.length > 4 && <li className="mc-text text-xs text-[var(--fg-dim)]">+{g.scenes.length - 4} more</li>}
                        </ul>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'library' && (
            !activeProject?.id ? (
              <div className="p-12 rounded-2xl border border-dashed border-[rgba(var(--ink-rgb),0.1)] text-center">
                <ShieldAlert size={32} className="opacity-20 mb-4 mx-auto" />
                <h3 className="mc-title text-xl mb-2">No active project</h3>
                <p className="mc-text text-sm text-[var(--fg-dim)]">Pick a project to see its sound library.</p>
              </div>
            ) : (
              <SoundLibrary projectId={activeProject.id} projectTitle={activeProject.title} userId={user?.id ?? null} canTag={canTag} />
            )
          )}

          {activeTab === 'search' && (
            <div className="max-w-4xl">
              <form className="flex gap-4 items-end mb-8" onSubmit={handleSearch}>
                <div className="flex-1">
                  <Input
                    label="Search Spotify for cinematic tracks..."
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button type="submit" variant="solid" className="h-[52px] px-8" isLoading={isSearching && searchQuery.length > 0}>
                  <Search size={16} className="mr-2" /> Search
                </Button>
                {activeProject?.id && (
                  <Button type="button" variant="outline" className="h-[52px] px-6 border-accent text-accent hover:bg-accent/10" onClick={() => void fillFromScript(activeProject.id, false)}>
                    <Wand2 size={16} className="mr-2" /> Refresh from the script
                  </Button>
                )}
              </form>
              {filledFor && filledFor === activeProject?.id && <p className="mc-text text-xs text-[var(--fg-dim)] -mt-4 mb-6">Filled from {activeProject.title}’s script. Change it to search for anything.</p>}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {searchResults.map((item: any) => (
                  <SpotifyPreview key={item.id} kind={item.type === 'playlist' ? 'playlist' : item.type === 'album' ? 'album' : 'track'} id={item.id} label={item.name}>{(previewButton, previewFrame) => (
                  <div className="p-4 rounded-xl border border-[rgba(var(--ink-rgb),0.06)] bg-[var(--sunken)] group hover:bg-[rgba(var(--ink-rgb),0.05)] transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 overflow-hidden">
                      {(item.album?.images?.[2]?.url || item.images?.[0]?.url) ? (
                        // eslint-disable-next-line @next/next/no-img-element -- playlist art comes from several Spotify CDNs
                        <img src={item.album?.images?.[2]?.url || item.images[0].url} alt="" width={48} height={48} loading="lazy" className="w-12 h-12 rounded object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded bg-[rgba(var(--ink-rgb),0.05)] flex items-center justify-center"><Disc size={16} className="opacity-40" /></div>
                      )}
                      <div className="min-w-0">
                        <h4 className="mc-title text-sm truncate">{item.name}</h4>
                        <p className="mc-text text-xs text-[var(--fg-dim)] truncate">{item.artists?.[0]?.name ?? (item.type === 'playlist' ? `Playlist · ${item.owner?.display_name ?? 'Spotify'}` : '')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {previewButton}
                      <button aria-label="Play"
                        className="w-8 h-8 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 [@media(pointer:coarse)]:opacity-100 hover:bg-[#1ed760]/20 text-[#1ed760] transition-all"
                        onClick={() => playUri(item.uri)}
                      >
                        <Play size={16} />
                      </button>
                      <button aria-label="Save to the library"
                        className="w-8 h-8 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 [@media(pointer:coarse)]:opacity-100 hover:bg-[rgba(var(--ink-rgb),0.1)] text-[var(--fg-dim)] hover:text-[var(--fg-strong)] transition-all"
                        title="Save to the library"
                        onClick={() => saveToProject(item)}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                  {previewFrame}
                  </div>
                  )}</SpotifyPreview>
                ))}
              </div>

              <div className="p-6 mt-8 rounded-2xl bg-[#e8431a]/10 border border-[#e8431a]/20 flex gap-4 items-start">
                <ShieldAlert size={20} className="text-[#e8431a] shrink-0 mt-1" />
                <p className="mc-text text-xs leading-relaxed text-[#e8431a]/80">
                  <strong className="text-[#e8431a]">Copyright Notice:</strong> Searching the public Spotify catalog will return copyrighted material. You may link these to your projects as private references or mood inspiration, but they cannot be exported as part of your final mixed media without a license.
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
