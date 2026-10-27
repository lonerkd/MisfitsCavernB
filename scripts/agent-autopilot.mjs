#!/usr/bin/env node
// Dispatch one owner-approved backlog issue to Copilot, with a dry run by default.
import { execFileSync } from 'node:child_process';

const REPO = process.env.GITHUB_REPOSITORY || 'lonerkd/MisfitsCavernB';
const dispatch = process.argv.includes('--dispatch');
const gh = (args) => execFileSync('gh', args, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
const json = (args) => JSON.parse(gh(args) || '[]');
const names = (items = []) => new Set(items.map((item) => item.name));

export function chooseNextIssue(issues) {
  return issues
    .filter((issue) => {
      const labels = names(issue.labels);
      return labels.has('backlog')
        && labels.has('agent-ready')
        && !labels.has('agent-working')
        && !labels.has('needs-owner')
        && !(issue.assignees || []).length;
    })
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt) || a.number - b.number)[0] || null;
}

export function canDispatch({ activeIssues, agentPullRequests, maxOpen }) {
  return activeIssues < maxOpen && agentPullRequests < maxOpen;
}

function main() {
  const maxOpen = Number(process.env.AGENT_AUTOPILOT_MAX_OPEN_PRS || 1);
  if (!Number.isInteger(maxOpen) || maxOpen < 1 || maxOpen > 100) {
    throw new Error('AGENT_AUTOPILOT_MAX_OPEN_PRS must be an integer from 1 to 100');
  }

  const issues = json([
    'issue', 'list', '--repo', REPO, '--state', 'open', '--label', 'agent-ready',
    '--limit', '100', '--json', 'number,title,labels,assignees,createdAt',
  ]);
  const activeIssues = json([
    'issue', 'list', '--repo', REPO, '--state', 'open', '--label', 'agent-working',
    '--limit', '100', '--json', 'number',
  ]);
  const pullRequests = json([
    'pr', 'list', '--repo', REPO, '--state', 'open', '--limit', '100', '--json', 'headRefName',
  ]);
  const agentPullRequests = pullRequests.filter((pr) => /^(claude|copilot|agent)\//.test(pr.headRefName));

  if (!canDispatch({ activeIssues: activeIssues.length, agentPullRequests: agentPullRequests.length, maxOpen })) {
    console.log(`At capacity: ${activeIssues.length} active issue(s), ${agentPullRequests.length} open agent PR(s), limit ${maxOpen}.`);
    return;
  }

  const issue = chooseNextIssue(issues);
  if (!issue) {
    console.log('No unassigned, owner-approved backlog issue is ready.');
    return;
  }

  if (!dispatch) {
    console.log(`Would assign #${issue.number} ${issue.title} to Copilot. Use --dispatch to assign it.`);
    return;
  }

  gh([
    'issue', 'edit', String(issue.number), '--repo', REPO,
    '--add-assignee', '@copilot', '--add-label', 'agent-working',
  ]);
  console.log(`Assigned #${issue.number} to Copilot.`);
}

if (process.argv[1]?.endsWith('agent-autopilot.mjs')) main();
