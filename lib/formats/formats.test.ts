import { describe, it, expect } from 'vitest';
import { defaultScriptFormat, findFormat, formatPhases, toProjectFormat } from './core';

const row = (patch: Record<string, unknown> = {}) => toProjectFormat({
  name: 'Music Video', blurb: '', icon: 'music', script_format: 'treatment',
  phase_labels: { production: { label: 'Shoot', abbr: 'SHOOT' } }, skip_phases: ['pre-production'], skip_milestones: [], position: 5,
  ...patch,
} as Parameters<typeof toProjectFormat>[0]);

describe('project formats', () => {
  it('a format decides the phases a project goes through', () => {
    expect(formatPhases(row()).map((p) => p.label)).toEqual(['Development', 'Shoot', 'Post-Production', 'Delivery']);
    expect(formatPhases(null)).toHaveLength(5);
  });

  it('finds a format by name, ignoring case', () => {
    const formats = [row(), row({ name: 'Feature', script_format: 'screenplay' })];
    expect(findFormat(formats, 'feature')?.name).toBe('Feature');
    expect(findFormat(formats, 'Opera')).toBeNull();
    expect(findFormat(formats, null)).toBeNull();
  });

  it('new scripts start in the project’s override, else the format’s script format', () => {
    expect(defaultScriptFormat(row())).toBe('treatment');
    expect(defaultScriptFormat(row(), 'stage-play')).toBe('stage-play');
    expect(defaultScriptFormat(row(), 'haiku')).toBe('treatment');
    expect(defaultScriptFormat(null)).toBe('screenplay');
    expect(defaultScriptFormat(row({ script_format: 'haiku' }))).toBe('screenplay');
  });
});
