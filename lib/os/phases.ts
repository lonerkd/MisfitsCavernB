export type Phase = 'development' | 'pre-production' | 'production' | 'post-production' | 'delivery';

export function mapStatusToPhase(status?: string): Phase {
  switch (status) {
    case 'concept': return 'development';
    case 'pre-prod':
    case 'pre-production': return 'pre-production';
    case 'production': return 'production';
    case 'post':
    case 'post-production': return 'post-production';
    case 'released':
    case 'completed':
    case 'delivery': return 'delivery';
    default: return 'development';
  }
}

const ALL_PHASES: { id: Phase; label: string; abbr: string }[] = [
  { id: 'development',     label: 'Development',     abbr: 'DEV'  },
  { id: 'pre-production',  label: 'Pre-Production',  abbr: 'PRE'  },
  { id: 'production',      label: 'Production',      abbr: 'PROD' },
  { id: 'post-production', label: 'Post-Production', abbr: 'POST' },
  { id: 'delivery',        label: 'Delivery',        abbr: 'DEL'  },
];

const TYPE_PHASE_LABELS: Record<string, Partial<Record<Phase, { label: string; abbr: string }>>> = {
  'Music Video': {
    production: { label: 'Shoot', abbr: 'SHOOT' },
    'post-production': { label: 'Edit', abbr: 'EDIT' },
    delivery: { label: 'Released', abbr: 'OUT' },
  },
  Commercial: {
    production: { label: 'Shoot', abbr: 'SHOOT' },
    delivery: { label: 'Delivered', abbr: 'OUT' },
  },
  Podcast: {
    development: { label: 'Planning', abbr: 'PLAN' },
    production: { label: 'Recording', abbr: 'REC' },
    'post-production': { label: 'Editing', abbr: 'EDIT' },
    delivery: { label: 'Published', abbr: 'OUT' },
  },
  Series: {
    delivery: { label: 'Released', abbr: 'OUT' },
  },
  'Limited Series': {
    delivery: { label: 'Released', abbr: 'OUT' },
  },
};

const TYPE_SKIPPED_PHASES: Record<string, Phase[]> = {
  'Music Video': ['pre-production'],
  Podcast: ['pre-production'],
};

export function getPhasesForType(projectType?: string | null): { id: Phase; label: string; abbr: string }[] {
  const type = projectType || '';
  const skip = new Set(TYPE_SKIPPED_PHASES[type] || []);
  const overrides = TYPE_PHASE_LABELS[type] || {};
  return ALL_PHASES
    .filter(p => !skip.has(p.id))
    .map(p => ({ ...p, ...(overrides[p.id] || {}) }));
}

export function phaseIndexForType(projectType: string | null | undefined, phase: Phase): number {
  const phases = getPhasesForType(projectType);
  const visibleIds = phases.map(p => p.id);
  const idx = visibleIds.indexOf(phase);
  if (idx !== -1) return idx;
  const allIds = ALL_PHASES.map(p => p.id);
  for (let i = allIds.indexOf(phase) - 1; i >= 0; i--) {
    const j = visibleIds.indexOf(allIds[i]);
    if (j !== -1) return j;
  }
  return 0;
}
