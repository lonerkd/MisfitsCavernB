# Session — 2026-10-28: the Claude issue worker pushes through a guarded script

With the denial printer from #350, the worker's third run on test issue #326 showed what the allow-list was refusing: it had written the Archived badge, tests and notes but could not commit or push (a multi-line commit message chained with `git push` was refused, and so was a plain push), could not run `npm run sync-intel` (only `node scripts/sync-intel.js` was listed), and reached for `cat`, `ls`, `python3` and `sed` where its Read, Edit and Grep tools would do.

Widening to `git push:*` would let it push to `main`, so instead: `scripts/agent-push.sh "<one-line message>"` commits everything with the co-author trailer and pushes, and **refuses any branch that is not `claude/*`**. The workflow allows that script and `npm run sync-intel`, and no longer lists raw `git add` / `git commit` / `git push`. The prompt now says to use Read/Edit/Grep/Glob for files and to run `gh issue view` on its own.

**Verified:** the script against a local bare remote — on `main` it exits 1 and pushes nothing; on `claude/demo` it pushes a one-line commit with the trailer and `main` on the remote is unchanged. The real test is re-labelling #326 after the merge.
