import { describe, expect, it } from 'vitest';
import { targetHref } from './reports';

describe('targetHref', () => {
  it('points at a job or a profile, and at nothing for a message', () => {
    expect(targetHref('job', 'abc')).toBe('/jobs/abc');
    expect(targetHref('profile', 'abc')).toBe('/crew/abc');
    expect(targetHref('message', 'abc')).toBeNull();
  });
});
