import { describe, it, expect } from 'vitest';
import { mapStatusToPhase, getPhasesForType, phaseIndexForType } from './phases';

describe('mapStatusToPhase', () => {
  it('maps every status the app writes (lib/supabase/projects DBProject.status)', () => {
    expect(mapStatusToPhase('concept')).toBe('development');
    expect(mapStatusToPhase('pre-production')).toBe('pre-production');
    expect(mapStatusToPhase('in-production')).toBe('production');
    expect(mapStatusToPhase('post-production')).toBe('post-production');
    expect(mapStatusToPhase('completed')).toBe('delivery');
  });

  it('places a skipped phase on the nearest earlier visible one', () => {
    expect(getPhasesForType('Podcast').some((p) => p.id === 'pre-production')).toBe(false);
    expect(phaseIndexForType('Podcast', 'pre-production')).toBe(0);
  });
});
