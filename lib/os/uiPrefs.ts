'use client';

// Per-account interface choices (profiles.ui_prefs), private to their owner:
// read and written through get_my_ui_prefs / set_my_ui_prefs.
//   show_all_tools — every tool in every project at once (else phase by phase)
//   seen_tools     — tools whose one-line intro has been read
//   dismissed      — phase suggestions waved off, "<project>:<phase>"
//   guide          — how they work: hours a week, experience, team, depth (lib/guides)
//   theme          — the look of the suite (lib/themes), the same on every device

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { toGuideProfile, type GuideProfile } from '@/lib/guides/profile';
import { toThemeChoice, type ThemeChoice } from '@/lib/themes';
import type { Json } from '@/lib/supabase/database.types';

export interface UiPrefs { show_all_tools: boolean; seen_tools: string[]; dismissed: string[]; guide: GuideProfile | null; theme: ThemeChoice | null }
export const DEFAULT_UI_PREFS: UiPrefs = { show_all_tools: false, seen_tools: [], dismissed: [], guide: null, theme: null };

const EVENT = 'mc:ui-prefs';
let cache: Promise<UiPrefs> | null = null;

const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
function toPrefs(raw: unknown): UiPrefs {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return { show_all_tools: r.show_all_tools === true, seen_tools: strings(r.seen_tools), dismissed: strings(r.dismissed), guide: toGuideProfile(r.guide), theme: r.theme ? toThemeChoice(r.theme) : null };
}

export function loadUiPrefs(): Promise<UiPrefs> {
  cache ??= (async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return DEFAULT_UI_PREFS;
    const { data, error } = await supabase.rpc('get_my_ui_prefs');
    return error ? DEFAULT_UI_PREFS : toPrefs(data);
  })();
  return cache;
}

/** Save part of the prefs; every open view hears about it. */
export async function saveUiPrefs(patch: Partial<UiPrefs>): Promise<UiPrefs> {
  const { data, error } = await supabase.rpc('set_my_ui_prefs', { p_patch: patch as Json });
  if (error) throw new Error(error.message);
  const next = toPrefs(data);
  cache = Promise.resolve(next);
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(EVENT, { detail: next }));
  return next;
}

/** Forget the cached prefs (on sign-in / sign-out). */
export function resetUiPrefs() { cache = null; }

export function useUiPrefs() {
  const [prefs, setPrefs] = useState<UiPrefs>(DEFAULT_UI_PREFS);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let alive = true;
    loadUiPrefs().then((p) => { if (alive) { setPrefs(p); setLoaded(true); } }).catch(() => { if (alive) setLoaded(true); });
    const on = (e: Event) => setPrefs((e as CustomEvent<UiPrefs>).detail);
    window.addEventListener(EVENT, on);
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        resetUiPrefs();
        loadUiPrefs().then((p) => { if (alive) setPrefs(p); }).catch(() => {});
      }
    });
    return () => { alive = false; window.removeEventListener(EVENT, on); sub.subscription.unsubscribe(); };
  }, []);
  const save = useCallback((patch: Partial<UiPrefs>) => saveUiPrefs(patch), []);
  return { prefs, loaded, save };
}
