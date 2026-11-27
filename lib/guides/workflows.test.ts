import { describe, it, expect } from 'vitest';
import { pickWorkflow, WORKFLOW_BY_ID } from './workflows';
import { STEPS } from './steps';

// The fall-through this file guards: Advertising and Copywriting are shipped
// formats whose projects used to get the short-film guide, because
// pickWorkflow's chain never matched them (audit, Nov 26 2026).
const FILM_SET_STEPS = ['wrap-first', 'wrap-all', 'casting', 'breakdown', 'gear', 'locations'];

describe('pickWorkflow format routing', () => {
  it('gives Advertising its own copy workflow, not the short-film guide', () => {
    const w = pickWorkflow('Advertising', 'some', true);
    expect(w.id).toBe('advertising');
    for (const s of FILM_SET_STEPS) expect(w.steps).not.toContain(s);
  });

  it('gives Copywriting its own copy workflow, not the short-film guide', () => {
    const w = pickWorkflow('Copywriting', 'some', true);
    expect(w.id).toBe('copywriting');
    for (const s of FILM_SET_STEPS) expect(w.steps).not.toContain(s);
  });

  it('keeps Commercial on the commercial (shoot) workflow', () => {
    expect(pickWorkflow('Commercial', 'some', true).id).toBe('commercial');
  });

  it('every step a workflow names exists in the library', () => {
    for (const w of Object.values(WORKFLOW_BY_ID)) {
      for (const id of w.steps) expect(STEPS[id], `${w.id} → ${id}`).toBeTruthy();
    }
  });
});
