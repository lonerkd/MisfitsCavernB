import { describe, it, expect } from 'vitest';
import { EMPTY_SIGNALS, type ProjectSignals } from './progress';
import { matchesQuery, readinessOf, sortProjects, type BoardCard } from './board';

const signals = (patch: Partial<ProjectSignals> = {}): ProjectSignals => ({ ...EMPTY_SIGNALS, status: 'concept', project_type: 'Feature', ...patch });

const card = (title: string, patch: Partial<BoardCard> = {}): BoardCard => ({
  title, description: '', type: 'Feature', team: [], createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
  deadline: null, readiness: null, ...patch,
});

describe('a card’s readiness', () => {
  it('is the current phase’s milestones and the first step left', () => {
    expect(readinessOf(signals())).toMatchObject({ phaseLabel: 'Development', done: 0, total: 5, next: 'Write the logline' });
    expect(readinessOf(signals({ logline: true, scripts: 1 }))).toMatchObject({ done: 2, next: 'Build a character' });
  });

  it('follows the phase, and says nothing without signals', () => {
    expect(readinessOf(signals({ status: 'post-production', cuts: 1 }))).toMatchObject({ phaseLabel: 'Post-Production', done: 1, next: 'Review it with notes' });
    expect(readinessOf(undefined)).toBeNull();
  });

  it('measures the whole project for "furthest along"', () => {
    const early = readinessOf(signals())!.overall;
    const later = readinessOf(signals({ logline: true, scripts: 1, characters: 1, beats: 3, media: 5, crew: 1 }))!.overall;
    expect(early).toBe(0);
    expect(later).toBeGreaterThan(early);
  });
});

describe('sorting the board', () => {
  const a = card('beta', { updatedAt: '2026-03-01T00:00:00Z', createdAt: '2026-01-02T00:00:00Z', deadline: '2026-12-01' });
  const b = card('Alpha', { updatedAt: '2026-02-01T00:00:00Z', createdAt: '2026-01-03T00:00:00Z', readiness: { phaseLabel: 'Development', done: 3, total: 5, next: null, overall: 0.4 } });
  const c = card('gamma', { updatedAt: '2026-04-01T00:00:00Z', createdAt: '2026-01-01T00:00:00Z', deadline: '2026-10-01', readiness: { phaseLabel: 'Development', done: 1, total: 5, next: null, overall: 0.1 } });
  const titles = (list: BoardCard[]) => list.map((x) => x.title);

  it('by activity, age, title, end date and progress', () => {
    expect(titles(sortProjects([a, b, c], 'updated'))).toEqual(['gamma', 'beta', 'Alpha']);
    expect(titles(sortProjects([a, b, c], 'created'))).toEqual(['Alpha', 'beta', 'gamma']);
    expect(titles(sortProjects([a, b, c], 'title'))).toEqual(['Alpha', 'beta', 'gamma']);
    // No end date goes last.
    expect(titles(sortProjects([a, b, c], 'deadline'))).toEqual(['gamma', 'beta', 'Alpha']);
    expect(titles(sortProjects([a, b, c], 'progress'))).toEqual(['Alpha', 'gamma', 'beta']);
  });

  it('leaves the input alone', () => {
    const list = [a, b, c];
    sortProjects(list, 'title');
    expect(titles(list)).toEqual(['beta', 'Alpha', 'gamma']);
  });
});

describe('searching the board', () => {
  const p = card('Femme Fatale', { description: 'A noir about a singer who lies.', type: 'Short', team: ['jordan', 'sam'] });

  it('matches every word anywhere — title, logline, format, people — in any case', () => {
    expect(matchesQuery(p, '')).toBe(true);
    expect(matchesQuery(p, '  ')).toBe(true);
    expect(matchesQuery(p, 'femme')).toBe(true);
    expect(matchesQuery(p, 'NOIR short')).toBe(true);
    expect(matchesQuery(p, 'jordan singer')).toBe(true);
    expect(matchesQuery(p, 'noir western')).toBe(false);
  });
});
