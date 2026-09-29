'use client';

// One suite across devices. PlaceTracker quietly remembers the last place
// worth coming back to on this kind of device (a script, a Studio tab, a
// project page, a conversation) in the account's prefs; ContinueOffer, on the
// other device, offers to pick up there — "Continue from your desktop: Night
// Shift — script, 20 min ago". The offer is waved off per device, and taking
// it switches to the right project first (Studio follows the active project).

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowRight, Laptop, Smartphone, X } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useProject, useSession } from '@/lib/os';
import { loadUiPrefs, saveUiPrefs, useUiPrefs } from '@/lib/os/uiPrefs';
import { ago, placeFor, resumeOffer, worthSaving, type Device, type Place } from '@/lib/pocket/places';
import m from './mobile.module.css';

const PHONE_QUERY = '(max-width: 760px)';
const DISMISSED = 'mc-continue-dismissed';
const STAY_MS = 4000;

export const thisDevice = (): Device => (typeof window !== 'undefined' && window.matchMedia(PHONE_QUERY).matches ? 'phone' : 'desktop');

/** Remembers where you are, once you've stayed a moment. Renders nothing. */
export function PlaceTracker() {
  const { isAuthenticated } = useSession();
  const { activeProject } = useProject();
  const project = useRef(activeProject);
  project.current = activeProject;

  useEffect(() => {
    if (!isAuthenticated) return;
    let seen = '', since = 0, saved = '';
    let busy = false;
    const record = async () => {
      if (busy) return;
      const href = location.pathname + location.search;
      if (href === saved) return;
      const search = new URLSearchParams(location.search);
      let proj = project.current ? { id: project.current.id, title: project.current.title } : null;
      if (location.pathname === '/editor') {
        const id = search.get('script');
        if (!id) return;
        const { data } = await supabase.from('scripts').select('title, project_id').eq('id', id).maybeSingle();
        proj = data?.project_id ? { id: data.project_id, title: data.title || 'Untitled' } : null;
      }
      const place = placeFor(location.pathname, search, proj);
      if (!place) { saved = href; return; }
      const device = thisDevice();
      busy = true;
      try {
        const prefs = await loadUiPrefs();
        const now = new Date();
        if (!worthSaving(prefs.places[device], place, now)) { saved = href; return; }
        await saveUiPrefs({ places: { ...prefs.places, [device]: { ...place, at: now.toISOString() } } });
        saved = href;
      } catch { /* the next look will try again */ } finally { busy = false; }
    };
    const look = () => {
      const href = location.pathname + location.search;
      if (href !== seen) { seen = href; since = Date.now(); return; }
      if (Date.now() - since >= STAY_MS) void record();
    };
    const leaving = () => { if (document.visibilityState === 'hidden') void record(); };
    const timer = setInterval(look, 1000);
    document.addEventListener('visibilitychange', leaving);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', leaving); };
  }, [isAuthenticated]);
  return null;
}

function readDismissed(): string | null {
  try { return localStorage.getItem(DISMISSED); } catch { return null; }
}

/** The other device's place, if there's one to pick up. */
export function useContinueOffer() {
  const { prefs, loaded } = useUiPrefs();
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [device, setDevice] = useState<Device>('desktop');
  useEffect(() => { setDismissed(readDismissed()); setDevice(thisDevice()); }, []);
  const here = typeof window !== 'undefined' ? location.pathname + location.search : pathname;
  const offer = loaded ? resumeOffer(prefs.places, device, new Date(), here) : null;
  const dismiss = useCallback((p: Place) => {
    try { localStorage.setItem(DISMISSED, p.at); } catch { /* device-only nicety */ }
    setDismissed(p.at);
  }, []);
  return { offer: offer && offer.place.at !== dismissed ? offer : null, dismiss };
}

/** Take the offer: the right project first, then the place. */
export function useGoToPlace() {
  const router = useRouter();
  const { projects, setActiveProject } = useProject();
  return useCallback((p: Place) => {
    const proj = p.project ? projects.find((x) => x.id === p.project) : null;
    if (proj) setActiveProject(proj);
    router.push(p.path);
  }, [projects, setActiveProject, router]);
}

/** The offer as a card (Today) or a small floating note (anywhere else, once per visit). */
export function ContinueOffer({ inline = false, className = '' }: { inline?: boolean; className?: string }) {
  const { isAuthenticated } = useSession();
  const pathname = usePathname();
  const { offer, dismiss } = useContinueOffer();
  const go = useGoToPlace();
  // The floating note belongs to the first page of a visit: moving on, or
  // reloading in the same tab, puts it away. Today has its own card.
  const [firstPath, setFirstPath] = useState<string | null>(null);
  useEffect(() => {
    if (inline) return;
    let fresh = true;
    try { fresh = !sessionStorage.getItem('mc-continue-seen'); sessionStorage.setItem('mc-continue-seen', '1'); } catch { /* ignore */ }
    setFirstPath(fresh ? pathname : '');
  }, [inline]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isAuthenticated || !offer) return null;
  if (!inline && (pathname !== firstPath || pathname === '/today' || pathname.startsWith('/editor') || pathname === '/split' || /^\/(auth|login|shared|p|s|call)(\/|$)/.test(pathname))) return null;
  const Icon = offer.from === 'phone' ? Smartphone : Laptop;
  const take = () => { dismiss(offer.place); go(offer.place); };
  return (
    <aside className={inline ? `${m.continueCard} ${className}` : m.continueFloat} aria-label={`Continue from your ${offer.from}`}>
      <Icon size={18} className={m.continueIcon} aria-hidden />
      <button type="button" className={m.continueBody} onClick={take}>
        <span className={m.continueFrom}>Continue from your {offer.from} · {ago(offer.place.at, new Date())}</span>
        <span className={m.continueLabel}>{offer.place.label}</span>
      </button>
      <ArrowRight size={16} className={m.continueIcon} aria-hidden />
      <button type="button" className={m.continueX} onClick={() => dismiss(offer.place)} aria-label="Not now"><X size={15} /></button>
    </aside>
  );
}
