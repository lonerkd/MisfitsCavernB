import { describe, expect, it } from 'vitest';
import { claimedMigration, claimedRouteCount, findFacts, newestMigration, undocumentedWorkflows } from './check-state-facts.mjs';

const state = '2. **Production and staging match `main`** through `20261122000300` (notification timing)';

describe('check-state-facts', () => {
  it('reads the claimed migration', () => expect(claimedMigration(state)).toBe('20261122000300'));
  it('has no claim without the line', () => expect(claimedMigration('nothing')).toBeNull());
  it('finds the newest migration', () => expect(newestMigration(['20261122000100_a.sql', '20261122000700_b.sql', 'README.md'])).toBe('20261122000700'));
  it('lists workflows the doc never names', () => expect(undocumentedWorkflows(['ci.yml', 'sbom.yml'], 'see ci.yml')).toEqual(['sbom.yml']));
  it('reads the route count', () => expect(claimedRouteCount('an iPhone 15 Pro, portrait and landscape, over 29 routes of')).toBe(29));
  it('warns on a stale migration claim, fails on an undocumented workflow', () => {
    const f = findFacts({ stateText: state, migrationFiles: ['20261122000700_b.sql'], workflowFiles: ['sbom.yml'], toolsText: '', baseline: null });
    expect(f.map((x) => x.level).sort()).toEqual(['fail', 'warn']);
  });
  it('is quiet when everything agrees', () => {
    const f = findFacts({ stateText: state, migrationFiles: ['20261122000300_b.sql'], workflowFiles: ['ci.yml'], toolsText: 'ci.yml', baseline: null });
    expect(f).toEqual([]);
  });
});
