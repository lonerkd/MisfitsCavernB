'use client';

import { useEffect, useState } from 'react';
import { listOpenJobTitles } from '@/lib/supabase/jobs';
import { latestScriptEditedBy } from '@/lib/supabase/scripts';
import { listRecentMediaTitles } from '@/lib/supabase/media';
import { listRecentChannelMessages } from '@/lib/supabase/messages';
import { listRecentWork } from '@/lib/supabase/portfolio';
import { tickerItems } from '@/lib/home/ticker';
import { getPlatformStats } from '@/lib/supabase/stats';
import { awaitOSUser } from '@/lib/os';

export interface LiveData {
  scriptLines: string[];
  assets: { label: string; color: string }[];
  messages: { from: string; text: string; mine: boolean }[];
  latestScriptTitle: string | null;
}

export interface PlatformStats { creators: number; scripts: number; projects: number; concepts: number }

export interface HomeWork { title: string; year: number | null; category: string | null; accent: string | null }

/**
 * The home page's data: the public platform totals, who's hiring and what
 * was just published — and, for a signed-in person, the live preview data
 * (their latest script's lines, recent media, recent channel messages).
 * `loggedIn` is null until the session is known, so a signed-in person
 * never sees the signed-out page flash by.
 */
export function useHomeData() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [live, setLive] = useState<LiveData>({ scriptLines: [], assets: [], messages: [], latestScriptTitle: null });
  const [ticker, setTicker] = useState<string[]>([]);
  const [works, setWorks] = useState<HomeWork[]>([]);

  useEffect(() => {
    const palette = ['#6366f1', '#10b981', '#e8431a', '#f59e0b', '#8b5cf6', '#06b6d4'];
    // Public: platform totals, who's hiring, what was just published.
    (async () => {
      const [platformStats, jobsRes, published] = await Promise.all([
        getPlatformStats(),
        listOpenJobTitles(4).catch(() => []),
        listRecentWork(3),
      ]);
      setStats({ creators: platformStats.users, scripts: platformStats.scripts, projects: platformStats.projects, concepts: platformStats.media });
      setWorks(published.map((w) => ({ title: w.title, year: w.year, category: w.category, accent: w.accent_color })));
      setTicker(tickerItems(platformStats, jobsRes, published));
    })().catch((err) => console.error('Home stats load failed:', err));

    awaitOSUser().then(async (user) => {
      setLoggedIn(!!user);
      if (!user) return;

      try {
        // The landing page's live preview: each part shows what loaded.
        const [script, recentMedia, recentMessages] = await Promise.all([
          latestScriptEditedBy(user.id).catch(() => null),
          listRecentMediaTitles(6).catch(() => []),
          listRecentChannelMessages(4).catch(() => []),
        ]);
        const scriptLines = script?.content ? String(script.content).split('\n').map(s => s.trim()).filter(Boolean).slice(0, 11) : [];
        const assets = recentMedia.map((a, i) => ({ label: a.title || 'Reference', color: palette[i % palette.length] }));
        const messages = recentMessages.slice().reverse().map((m) => ({ from: m.username || 'Crew', text: m.content, mine: m.sender_id === user.id }));
        setLive({
          scriptLines,
          assets,
          messages,
          latestScriptTitle: script?.title || null,
        });
      } catch (err) {
        console.error('Home data load failed:', err);
      }
    }).catch(err => console.error('Auth check failed:', err));
  }, []);

  return { loggedIn, stats, live, ticker, works };
}
