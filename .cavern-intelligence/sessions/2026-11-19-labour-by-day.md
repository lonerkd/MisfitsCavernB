# Session - 2026-11-19: labour on each shoot day (BACKLOG 3.18, graph step 5)

Breakdown › Cost by day now says, under each dated shoot day, **what labour was logged on it**: approved hours at their rate (the money tool's rule), hours still waiting for approval, and approved hours with no rate. `labourByDay` (`lib/studio/money.ts`) joins timesheet dates to the shoot days' dates; days with no date have none. It reads what the viewer is allowed to read (the owner and leads see everyone's hours, a crew member only their own: unchanged rules, no new access).

**Decision (mine):** it reports hours people logged, not a forecast. A forecast from who is *called* on a day needs a day rate per crew member, which the suite does not hold; that is a data decision for the owner (BACKLOG 3.18 says so), not something to invent.

**Verified:** typecheck, unit tests (`lib/studio/money.test.ts`: approved at rate, pending and unrated kept apart, a rejected entry and an undated day ignored), and `e2e/breakdown-cost.spec.ts` (the day card shows "Labour logged: $250 approved (10 h) · 4 h waiting for approval", with hours logged and approved by the owner and another person's as the database rules require) on a production build on the local stack. **Not verified:** a phone; a crew member's own view (it shows only their hours).
