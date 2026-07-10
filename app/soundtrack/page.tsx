'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Disc, Search, Music, Folder, Link2, ShieldAlert, UploadCloud, Play, Plus, Trash, Wand2 } from 'lucide-react';
import { useSpotify } from '@/lib/context/SpotifyContext';
import { redirectToSpotifyAuth } from '@/lib/spotify/auth';
import { searchSpotify, contextAwareSearch } from '@/lib/spotify/search';
import { useProject } from '@/lib/context/ProjectContext';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/Toast';

const MOODS = [
  // Cinematic Moods
  { category: 'Cinematic Moods', name: 'Tension', uri: 'spotify:playlist:37i9dQZF1EIeO67Lh9iQ3Y', color: '#8b0000' },
  { category: 'Cinematic Moods', name: 'Ethereal', uri: 'spotify:playlist:37i9dQZF1DXc8kgYqQLKc1', color: '#4169e1' },
  { category: 'Cinematic Moods', name: 'Cyberpunk', uri: 'spotify:playlist:37i9dQZF1DXdLEN7aqioJC', color: '#ff00ff' },
  { category: 'Cinematic Moods', name: 'Orchestral Sweep', uri: 'spotify:playlist:37i9dQZF1DX1qHzZWvoGZu', color: '#daa520' },
  { category: 'Cinematic Moods', name: 'Dark Ambient', uri: 'spotify:playlist:37i9dQZF1DX1n9dp3223e7', color: '#2f4f4f' },
  // Eras & Genres
  { category: 'Eras & Genres', name: '80s Synthwave', uri: 'spotify:playlist:37i9dQZF1DXdLEN7aqioJC', color: '#ff1493' },
  { category: 'Eras & Genres', name: 'Noir Jazz', uri: 'spotify:playlist:37i9dQZF1DX0b1hHYPNzaU', color: '#708090' },
  { category: 'Eras & Genres', name: 'Western Acoustic', uri: 'spotify:playlist:37i9dQZF1DWZqzjeJjC6n4', color: '#cd853f' },
  // Pacing & Action
  { category: 'Pacing & Action', name: 'Chase Sequences', uri: 'spotify:playlist:37i9dQZF1DWTx0ygoZScW3', color: '#ff4500' },
  { category: 'Pacing & Action', name: 'Slow Burn', uri: 'spotify:playlist:37i9dQZF1DX2pCG3h42yA9', color: '#483d8b' },
  { category: 'Pacing & Action', name: 'Suspense', uri: 'spotify:playlist:37i9dQZF1DWZq91oqsEAqw', color: '#000000' },
];

