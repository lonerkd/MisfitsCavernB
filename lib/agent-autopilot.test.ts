import { describe, expect, it } from 'vitest';
import { canDispatch, chooseNextIssue } from '../scripts/agent-autopilot.mjs';

const issue = (number: number, labels: string[], createdAt: string, assignees: unknown[] = []) => ({
  number,
  title: `Issue ${number}`,
  labels: labels.map((name) => ({ name })),
  createdAt,
  assignees,
});

describe('agent autopilot', () => {
  it('chooses the oldest unassigned issue that is both backlog and owner-approved', () => {
    const issues = [
      issue(4, ['backlog', 'agent-ready'], '2026-10-03T00:00:00Z', [{}]),
      issue(3, ['backlog', 'agent-ready', 'needs-owner'], '2026-10-01T00:00:00Z'),
      issue(2, ['backlog', 'agent-ready'], '2026-10-02T00:00:00Z'),
      issue(1, ['agent-ready'], '2026-10-01T00:00:00Z'),
      issue(5, ['backlog', 'agent-ready', 'agent-working'], '2026-10-01T00:00:00Z'),
    ];

    expect(chooseNextIssue(issues)?.number).toBe(2);
  });

  it('returns no issue when none is eligible', () => {
    expect(chooseNextIssue([issue(1, ['backlog'], '2026-10-01T00:00:00Z')])).toBeNull();
  });

  it('stops at the active-issue or open-agent-PR cap', () => {
    expect(canDispatch({ activeIssues: 0, agentPullRequests: 0, maxOpen: 1 })).toBe(true);
    expect(canDispatch({ activeIssues: 1, agentPullRequests: 0, maxOpen: 1 })).toBe(false);
    expect(canDispatch({ activeIssues: 0, agentPullRequests: 1, maxOpen: 1 })).toBe(false);
  });
});
