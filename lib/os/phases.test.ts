import { describe, it, expect } from 'vitest';
import { mapStatusToPhase, phasesFor, phaseIndexIn } from './phases';

describe('mapStatusToPhase', () => {
  it('maps every status the app writes (lib/supabase/projects DBProject.status)', () => {
    expect(mapStatusToPhase('concept')).toBe('development');
    expect(mapStatusToPhase('pre-production')).toBe('pre-production');
    expect(mapStatusToPhase('in-production')).toBe('production');
    expect(mapStatusToPhase('post-production')).toBe('post-production');
    expect(mapStatusToPhase('completed')).toBe('delivery');
  });

  it('places a skipped phase on the nearest earlier visible one', () => {
    const podcast = { phase_labels: { production: { label: 'Recording', abbr: 'REC' } }, skip_phases: ['pre-production' as const], skip_milestones: [] };
    expect(phasesFor(podcast).map((p) => p.label)).toEqual(['Development', 'Recording', 'Post-Production', 'Delivery']);
    expect(phaseIndexIn(podcast, 'pre-production')).toBe(0);
    expect(phaseIndexIn(podcast, 'post-production')).toBe(2);
  });

  it('without a format, a project has the standard five phases', () => {
    expect(phasesFor(null).map((p) => p.id)).toEqual(['development', 'pre-production', 'production', 'post-production', 'delivery']);
  });
});
