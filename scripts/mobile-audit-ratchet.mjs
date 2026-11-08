// The phone audit's ratchet: a route may not get worse than scripts/mobile-audit-baseline.json (the numbers only shrink).

/** Ids in a route (a project, a script) differ every run: the baseline keys them as <id>. */
export const normRoute = (route) => route.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, '<id>');

/** One audited route view → the numbers the ratchet holds. */
export const metrics = (r) => ({
  wide: r.counts?.wide ?? 0, small: r.counts?.small ?? 0, tiny: r.counts?.tiny ?? 0, underBar: r.counts?.hiddenUnderBar ?? 0,
  sideways: r.scrollsSideways ? 1 : 0,
  keyboardHidesField: r.keyboard?.focused && !r.keyboard.inView ? 1 : 0,
  keyboardHidesAction: r.keyboard?.actionInView === false ? 1 : 0,
  error: r.error ? 1 : 0,
});

/** `worse`: every number above its baseline (a view or number the baseline lacks is allowed 0). `better`: views with a number below it. */
export function compareToBaseline(current, base) {
  const worse = [];
  for (const [key, m] of Object.entries(current)) {
    for (const [name, value] of Object.entries(m)) {
      const allowed = base[key]?.[name] ?? 0;
      if (value > allowed) worse.push(`${key}: ${name} ${value} (allowed ${allowed})`);
    }
  }
  const better = Object.entries(current).filter(([key, m]) => Object.entries(m).some(([n, v]) => v < (base[key]?.[n] ?? 0))).length;
  return { worse, better };
}
