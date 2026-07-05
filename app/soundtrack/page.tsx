'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Disc, Search, Music, Folder, Link2, ShieldAlert } from 'lucide-react';
import { useSpotify } from '@/lib/context/SpotifyContext';
import { redirectToSpotifyAuth } from '@/lib/spotify/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const MOODS = [
  { name: 'Tension', uri: 'spotify:playlist:37i9dQZF1EIeO67Lh9iQ3Y' },
  { name: 'Ethereal', uri: 'spotify:playlist:37i9dQZF1DXc8kgYqQLKc1' },
  { name: 'Cyberpunk', uri: 'spotify:playlist:37i9dQZF1DXdLEN7aqioJC' },
  { name: 'Orchestral Sweep', uri: 'spotify:playlist:37i9dQZF1DX1qHzZWvoGZu' },
  { name: 'Dark Ambient', uri: 'spotify:playlist:37i9dQZF1DX1n9dp3223e7' }
];

export default function SoundtrackPage() {
  const { isAuthenticated, playUri } = useSpotify();
  const [activeTab, setActiveTab] = useState<'moods'|'project'|'search'>('moods');
  
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

  return (
    <div className="mc-page p-12">
      <header className="mb-12 flex items-end justify-between">
        <div>
          <h1 className="mc-title text-4xl tracking-wide">Soundtrack & Audio</h1>
          <p className="mc-text opacity-60 uppercase tracking-widest text-xs mt-2">Manage cinematic moods, SFX, and project references</p>
        </div>
      </header>

      <div className="flex gap-4 mb-8 border-b border-white/5 pb-2">
        {(['moods', 'project', 'search'] as const).map(tab => (
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {MOODS.map(mood => (
                <div 
                  key={mood.name} 
                  className="p-6 rounded-2xl border border-white/5 bg-black/40 hover:bg-white/5 transition-colors cursor-pointer group flex flex-col items-center justify-center text-center gap-4"
                  onClick={() => playUri(mood.uri)}
                >
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 group-hover:bg-[#1ed760]/20 transition-all">
                    <Music size={24} className="group-hover:text-[#1ed760] text-white/40 transition-colors" />
                  </div>
                  <span className="mc-title text-xl">{mood.name}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'project' && (
            <div className="space-y-8">
              <div className="p-8 rounded-2xl border border-dashed border-white/10 flex flex-col items-center text-center">
                <Folder size={32} className="opacity-20 mb-4" />
                <h3 className="mc-title text-xl mb-2">No audio assets linked</h3>
                <p className="mc-text text-sm opacity-50 mb-6">Link royalty-free SFX or copyrighted references to your Project Bible.</p>
                <Button variant="outline" className="gap-2">
                  <Link2 size={16} /> Link Spotify URI
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'search' && (
            <div className="max-w-2xl">
              <div className="flex gap-4 items-end mb-8">
                <div className="flex-1">
                  <Input 
                    label="Search Spotify for references..." 
                    type="text" 
                    id="search"
                  />
                </div>
                <Button variant="solid" className="h-[52px] px-8">Search</Button>
              </div>
              <div className="p-6 rounded-2xl bg-[#d7340b]/10 border border-[#d7340b]/20 flex gap-4 items-start">
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
