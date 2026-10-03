'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Disc, Search, Music, Folder, Link2, ShieldAlert, UploadCloud, Play, Plus, Trash, Wand2 } from 'lucide-react';
import { useSpotify } from '@/lib/context/SpotifyContext';
import { redirectToSpotifyAuth } from '@/lib/spotify/auth';
import { searchSpotify, contextAwareSearch } from '@/lib/spotify/search';
import { scriptMoods, type MoodGroup } from '@/lib/spotify/moods';
import { useProject } from '@/lib/os';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/Toast';
import { awaitOSUser } from '@/lib/os';

export default function SoundtrackPage() {
  const { isAuthenticated, playUri } = useSpotify();
  const { activeProject } = useProject();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'moods'|'sfx'|'project'|'search'>('moods');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [sfxAssets, setSfxAssets] = useState<any[]>([]);
  const [uploadingSfx, setUploadingSfx] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Moods come from the project's script (lib/spotify/moods), scene by scene.
  const [moods, setMoods] = useState<{ status: 'idle' | 'loading' | 'ready'; title: string | null; groups: MoodGroup[] }>({ status: 'idle', title: null, groups: [] });
  useEffect(() => {
    if (activeTab !== 'moods' || !activeProject?.id) return;
    let on = true;
    setMoods((m) => ({ ...m, status: 'loading' }));
    supabase.from('scripts').select('title, content').eq('project_id', activeProject.id).order('updated_at', { ascending: false }).limit(1)
      .then(({ data }) => {
        if (!on) return;
        const script = data?.[0];
        setMoods({ status: 'ready', title: script?.title ?? null, groups: script?.content ? scriptMoods(script.content) : [] });
      });
    return () => { on = false; };
  }, [activeTab, activeProject?.id]);

  const [projectRefs, setProjectRefs] = useState<any[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(false);

  const fetchSfxAssets = useCallback(async () => {
    const { data, error } = await supabase.from('sfx_assets').select('*').order('created_at', { ascending: false });
    if (data && !error) setSfxAssets(data);
  }, []);

  const refsProjectId = activeProject?.id;
  const fetchProjectRefs = useCallback(async () => {
    if (!refsProjectId) return;
    setLoadingRefs(true);
    const { data, error } = await supabase.from('project_audio_references').select('*').eq('project_id', refsProjectId).order('created_at', { ascending: false });
    if (data && !error) setProjectRefs(data);
    setLoadingRefs(false);
  }, [refsProjectId]);

  useEffect(() => {
    if (activeTab === 'sfx') fetchSfxAssets();
    if (activeTab === 'project' && activeProject?.id) fetchProjectRefs();
  }, [activeTab, activeProject?.id, fetchSfxAssets, fetchProjectRefs]);

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

  const handleMagicSearch = async () => {
    if (!activeProject?.id) {
      toast('Select an active project in the Hub first', 'error');
      return;
    }
    setIsSearching(true);
    try {

      const { data: scripts } = await supabase
        .from('scripts')
        .select('content')
        .eq('project_id', activeProject.id)
        .order('updated_at', { ascending: false })
        .limit(1);
      const content = scripts?.[0]?.content;
      if (!content || !content.trim()) {
        toast('This project has no script content yet to read mood from', 'error');
        return;
      }
      const results = await contextAwareSearch(content);
      setSearchResults(results || []);
    } catch (err: any) {
      toast('Magic search failed: ' + err.message, 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSfxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingSfx(true);
    try {
      const userData = { user: await awaitOSUser() };
      if (!userData.user) throw new Error('Not authenticated');
      if (!activeProject?.id) throw new Error('Select an active project first');

      if (!file.type.startsWith('audio/')) throw new Error('SFX must be an audio file');
      if (file.size > 20 * 1024 * 1024) throw new Error('SFX files are limited to 20 MB');
      // Uploads go in the uploader's own folder (storage policy).
      const fileName = `${userData.user.id}/${Date.now()}_${file.name.replace(/[^\w.-]+/g, '_')}`;
      const { error: uploadError } = await supabase.storage.from('sfx_library').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage.from('sfx_library').getPublicUrl(fileName);

      const { error: dbError } = await supabase.from('sfx_assets').insert({
        title: file.name,
        audio_url: publicUrl.publicUrl,
        user_id: userData.user.id,
        project_id: activeProject.id,
        tags: ['Cavern Created']
      });
      if (dbError) throw dbError;

      toast('SFX Uploaded successfully', 'success');
      fetchSfxAssets();
    } catch (err: any) {
      toast('Upload failed: ' + err.message, 'error');
    } finally {
      setUploadingSfx(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const saveToProject = async (item: any, type: 'spotify' | 'custom_upload') => {
    if (!activeProject?.id) {
      toast('No active project selected', 'error');
      return;
    }
    try {
      const userData = { user: await awaitOSUser() };
      const { error } = await supabase.from('project_audio_references').insert({
        project_id: activeProject.id,
        added_by: userData.user?.id,
        reference_type: type,

        uri: type === 'spotify' ? item.uri : item.audio_url,
        title: type === 'spotify' ? item.name : item.title,
        description: type === 'spotify' ? (item.artists?.[0]?.name || (item.type === 'playlist' ? 'Spotify playlist' : 'Spotify')) : (item.tags?.[0] || 'Custom SFX')
      });
      if (error) throw error;
      toast('Saved to Project Audio Bible', 'success');
    } catch (err: any) {
      toast('Failed to save to project: ' + err.message, 'error');
    }
  };

  const deleteProjectRef = async (id: string) => {
    const { error } = await supabase.from('project_audio_references').delete().eq('id', id);
    if (!error) {
      toast('Reference removed', 'success');
      fetchProjectRefs();
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="mc-page p-12 flex flex-col items-center justify-center text-center">
        <Disc size={48} className="mb-6 opacity-20" />
        <h1 className="mc-title text-4xl mb-4">Cinematic Audio Engine</h1>
        <p className="mc-text mb-8 max-w-md text-[var(--fg-dim)]">Connect your Spotify account to unlock the global background player and cinematic mood library.</p>
        <Button variant="solid" onClick={redirectToSpotifyAuth} className="gap-2 px-8">
          <Disc size={16} /> Connect Spotify
        </Button>
      </div>
    );
  }

  return (
    <div className="mc-page p-12">
      <header className="mb-12 flex items-end justify-between">
        <div>
          <h1 className="mc-title text-4xl tracking-wide">Soundtrack & Audio</h1>
          <p className="mc-text text-[var(--fg-dim)] uppercase tracking-widest text-xs mt-2">Manage cinematic moods, SFX, and project references</p>
        </div>
      </header>

      <div className="flex gap-4 mb-8 border-b border-[rgba(var(--ink-rgb),0.06)] pb-2">
        {(['moods', 'sfx', 'project', 'search'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`mc-text uppercase tracking-widest text-xs px-4 py-2 rounded-full transition-colors ${
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

          {activeTab === 'sfx' && (
            <div className="space-y-8">
              <div className="flex justify-between items-center bg-[var(--sunken)] p-6 rounded-2xl border border-[rgba(var(--ink-rgb),0.06)]">
                <div>
                  <h3 className="mc-title text-xl mb-1">Custom SFX Library</h3>
                  <p className="mc-text text-sm text-[var(--fg-dim)]">Upload raw .wav or .mp3 files to your Cavern Created library.</p>
                </div>
                <div>
                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleSfxUpload}
                  />
                  <Button variant="solid" className="gap-2" onClick={() => fileInputRef.current?.click()} isLoading={uploadingSfx}>
                    <UploadCloud size={16} /> Upload Audio
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sfxAssets.length === 0 ? (
                  <div className="col-span-full p-12 text-center border border-dashed border-[rgba(var(--ink-rgb),0.1)] rounded-2xl">
                    <Folder size={32} className="opacity-20 mb-4 mx-auto" />
                    <h4 className="mc-title text-[var(--fg-dim)]">No custom SFX uploaded yet</h4>
                  </div>
                ) : (
                  sfxAssets.map(asset => {

                    const publicUrl = asset.audio_url;
                    return (
                      <div key={asset.id} className="p-4 rounded-xl border border-[rgba(var(--ink-rgb),0.06)] bg-[var(--sunken)] flex items-center justify-between group hover:bg-[rgba(var(--ink-rgb),0.05)] transition-colors">
                        <div className="flex items-center gap-4 overflow-hidden">
                          <button aria-label="Play"
                            className="w-10 h-10 shrink-0 rounded-full bg-[#1ed760]/10 flex items-center justify-center hover:bg-[#1ed760]/20 text-[#1ed760]"
                            onClick={() => new Audio(publicUrl).play()}
                          >
                            <Play size={16} />
                          </button>
                          <div className="min-w-0">
                            <h4 className="mc-title text-sm truncate">{asset.title}</h4>
                            <p className="mc-text text-xs text-[var(--fg-dim)] truncate">{asset.tags?.[0] || 'Custom SFX'}</p>
                          </div>
                        </div>
                        <button aria-label="Save to Active Project"
                          className="w-8 h-8 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-[rgba(var(--ink-rgb),0.1)] transition-all text-[var(--fg-dim)] hover:text-[var(--fg-strong)] shrink-0"
                          title="Save to Active Project"
                          onClick={() => saveToProject(asset, 'custom_upload')}
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {activeTab === 'project' && (
            <div className="space-y-8">
              {!activeProject ? (
                <div className="p-12 rounded-2xl border border-dashed border-[rgba(var(--ink-rgb),0.1)] text-center">
                  <ShieldAlert size={32} className="opacity-20 mb-4 mx-auto" />
                  <h3 className="mc-title text-xl mb-2">No Active Project</h3>
                  <p className="mc-text text-sm text-[var(--fg-dim)]">Select an active project in the Hub to view its Audio Bible.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-4 mb-6 border-b border-[rgba(var(--ink-rgb),0.1)] pb-6">
                    <div className="w-12 h-12 rounded bg-[rgba(var(--ink-rgb),0.05)] flex items-center justify-center" style={{ borderLeft: `2px solid ${activeProject.accent_color || 'white'}` }}>
                      <Folder size={20} className="opacity-60" />
                    </div>
                    <div>
                      <h2 className="mc-title text-2xl">{activeProject.title} Audio Bible</h2>
                      <p className="mc-text text-sm text-[var(--fg-dim)]">Global audio references saved to this project</p>
                    </div>
                  </div>

                  {loadingRefs ? (
                    <div className="animate-pulse flex gap-4"><div className="w-full h-16 bg-[rgba(var(--ink-rgb),0.05)] rounded-xl"></div></div>
                  ) : projectRefs.length === 0 ? (
                    <div className="p-12 rounded-2xl border border-dashed border-[rgba(var(--ink-rgb),0.1)] text-center">
                      <Music size={32} className="opacity-20 mb-4 mx-auto" />
                      <h3 className="mc-title text-lg mb-2">Bible is empty</h3>
                      <p className="mc-text text-sm text-[var(--fg-dim)]">Search for tracks or upload SFX, then click &quot;+&quot; to save them here.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {projectRefs.map(ref => (
                        <div key={ref.id} className="p-4 rounded-xl border border-[rgba(var(--ink-rgb),0.06)] bg-[var(--sunken)] flex items-center justify-between group hover:bg-[rgba(var(--ink-rgb),0.05)] transition-colors">
                          <div className="flex items-center gap-4 overflow-hidden">
                            <button aria-label="Play"
                              className="w-10 h-10 shrink-0 rounded-full bg-[rgba(var(--ink-rgb),0.05)] flex items-center justify-center hover:bg-[rgba(var(--ink-rgb),0.1)] transition-colors"
                              onClick={() => {
                                if (ref.reference_type === 'spotify') playUri(ref.uri);
                                else if (ref.reference_type === 'custom_upload') {
                                  const url = supabase.storage.from('sfx_library').getPublicUrl(ref.uri).data.publicUrl;
                                  new Audio(url).play();
                                }
                              }}
                            >
                              <Play size={16} />
                            </button>
                            <div className="min-w-0">
                              <h4 className="mc-title text-sm truncate">{ref.title}</h4>
                              <p className="mc-text text-xs text-[var(--fg-dim)] truncate flex items-center gap-1">
                                {ref.reference_type === 'spotify' ? <Disc size={10} /> : <UploadCloud size={10} />}
                                {ref.description}
                              </p>
                            </div>
                          </div>
                          <button aria-label="Delete"
                            className="w-8 h-8 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-red-400 transition-all shrink-0"
                            onClick={() => deleteProjectRef(ref.id)}
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
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
                <Button type="button" variant="outline" className="h-[52px] px-6 border-accent text-accent hover:bg-accent/10" onClick={handleMagicSearch} isLoading={isSearching && searchQuery.length === 0}>
                  <Wand2 size={16} className="mr-2" /> Magic Context Fill
                </Button>
              </form>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {searchResults.map((item: any) => (
                  <div key={item.id} className="p-4 rounded-xl border border-[rgba(var(--ink-rgb),0.06)] bg-[var(--sunken)] flex items-center justify-between group hover:bg-[rgba(var(--ink-rgb),0.05)] transition-colors">
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
                      <button aria-label="Play"
                        className="w-8 h-8 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-[#1ed760]/20 text-[#1ed760] transition-all"
                        onClick={() => playUri(item.uri)}
                      >
                        <Play size={16} />
                      </button>
                      <button aria-label="Save to Project Bible"
                        className="w-8 h-8 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-[rgba(var(--ink-rgb),0.1)] text-[var(--fg-dim)] hover:text-[var(--fg-strong)] transition-all"
                        title="Save to Project Bible"
                        onClick={() => saveToProject(item, 'spotify')}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
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
