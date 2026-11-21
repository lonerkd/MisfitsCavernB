# Session - 2026-11-21: what the reader knows, shown (BACKLOG 3.21)

`scriptKnowledge` (languages, years, layers, places, what the reader set aside) existed and nothing showed it. The Script tab now has a collapsed *What the reader knows* section (`ScriptKnowledgePanel`, in `ScriptAnalytics`): the languages with who speaks them and how much, the years the headings name and how many times the story jumps back, layers, the eight places the script returns to most, and the cue tags and heading endings the reader did not recognise (so a writer sees what was set aside rather than guessing). It shows only what the script has, and renders nothing for a plain one. Read-only: nothing is written anywhere.

**Verified:** typecheck, eslint, unit tests (editor 92), and `e2e/script-knowledge.spec.ts` (a script with a Spanish speaker and two years: the Script tab lists them) on a production build on the local stack. **Not verified:** a phone; by eye.
