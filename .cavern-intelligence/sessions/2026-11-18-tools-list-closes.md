# Session - 2026-11-18: choosing a tool closes the list

In Production, picking a tool from the "All tools" list now closes the list (and clears the "Find a tool" search that opened it), so the tool is on screen instead of a scroll below the list. Tools picked from "Your tools" or "Recently used" never opened the list, so they are unchanged. `e2e/crew-records.spec.ts` asserts the list is closed after the pick (not run here). Verified: typecheck. **Left:** the same on a phone, where the list sits above a long tool, may also want the page to scroll to the tool's top.
