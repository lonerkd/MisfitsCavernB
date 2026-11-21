// What a workflow step can honestly say about itself. A step that happens in a tool is READY when that tool holds real data: a record
// tool has at least one record, a project-wide tool has its signal above zero. A tool with no clear evidence (paperwork, the on-set
// views, reports ...) has none: its step shows no tick at all, never a guessed one. Pure: the caller loads the counts.
import type { ProductionView, ProjectSignals } from '@/lib/os/progress';
import { recordKindOfView } from '@/lib/studio/records-print';
import type { Stage, Workflow, WorkflowStep } from './workflows';

export type StepEvidence = { kind: 'records'; recordKind: string } | { kind: 'signal'; key: keyof ProjectSignals } | null;

/** Views whose data lives in the project itself, not in the record tools, and the signal that says it holds something. */
const SIGNAL_VIEWS: Partial<Record<ProductionView, keyof ProjectSignals>> = {
  breakdown: 'breakdown_elements',
  schedule: 'call_sheets',
  shots: 'shots',
  crew: 'crew_confirmed',
  money: 'budget_lines',
  locations: 'locations',
  revisions: 'revisions',
  cast: 'castings',
};

export function stepEvidence(tool: ProductionView): StepEvidence {
  const recordKind = recordKindOfView(tool);
  if (recordKind) return { kind: 'records', recordKind };
  const key = SIGNAL_VIEWS[tool];
  return key ? { kind: 'signal', key } : null;
}

export interface ReadinessEvidence { signals: ProjectSignals | null; recordCounts: Record<string, number> }
export interface StepReadiness { step: WorkflowStep; /** null = no evidence either way (or not loaded yet): show no tick. */ done: boolean | null }

export function stepDone(step: WorkflowStep, ev: ReadinessEvidence): boolean | null {
  if (!step.tool) return null;
  const e = stepEvidence(step.tool);
  if (!e) return null;
  if (e.kind === 'records') {
    const n = ev.recordCounts[e.recordKind];
    return typeof n === 'number' ? n >= 1 : null;
  }
  if (!ev.signals) return null;
  // A step about ISSUING a call sheet is not done by a sheet that is only dated: it waits for one that was issued.
  const key = step.tool === 'schedule' && /\bissue/i.test(step.text) ? 'call_sheets_issued' : e.key;
  const v = ev.signals[key];
  return typeof v === 'number' ? v >= 1 : null;
}

export function readiness(workflow: Workflow, stage: Stage, ev: ReadinessEvidence): StepReadiness[] {
  return (workflow.stages[stage] ?? []).map((step) => ({ step, done: stepDone(step, ev) }));
}

/** The record kinds a workflow's steps need counted (only those the viewer's steps use). */
export function recordKindsNeeded(workflow: Workflow, stages: readonly Stage[]): string[] {
  const out = new Set<string>();
  for (const st of stages) for (const step of workflow.stages[st] ?? []) {
    const e = step.tool ? stepEvidence(step.tool) : null;
    if (e?.kind === 'records') out.add(e.recordKind);
  }
  return [...out];
}

/** "n of m ready" over the steps that have evidence; null when none do or nothing is loaded. */
export function readySummary(rows: StepReadiness[]): { ready: number; total: number } | null {
  const known = rows.filter((r) => r.done !== null);
  return known.length ? { ready: known.filter((r) => r.done).length, total: known.length } : null;
}
