import { describe, it, expect } from 'vitest';
import { DEPARTMENT_WORKFLOWS, STAGES, WORKFLOWS, workflowFor, type Workflow } from './workflows';
import { DEPARTMENT_DEFAULTS, TOOLKITS, toolkitFor } from './toolkit';
import { PRODUCTION_VIEWS } from '@/lib/os/progress';

const all: Array<[string, Workflow]> = [...Object.entries(WORKFLOWS), ...Object.entries(DEPARTMENT_WORKFLOWS)];

describe('role workflows', () => {
  it('only name tools that exist', () => {
    for (const [name, w] of all) for (const st of STAGES) for (const step of w.stages[st] ?? []) {
      if (step.tool) expect(PRODUCTION_VIEWS as readonly string[], `${name} › ${st} › ${step.text}`).toContain(step.tool);
    }
  });
  it('have non-empty steps, a receives and a hands, and only the four stages', () => {
    for (const [name, w] of all) {
      expect(Object.keys(w.stages).every((k) => (STAGES as readonly string[]).includes(k)), name).toBe(true);
      expect(Object.values(w.stages).flat().length, name).toBeGreaterThan(2);
      for (const st of Object.values(w.stages)) for (const step of st ?? []) expect(step.text.trim().length, name).toBeGreaterThan(5);
      expect(w.receives.length, `${name} receives`).toBeGreaterThan(0);
      expect(w.hands.length, `${name} hands`).toBeGreaterThan(0);
    }
  });
  it('every craft in the toolkits has a workflow (its own or its department\'s), and the crafts with their own name real crafts', () => {
    for (const craft of Object.keys(WORKFLOWS)) expect(Object.keys(TOOLKITS), `${craft} is not a toolkit craft`).toContain(craft);
    for (const dept of Object.keys(DEPARTMENT_WORKFLOWS)) expect(Object.keys(DEPARTMENT_DEFAULTS), `${dept} is not a toolkit department`).toContain(dept);
    for (const craft of Object.keys(TOOLKITS)) expect(workflowFor(craft, null), craft).toBeTruthy();
  });
  it('a craft with its own workflow has at least one step in a tool of its own suite (the whole catalogue is checked against the database in the integration test)', () => {
    for (const craft of Object.keys(WORKFLOWS)) {
      const kit = toolkitFor(craft);
      if (kit.home) continue; // performers and outside roles work away from the Studio
      const tools = Object.values(WORKFLOWS[craft].stages).flat().map((st) => st?.tool).filter(Boolean);
      expect(tools.some((t) => kit.views.includes(t!)), `${craft}: no step in a tool its suite holds`).toBe(true);
    }
  });
});