export default function SoundtrackPage() {
  const { isAuthenticated, playUri } = useSpotify();
  const { activeProject } = useProject();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'moods'|'sfx'|'project'|'search'>('moods');
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Custom SFX State
  const [sfxAssets, setSfxAssets] = useState<any[]>([]);
  const [uploadingSfx, setUploadingSfx] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Project References State
  const [projectRefs, setProjectRefs] = useState<any[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(false);

  useEffect(() => {
    if (activeTab === 'sfx') fetchSfxAssets();
    if (activeTab === 'project' && activeProject?.id) fetchProjectRefs();
  }, [activeTab, activeProject?.id]);

  const fetchSfxAssets = async () => {
    const { data, error } = await supabase.from('sfx_assets').select('*').order('created_at', { ascending: false });
    if (data && !error) setSfxAssets(data);
  };

  const fetchProjectRefs = async () => {
    if (!activeProject?.id) return;
    setLoadingRefs(true);
    const { data, error } = await supabase.from('project_audio_references').select('*').eq('project_id', activeProject.id).order('created_at', { ascending: false });
    if (data && !error) setProjectRefs(data);
    setLoadingRefs(false);
  };

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

  const handleMagicSearch = async () => {
    if (!activeProject?.id) {
      toast('Select an active project in the Hub first', 'error');
      return;
    }
    setIsSearching(true);
    try {
      // Pull the real, most-recently-edited script for this project and read
      // its actual content for mood/keyword extraction -- not a fixed string.
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
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');
      if (!activeProject?.id) throw new Error('Select an active project first');

      const fileName = `${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('sfx_library').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage.from('sfx_library').getPublicUrl(fileName);

      // sfx_assets columns are (title, audio_url, user_id, tags, ...) — the
      // previous insert used nonexistent columns (bucket_path, file_name,
      // category, uploaded_by), so every SFX upload failed at the DB step.
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
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from('project_audio_references').insert({
        project_id: activeProject.id,
        added_by: userData.user?.id,
        reference_type: type,
        // sfx_assets rows carry audio_url/title/tags — the old bucket_path/
        // file_name/category columns never existed, so saves always failed
        uri: type === 'spotify' ? item.uri : item.audio_url,
        title: type === 'spotify' ? item.name : item.title,
        description: type === 'spotify' ? (item.artists?.[0]?.name || 'Spotify Playist') : (item.tags?.[0] || 'Custom SFX')
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
        <p className="mc-text mb-8 max-w-md opacity-60">Connect your Spotify account to unlock the global background player and cinematic mood library.</p>
        <Button variant="solid" onClick={redirectToSpotifyAuth} className="gap-2 px-8">
          <Disc size={16} /> Connect Spotify
        </Button>
      </div>
    );
  }

  // Group moods by category
  const groupedMoods = MOODS.reduce((acc, mood) => {
    if (!acc[mood.category]) acc[mood.category] = [];
    acc[mood.category].push(mood);
    return acc;
  }, {} as Record<string, typeof MOODS>);

  return (
    <div className="mc-page p-12">
      <header className="mb-12 flex items-end justify-between">
        <div>
          <h1 className="mc-title text-4xl tracking-wide">Soundtrack & Audio</h1>
          <p className="mc-text opacity-60 uppercase tracking-widest text-xs mt-2">Manage cinematic moods, SFX, and project references</p>
        </div>
      </header>

      <div className="flex gap-4 mb-8 border-b border-white/5 pb-2">
        {(['moods', 'sfx', 'project', 'search'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`mc-text uppercase tracking-widest text-xs px-4 py-2 rounded-full transition-colors ${
              activeTab === tab ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/80'
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
            <div className="space-y-12">
              {Object.entries(groupedMoods).map(([category, moods]) => (
                <div key={category}>
                  <h2 className="mc-title text-xl opacity-60 mb-6">{category}</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {moods.map(mood => (
                      <div 
                        key={mood.name} 
                        className="p-6 rounded-2xl border border-white/5 bg-black/40 hover:bg-white/5 transition-all cursor-pointer group flex flex-col items-center justify-center text-center gap-4 hover:-translate-y-1 relative overflow-hidden"
                        onClick={() => playUri(mood.uri)}
                      >
                        <div 
                          className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity" 
                          style={{ background: `radial-gradient(circle at center, ${mood.color}, transparent)` }}
                        />
                        <div 
                          className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform relative z-10"
                          style={{ boxShadow: `0 0 20px ${mood.color}40` }}
                        >
                          <Music size={24} className="group-hover:text-white text-white/40 transition-colors" />
                        </div>
                        <span className="mc-title text-lg relative z-10">{mood.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'sfx' && (
            <div className="space-y-8">
              <div className="flex justify-between items-center bg-black/20 p-6 rounded-2xl border border-white/5">
                <div>
                  <h3 className="mc-title text-xl mb-1">Custom SFX Library</h3>
                  <p className="mc-text text-sm opacity-50">Upload raw .wav or .mp3 files to your Cavern Created library.</p>
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
                  <div className="col-span-full p-12 text-center border border-dashed border-white/10 rounded-2xl">
                    <Folder size={32} className="opacity-20 mb-4 mx-auto" />
                    <h4 className="mc-title opacity-60">No custom SFX uploaded yet</h4>
                  </div>
                ) : (
                  sfxAssets.map(asset => {
                    // audio_url already holds the full public URL from upload time
                    const publicUrl = asset.audio_url;
                    return (
                      <div key={asset.id} className="p-4 rounded-xl border border-white/5 bg-black/40 flex items-center justify-between group hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-4 overflow-hidden">
                          <button 
                            className="w-10 h-10 shrink-0 rounded-full bg-[#1ed760]/10 flex items-center justify-center hover:bg-[#1ed760]/20 text-[#1ed760]"
                            onClick={() => new Audio(publicUrl).play()}
                          >
                            <Play size={16} />
                          </button>
                          <div className="min-w-0">
                            <h4 className="mc-title text-sm truncate">{asset.title}</h4>
                            <p className="mc-text text-xs opacity-50 truncate">{asset.tags?.[0] || 'Custom SFX'}</p>
                          </div>
                        </div>
                        <button 
                          className="w-8 h-8 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-all text-white/50 hover:text-white shrink-0"
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
                <div className="p-12 rounded-2xl border border-dashed border-white/10 text-center">
                  <ShieldAlert size={32} className="opacity-20 mb-4 mx-auto" />
                  <h3 className="mc-title text-xl mb-2">No Active Project</h3>
                  <p className="mc-text text-sm opacity-50">Select an active project in the Hub to view its Audio Bible.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-4 mb-6 border-b border-white/10 pb-6">
                    <div className="w-12 h-12 rounded bg-white/5 flex items-center justify-center" style={{ borderLeft: `2px solid ${activeProject.accent_color || 'white'}` }}>
                      <Folder size={20} className="opacity-60" />
                    </div>
                    <div>
                      <h2 className="mc-title text-2xl">{activeProject.title} Audio Bible</h2>
                      <p className="mc-text text-sm opacity-50">Global audio references saved to this project</p>
                    </div>
                  </div>

                  {loadingRefs ? (
                    <div className="animate-pulse flex gap-4"><div className="w-full h-16 bg-white/5 rounded-xl"></div></div>
                  ) : projectRefs.length === 0 ? (
                    <div className="p-12 rounded-2xl border border-dashed border-white/10 text-center">
                      <Music size={32} className="opacity-20 mb-4 mx-auto" />
                      <h3 className="mc-title text-lg mb-2">Bible is empty</h3>
                      <p className="mc-text text-sm opacity-50">Search for tracks or upload SFX, then click &quot;+&quot; to save them here.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {projectRefs.map(ref => (
                        <div key={ref.id} className="p-4 rounded-xl border border-white/5 bg-black/40 flex items-center justify-between group hover:bg-white/5 transition-colors">
                          <div className="flex items-center gap-4 overflow-hidden">
                            <button 
                              className="w-10 h-10 shrink-0 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
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
                              <p className="mc-text text-xs opacity-50 truncate flex items-center gap-1">
                                {ref.reference_type === 'spotify' ? <Disc size={10} /> : <UploadCloud size={10} />}
                                {ref.description}
                              </p>
                            </div>
                          </div>
                          <button 
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
                  <div key={item.id} className="p-4 rounded-xl border border-white/5 bg-black/40 flex items-center justify-between group hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-4 overflow-hidden">
                      {item.album?.images?.[2]?.url ? (
                        <img src={item.album.images[2].url} alt="" className="w-12 h-12 rounded object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded bg-white/5 flex items-center justify-center"><Disc size={16} className="opacity-40" /></div>
                      )}
                      <div className="min-w-0">
                        <h4 className="mc-title text-sm truncate">{item.name}</h4>
                        <p className="mc-text text-xs opacity-50 truncate">{item.artists?.[0]?.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        className="w-8 h-8 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-[#1ed760]/20 text-[#1ed760] transition-all"
                        onClick={() => playUri(item.uri)}
                      >
                        <Play size={16} />
                      </button>
                      <button 
                        className="w-8 h-8 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-white/10 text-white/60 hover:text-white transition-all"
                        title="Save to Project Bible"
                        onClick={() => saveToProject(item, 'spotify')}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-6 mt-8 rounded-2xl bg-[#d7340b]/10 border border-[#d7340b]/20 flex gap-4 items-start">
                <ShieldAlert size={20} className="text-[#d7340b] shrink-0 mt-1" />
                <p className="mc-text text-xs leading-relaxed text-[#d7340b]/80">
                  <strong className="text-[#d7340b]">Copyright Notice:</strong> Searching the public Spotify catalog will return copyrighted material. You may link these to your projects as private references or mood inspiration, but they cannot be exported as part of your final mixed media without a license.
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
