'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, usePathname } from 'next/navigation';
import { Home, FileText, LayoutGrid, MessageSquare, Briefcase, FolderOpen, User, Settings, Search, CornerDownLeft, Film, LogOut, Keyboard } from 'lucide-react';
import { useProject } from '@/lib/context/ProjectContext';
import { supabase } from '@/lib/supabase/client';

interface Command {
  id: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  keywords?: string;
  run: () => void;
  group: string;
}

// Lightweight subsequence fuzzy match — every query char must appear in order.
function fuzzy(query: string, text: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  let i = 0;
  for (let j = 0; j < t.length && i < q.length; j++) if (t[j] === q[i]) i++;
  return i === q.length;
}

export default function CommandPalette() {
  const router = useRouter();
  const pathname = usePathname();
  const { projects, setActiveProject } = useProject();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Dynamic data for search
  const [scripts, setScripts] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);

  // ⌘K / Ctrl-K toggles; also close on route change.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('mc-open-command-palette', onOpen);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('mc-open-command-palette', onOpen); };
  }, []);

  useEffect(() => { setOpen(false); }, [pathname]);
  
  useEffect(() => {
    if (open) { 
      setQuery(''); 
      setSel(0); 
      setTimeout(() => inputRef.current?.focus(), 30); 
      
      // Fetch dynamic data when palette opens
      const fetchData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const [scriptsRes, assetsRes] = await Promise.all([
          supabase.from('scripts').select('id, title, project_id').eq('created_by', user.id).limit(20),
          supabase.from('assets').select('id, name, project_id').eq('uploaded_by', user.id).limit(20)
        ]);
        
        if (scriptsRes.data) setScripts(scriptsRes.data);
        if (assetsRes.data) setAssets(assetsRes.data);
      };
      fetchData();
    }
  }, [open]);

  const go = (path: string) => () => { router.push(path); setOpen(false); };

  const commands = useMemo<Command[]>(() => {
    const nav: Command[] = [
      { id: 'nav-home', label: 'Go to Hub', icon: <Home size={15} />, run: go('/'), group: 'Navigate', keywords: 'home dashboard' },
      { id: 'nav-editor', label: 'Open ScriptOS', hint: 'Screenplay editor', icon: <FileText size={15} />, run: go('/editor'), group: 'Navigate', keywords: 'write script screenplay' },
      { id: 'nav-studio', label: 'Open Studio', hint: 'Production suite', icon: <LayoutGrid size={15} />, run: go('/studio'), group: 'Navigate', keywords: 'production board schedule' },
      { id: 'nav-lounge', label: 'Open Lounge', hint: 'Community feed', icon: <MessageSquare size={15} />, run: go('/lounge'), group: 'Navigate', keywords: 'chat community feed' },
      { id: 'nav-projects', label: 'Open Projects', icon: <FolderOpen size={15} />, run: go('/projects'), group: 'Navigate', keywords: 'films' },
      { id: 'nav-portfolio', label: 'Open Portfolio', icon: <Briefcase size={15} />, run: go('/portfolio'), group: 'Navigate', keywords: 'work showcase' },
      { id: 'nav-jobs', label: 'Browse Jobs', icon: <Briefcase size={15} />, run: go('/jobs'), group: 'Navigate', keywords: 'casting hire gigs' },
      { id: 'nav-profile', label: 'Edit Profile', icon: <User size={15} />, run: go('/profile'), group: 'Account' },
      { id: 'nav-settings', label: 'Open Settings', icon: <Settings size={15} />, run: go('/settings'), group: 'Account', keywords: 'preferences password email' },
      { id: 'act-shortcuts', label: 'Keyboard shortcuts', icon: <Keyboard size={15} />, group: 'Account', keywords: 'help keys hotkeys', run: () => { setOpen(false); setTimeout(() => window.dispatchEvent(new Event('mc-open-shortcuts')), 60); } },
      { id: 'act-signout', label: 'Sign out', icon: <LogOut size={15} />, group: 'Account', keywords: 'log out logout', run: async () => { setOpen(false); await supabase.auth.signOut(); router.replace('/auth'); } },
    ];
    const proj: Command[] = projects.map(p => ({
      id: `proj-${p.id}`,
      label: p.title,
      hint: 'Switch active project',
      icon: <Film size={15} />,
      group: 'Projects',
      keywords: 'switch open',
      run: () => { setActiveProject(p); router.push('/studio'); setOpen(false); },
    }));
    
    const scriptCmds: Command[] = scripts.map(s => {
      const projMatch = projects.find(p => p.id === s.project_id);
      return {
        id: `script-${s.id}`,
        label: s.title || 'Untitled Script',
        hint: projMatch ? `Script in ${projMatch.title}` : 'Script',
        icon: <FileText size={15} />,
        group: 'Scripts',
        keywords: 'script screenplay write',
        run: () => { 
          if (projMatch) setActiveProject(projMatch); 
          router.push('/editor'); 
          setOpen(false); 
        },
      };
    });

    const assetCmds: Command[] = assets.map(a => {
      const projMatch = projects.find(p => p.id === a.project_id);
      return {
        id: `asset-${a.id}`,
        label: a.name || 'Untitled Asset',
        hint: projMatch ? `Asset in ${projMatch.title}` : 'Asset',
        icon: <LayoutGrid size={15} />,
        group: 'Studio Assets',
        keywords: 'asset image video file',
        run: () => { 
          if (projMatch) setActiveProject(projMatch); 
          router.push('/studio'); 
          setOpen(false); 
        },
      };
    });

    return [...nav, ...proj, ...scriptCmds, ...assetCmds];
  }, [projects, router, scripts, assets]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const list = commands.filter(c => fuzzy(query, `${c.label} ${c.keywords || ''} ${c.group}`));
    return list.slice(0, 50); // Limit to 50 results to keep UI snappy
  }, [commands, query]);

  // Group results while preserving order.
  const groups = useMemo(() => {
    const m: { group: string; items: Command[] }[] = [];
    for (const c of filtered) {
      let g = m.find(x => x.group === c.group);
      if (!g) { g = { group: c.group, items: [] }; m.push(g); }
      g.items.push(c);
    }
    return m;
  }, [filtered]);

  useEffect(() => { if (sel >= filtered.length) setSel(Math.max(0, filtered.length - 1)); }, [filtered, sel]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(filtered.length - 1, s + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(0, s - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); filtered[sel]?.run(); }
  };

  // Keep the selected row scrolled into view.
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${sel}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [sel]);

  if (pathname === '/auth' || pathname === '/login') return null;

  let flatIdx = -1;
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onMouseDown={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 100000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '14vh' }}
        >
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onMouseDown={e => e.stopPropagation()}
            style={{ width: 'min(92vw, 560px)', background: 'rgba(5, 10, 18, 0.98)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, boxShadow: '0 32px 90px rgba(0,0,0,0.7)', overflow: 'hidden' }}
          >
            {/* Search input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <Search size={16} color="rgba(255,255,255,0.4)" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => { setQuery(e.target.value); setSel(0); }}
                onKeyDown={onKeyDown}
                placeholder="Search actions, projects, pages…"
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--fg)', fontSize: 14, fontFamily: 'var(--mono)' }}
              />
              <kbd style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 4, padding: '2px 6px' }}>ESC</kbd>
            </div>

            {/* Results */}
            <div ref={listRef} style={{ maxHeight: '52vh', overflowY: 'auto', padding: 8 }}>
              {filtered.length === 0 ? (
                <div style={{ padding: '28px 16px', textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: 12, fontFamily: 'var(--mono)' }}>No matches for “{query}”</div>
              ) : groups.map(g => (
                <div key={g.group} style={{ marginBottom: 6 }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(224, 221, 174, 0.3)', padding: '6px 10px 4px' }}>{g.group}</div>
                  {g.items.map(c => {
                    flatIdx++;
                    const idx = flatIdx;
                    const active = idx === sel;
                    return (
                      <button
                        key={c.id}
                        data-idx={idx}
                        onMouseEnter={() => setSel(idx)}
                        onClick={() => c.run()}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '9px 10px', borderRadius: 8,
                          background: active ? 'rgba(215, 52, 11,0.12)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
                          color: active ? 'var(--fg)' : 'rgba(255,255,255,0.75)', transition: 'background 0.12s',
                        }}
                      >
                        <span style={{ color: active ? 'var(--accent)' : 'rgba(255,255,255,0.4)', display: 'flex' }}>{c.icon}</span>
                        <span style={{ flex: 1, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.label}</span>
                        {c.hint && <span style={{ fontSize: 10, color: 'rgba(224, 221, 174, 0.3)', fontFamily: 'var(--mono)' }}>{c.hint}</span>}
                        {active && <CornerDownLeft size={13} color="rgba(255,255,255,0.4)" />}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
