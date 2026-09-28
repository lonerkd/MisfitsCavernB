'use client';

// The suite's one list of film crafts (public.crafts): what a profile says
// someone does, what a job is for, what a crew member does on a project.
// Reference data — read by everyone, extended by admins — so it's fetched
// once per page load and shared.

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

import type { Craft } from './crafts-core';

export * from './crafts-core';

let cache: Promise<Craft[]> | null = null;

export function loadCrafts(force = false): Promise<Craft[]> {
  if (!cache || force) {
    cache = (async () => {
      const { data, error } = await supabase.from('crafts').select('name, department, color, position').order('position');
      if (error) { cache = null; throw new Error(error.message || 'Could not load crafts'); }
      return data;
    })();
  }
  return cache;
}

export function useCrafts(): { crafts: Craft[]; byName: Map<string, Craft>; loading: boolean } {
  const [crafts, setCrafts] = useState<Craft[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    loadCrafts().then((c) => { if (alive) setCrafts(c); }).catch(() => {}).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return { crafts, byName: new Map(crafts.map((c) => [c.name, c])), loading };
}
