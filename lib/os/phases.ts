// Every project moves through the same five phases. A project's format
// (public.project_formats) renames some of them — a music video's production
// is its "Shoot" — and may skip some; the format's rules arrive with the
// project's progress (project_progress().format), so nothing here knows any
// format by name.

export type Phase = 'development' | 'pre-production' | 'production' | 'post-production' | 'delivery';

export interface PhaseDef { id: Phase; label: string; abbr: string }

/** What a format changes about the five phases (and which milestones don't apply). */
export interface FormatRules {
  phase_labels: Partial<Record<Phase, { label: string; abbr: string }>>;
  skip_phases: Phase[];
  skip_milestones: string[];
}

export function mapStatusToPhase(status?: string): Phase {
  switch (status) {
    case 'concept': return 'development';
    case 'pre-prod':
    case 'pre-production': return 'pre-production';
    case 'production':
    case 'in-production': return 'production';
    case 'post':
    case 'post-production': return 'post-production';
    case 'released':
    case 'completed':
    case 'delivery': return 'delivery';
    default: return 'development';
  }
}

export const PHASES: readonly PhaseDef[] = [
  { id: 'development',     label: 'Development',     abbr: 'DEV'  },
  { id: 'pre-production',  label: 'Pre-Production',  abbr: 'PRE'  },
  { id: 'production',      label: 'Production',      abbr: 'PROD' },
  { id: 'post-production', label: 'Post-Production', abbr: 'POST' },
  { id: 'delivery',        label: 'Delivery',        abbr: 'DEL'  },
];

const PHASE_IDS = new Set<string>(PHASES.map((p) => p.id));

/** Tolerant reader for rules from the database: anything malformed is ignored. */
export function toFormatRules(raw: unknown): FormatRules | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const labels: FormatRules['phase_labels'] = {};
  if (r.phase_labels && typeof r.phase_labels === 'object') {
    for (const [k, v] of Object.entries(r.phase_labels as Record<string, unknown>)) {
      const o = v as { label?: unknown; abbr?: unknown } | null;
      if (!PHASE_IDS.has(k) || !o || typeof o.label !== 'string' || !o.label.trim()) continue;
      labels[k as Phase] = { label: o.label, abbr: typeof o.abbr === 'string' && o.abbr.trim() ? o.abbr : o.label.slice(0, 5).toUpperCase() };
    }
  }
  const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
  return {
    phase_labels: labels,
    // The first and last phase are always there.
    skip_phases: strings(r.skip_phases).filter((p): p is Phase => PHASE_IDS.has(p) && p !== 'development' && p !== 'delivery'),
    skip_milestones: strings(r.skip_milestones),
  };
}

export function phasesFor(format?: FormatRules | null): PhaseDef[] {
  const skip = new Set(format?.skip_phases ?? []);
  return PHASES.filter((p) => !skip.has(p.id)).map((p) => ({ ...p, ...(format?.phase_labels[p.id] ?? {}) }));
}

/** Where `phase` sits among the format's phases; a skipped phase folds into the one before it. */
export function phaseIndexIn(format: FormatRules | null | undefined, phase: Phase): number {
  const visibleIds = phasesFor(format).map((p) => p.id);
  const idx = visibleIds.indexOf(phase);
  if (idx !== -1) return idx;
  const allIds = PHASES.map((p) => p.id);
  for (let i = allIds.indexOf(phase) - 1; i >= 0; i--) {
    const j = visibleIds.indexOf(allIds[i]);
    if (j !== -1) return j;
  }
  return 0;
}

/** The status written to `projects.status` for each phase (read back by mapStatusToPhase). */
export const PHASE_STATUS: Record<Phase, string> = {
  development: 'concept',
  'pre-production': 'pre-production',
  production: 'production',
  'post-production': 'post-production',
  delivery: 'completed',
};
