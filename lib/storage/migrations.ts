/**
 * Cache migrations: pure, so they can be tested without IndexedDB.
 *
 * A namespace's rules form a chain. Each rule moves data from exactly one
 * version to a later one, and a namespace has at most one rule per `from`
 * version, so the path from any version to the current one is unambiguous.
 * `assertValidRules` enforces both at load time.
 */

export interface MigrationRule {
  from: number;
  to: number;
  migrate: (data: unknown) => unknown;
}

export type MigrationTable = Record<string, MigrationRule[]>;

export type MigrationResult =
  | { ok: true; data: unknown }
  | { ok: false; reason: 'no-path' | 'step-failed'; at: number };

export function assertValidRules(table: MigrationTable): void {
  for (const [namespace, rules] of Object.entries(table)) {
    const seen = new Set<number>();
    for (const r of rules) {
      if (!Number.isInteger(r.from) || !Number.isInteger(r.to) || r.to <= r.from) {
        throw new Error(`cache migrations "${namespace}": ${r.from} -> ${r.to} must move forward`);
      }
      if (seen.has(r.from)) {
        throw new Error(`cache migrations "${namespace}": two rules start at version ${r.from}`);
      }
      seen.add(r.from);
    }
  }
}

/**
 * Walk `data` from `from` up to `to`, one rule at a time. Fails (never throws)
 * if a version has no rule leaving it, a rule overshoots `to`, or a step throws;
 * `at` is the version the walk stopped on. The input is not mutated by this
 * function; rules must return the new shape rather than edit their argument.
 */
export function runMigrations(
  rules: MigrationRule[],
  data: unknown,
  from: number,
  to: number,
): MigrationResult {
  let version = from;
  let current = data;
  while (version < to) {
    const step = rules.find(r => r.from === version);
    if (!step || step.to > to) return { ok: false, reason: 'no-path', at: version };
    try {
      current = step.migrate(current);
    } catch {
      return { ok: false, reason: 'step-failed', at: version };
    }
    version = step.to;
  }
  return { ok: true, data: current };
}
