import { describe, it, expect } from 'vitest';
import { evaluate, trusted, reviewComment } from '../../scripts/claude-review.mjs';

const H1 = 'a'.repeat(40);
const H2 = 'b'.repeat(40);
const owner = { type: 'User', login: 'lonerkd' };
const c = (body: string, over: Record<string, unknown> = {}) => ({ id: 1, body, user: owner, author_association: 'OWNER', created_at: '2026-11-07T01:00:00Z', ...over });
const mark = (sha: string, verdict: string) => reviewComment(sha, verdict, 'reviewed the diff');

describe('the Claude review check', () => {
  it('is not required for low or medium risk', () => {
    expect(evaluate({ headSha: H1, tier: 'low', comments: [] }).state).toBe('success');
    expect(evaluate({ headSha: H1, tier: 'medium', comments: [] }).state).toBe('success');
  });
  it('a high-risk PR is pending until a trusted review of this exact commit approves', () => {
    expect(evaluate({ headSha: H1, tier: 'high', comments: [] }).state).toBe('pending');
    expect(evaluate({ headSha: H1, tier: 'high', comments: [c(mark(H1, 'approved'))] }).state).toBe('success');
  });
  it('a new push (new head) makes an earlier approval stale', () => {
    const r = evaluate({ headSha: H2, tier: 'high', comments: [c(mark(H1, 'approved'))] });
    expect(r.state).toBe('pending');
    expect(r.description).toMatch(/earlier commit/);
  });
  it('the latest verdict for the head wins', () => {
    const approvedThenChanges = [c(mark(H1, 'approved'), { id: 1, created_at: '2026-11-07T01:00:00Z' }), c(mark(H1, 'changes'), { id: 2, created_at: '2026-11-07T02:00:00Z' })];
    expect(evaluate({ headSha: H1, tier: 'high', comments: approvedThenChanges }).state).toBe('failure');
    const changesThenApproved = [c(mark(H1, 'changes'), { id: 1, created_at: '2026-11-07T01:00:00Z' }), c(mark(H1, 'approved'), { id: 2, created_at: '2026-11-07T02:00:00Z' })];
    expect(evaluate({ headSha: H1, tier: 'high', comments: changesThenApproved }).state).toBe('success');
  });
  it('a bot or a stranger cannot approve, however the marker is written', () => {
    const bot = c(mark(H1, 'approved'), { user: { type: 'Bot', login: 'copilot-pull-request-reviewer[bot]' }, author_association: 'CONTRIBUTOR' });
    const stranger = c(mark(H1, 'approved'), { user: { type: 'User', login: 'x' }, author_association: 'NONE' });
    expect(evaluate({ headSha: H1, tier: 'high', comments: [bot, stranger] }).state).toBe('pending');
  });
  it('a login named in CLAUDE_REVIEW_LOGINS (the worker) can approve', () => {
    const worker = c(mark(H1, 'approved'), { user: { type: 'Bot', login: 'claude[bot]' }, author_association: 'NONE' });
    expect(trusted(worker, ['claude[bot]'])).toBe(true);
    expect(evaluate({ headSha: H1, tier: 'high', comments: [worker], extraTrusted: ['claude[bot]'] }).state).toBe('success');
  });
  it('a marker with a short or malformed sha does not count', () => {
    expect(evaluate({ headSha: H1, tier: 'high', comments: [c('<!-- claude-review:v1 sha=abc verdict=approved -->')] }).state).toBe('pending');
  });
});
