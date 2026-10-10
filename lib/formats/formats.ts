'use client';

// The suite's list of project formats (public.project_formats): what a
// project is, what its phases are called and which it skips. Reference data —
// read by everyone, extended by admins — so it's fetched once per page load
// and shared.

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { type ProjectFormat, toProjectFormat } from './core';

export * from './core';

let cache: Promise<ProjectFormat[]> | null = null;

export function loadFormats(force = false): Promise<ProjectFormat[]> {
  if (!cache || force) {
    cache = (async () => {
      const { data, error } = await supabase
        .from('project_formats')
        .select('name, blurb, icon, script_format, phase_labels, skip_phases, skip_milestones, position')
        .order('position');
      if (error) { cache = null; throw new Error(error.message || 'Could not load project formats'); }
      return data.map(toProjectFormat);
    })();
  }
  return cache;
}

export function useFormats(): { formats: ProjectFormat[]; loading: boolean } {
  const [formats, setFormats] = useState<ProjectFormat[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    loadFormats().then((f) => { if (alive) setFormats(f); }).catch(() => {}).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return { formats, loading };
}
