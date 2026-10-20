import { describe, expect, it } from 'vitest';
import { assertValidRules, runMigrations, type MigrationRule } from './migrations';

const add = (key: string, value: unknown) => (d: unknown) => ({ ...(d as object), [key]: value });

describe('assertValidRules', () => {
  it('accepts a chain', () => {
    expect(() =>
      assertValidRules({ a: [{ from: 1, to: 2, migrate: (d) => d }, { from: 2, to: 4, migrate: (d) => d }] }),
    ).not.toThrow();
  });
  it('rejects a rule that does not move forward', () => {
    expect(() => assertValidRules({ a: [{ from: 2, to: 2, migrate: (d) => d }] })).toThrow(/forward/);
    expect(() => assertValidRules({ a: [{ from: 3, to: 1, migrate: (d) => d }] })).toThrow(/forward/);
  });
  it('rejects two rules leaving the same version', () => {
    expect(() =>
      assertValidRules({ a: [{ from: 1, to: 2, migrate: (d) => d }, { from: 1, to: 3, migrate: (d) => d }] }),
    ).toThrow(/two rules/);
  });
  it('allows the same from in different namespaces', () => {
    expect(() =>
      assertValidRules({ a: [{ from: 1, to: 2, migrate: (d) => d }], b: [{ from: 1, to: 2, migrate: (d) => d }] }),
    ).not.toThrow();
  });
});

describe('runMigrations', () => {
  const rules: MigrationRule[] = [
    { from: 3, to: 4, migrate: add('d', 4) },
    { from: 1, to: 2, migrate: add('b', 2) },
    { from: 2, to: 3, migrate: add('c', 3) },
  ];

  it('is a no-op when already current', () => {
    expect(runMigrations(rules, { a: 1 }, 4, 4)).toEqual({ ok: true, data: { a: 1 } });
  });
  it('applies steps in version order regardless of array order', () => {
    expect(runMigrations(rules, { a: 1 }, 1, 4)).toEqual({ ok: true, data: { a: 1, b: 2, c: 3, d: 4 } });
  });
  it('starts mid-chain', () => {
    expect(runMigrations(rules, { a: 1 }, 3, 4)).toEqual({ ok: true, data: { a: 1, d: 4 } });
  });
  it('fails when a version has no rule', () => {
    expect(runMigrations([{ from: 1, to: 2, migrate: add('b', 2) }], {}, 1, 3)).toEqual({
      ok: false,
      reason: 'no-path',
      at: 2,
    });
  });
  it('does not overshoot the target', () => {
    expect(runMigrations([{ from: 1, to: 3, migrate: add('x', 1) }], {}, 1, 2)).toEqual({
      ok: false,
      reason: 'no-path',
      at: 1,
    });
  });
  it('reports a throwing step and keeps the input intact', () => {
    const input = { a: 1 };
    const boom: MigrationRule[] = [
      { from: 1, to: 2, migrate: add('b', 2) },
      { from: 2, to: 3, migrate: () => { throw new Error('bad shape'); } },
    ];
    expect(runMigrations(boom, input, 1, 3)).toEqual({ ok: false, reason: 'step-failed', at: 2 });
    expect(input).toEqual({ a: 1 });
  });
});
