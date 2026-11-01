import { describe, expect, it } from 'vitest';
import { aggregate, commentBody, parseArgs, parseMarker, summarize } from '../scripts/agent-run-stats.mjs';

const log = [
  { type: 'system', subtype: 'init', model: 'claude-sonnet-5-5' },
  { type: 'assistant', message: 'working' },
  {
    type: 'result',
    subtype: 'success',
    is_error: false,
    num_turns: 29,
    total_cost_usd: 0.3289944,
    duration_ms: 122939,
    permission_denials: [{ tool_name: 'Bash' }],
  },
];

describe('summarize', () => {
  it('reads the numbers out of the execution log', () => {
    expect(summarize(log)).toEqual({ turns: 29, costUsd: 0.329, durationMs: 122939, denials: 1, failed: false, model: 'claude-sonnet-5-5' });
  });

  it('has nothing to say about a log with no result (a run that died early)', () => {
    expect(summarize([{ type: 'system', subtype: 'init' }])).toBeNull();
    expect(summarize([])).toBeNull();
    expect(summarize(null)).toBeNull();
    expect(summarize({ type: 'result' })).toBeNull();
  });

  it('counts refusals from the count when the list is absent, and marks a failed run', () => {
    const stats = summarize([{ type: 'result', is_error: true, num_turns: 1, permission_denials_count: 3 }]);
    expect(stats).toMatchObject({ denials: 3, failed: true, turns: 1, costUsd: 0, model: null });
  });

  it('turns junk values into zeros instead of throwing', () => {
    const stats = summarize([{ type: 'result', num_turns: 'lots', total_cost_usd: -1, duration_ms: NaN }]);
    expect(stats).toMatchObject({ turns: 0, costUsd: 0, durationMs: 0 });
  });

  it('uses the last result when there are several', () => {
    const stats = summarize([{ type: 'result', num_turns: 1 }, { type: 'result', num_turns: 7 }]);
    expect(stats?.turns).toBe(7);
  });
});

describe('commentBody and parseMarker', () => {
  const stats = summarize(log)!;

  it('reads like a sentence a person can use', () => {
    const body = commentBody(stats, { runUrl: 'https://github.com/o/r/actions/runs/1' });
    expect(body).toContain('**Claude worker run:** 29 turns, 2m 03s, about $0.33 at API prices, 1 tool call refused.');
    expect(body).toContain('[Run log](https://github.com/o/r/actions/runs/1)');
    expect(body).toContain('draws on its usage limits');
  });

  it('says so when a run failed or nothing was refused, and does not pluralise one turn', () => {
    const body = commentBody({ ...stats, failed: true, denials: 0, turns: 1, durationMs: 5000 });
    expect(body).toContain('**Claude worker run (failed):** 1 turn, 5s,');
    expect(body).toContain('nothing refused');
  });

  it('round-trips through the marker', () => {
    expect(parseMarker(commentBody(stats, { runUrl: 'https://x/y' }))).toEqual({
      turns: 29, costUsd: 0.329, durationMs: 122939, denials: 1, failed: false,
    });
  });

  it('never puts "--" inside the HTML comment, which would end it early', () => {
    const marker = /<!--(.*?)-->/s.exec(commentBody(stats, { runUrl: 'https://x/a--b' }))![1];
    expect(marker).not.toContain('--');
  });

  it('ignores comments without a marker or with a broken one', () => {
    expect(parseMarker('just a person talking')).toBeNull();
    expect(parseMarker('<!-- agent-run:{not json} -->')).toBeNull();
    expect(parseMarker(undefined)).toBeNull();
  });

  it('does not trust the numbers in a marker', () => {
    const forged = parseMarker('<!-- agent-run:{"turns":"1e9","costUsd":-5,"durationMs":null,"denials":{},"failed":1} -->');
    expect(forged).toEqual({ turns: 0, costUsd: 0, durationMs: 0, denials: 0, failed: true });
  });
});

describe('aggregate', () => {
  it('adds runs up and averages them', () => {
    const runs = [
      { turns: 30, costUsd: 0.3, durationMs: 1, denials: 1, failed: false },
      { turns: 10, costUsd: 0.1, durationMs: 1, denials: 0, failed: true },
    ];
    expect(aggregate(runs)).toEqual({ runs: 2, failed: 1, turns: 40, costUsd: 0.4, denials: 1, avgTurns: 20, avgCostUsd: 0.2 });
  });

  it('is all zeros for no runs, without dividing by zero', () => {
    expect(aggregate([])).toEqual({ runs: 0, failed: 0, turns: 0, costUsd: 0, denials: 0, avgTurns: 0, avgCostUsd: 0 });
  });
});

describe('parseArgs', () => {
  it('takes the log path alone, which is how the script is documented', () => {
    expect(parseArgs(['out.json'])).toEqual({ file: 'out.json', runUrl: null });
  });

  it('takes the path and the run url in either order', () => {
    expect(parseArgs(['out.json', '--run-url', 'https://x/1'])).toEqual({ file: 'out.json', runUrl: 'https://x/1' });
    expect(parseArgs(['--run-url', 'https://x/1', 'out.json'])).toEqual({ file: 'out.json', runUrl: 'https://x/1' });
  });

  it('does not take the url for the path, and copes with a flag that has no value', () => {
    expect(parseArgs(['--run-url', 'https://x/1'])).toEqual({ file: null, runUrl: 'https://x/1' });
    expect(parseArgs(['out.json', '--run-url'])).toEqual({ file: 'out.json', runUrl: null });
    expect(parseArgs([])).toEqual({ file: null, runUrl: null });
  });
});
