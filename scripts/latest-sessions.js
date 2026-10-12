#!/usr/bin/env node
// Prints the newest session notes (.cavern-intelligence/sessions/*.md) so a
// session starts knowing what the last few PRs did. Used by the SessionStart
// hook in .claude/settings.json. Usage: node scripts/latest-sessions.js [n]

const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', '.cavern-intelligence', 'sessions');
const n = Math.max(1, Number(process.argv[2]) || 3);

if (!fs.existsSync(DIR)) process.exit(0);
const files = fs.readdirSync(DIR).filter((f) => /^\d{4}-\d{2}-\d{2}-.+\.md$/.test(f)).sort().reverse().slice(0, n);
if (!files.length) process.exit(0);

console.log(`Latest session notes (newest first; more in .cavern-intelligence/sessions/):\n`);
for (const f of files) {
  console.log(`--- ${f} ---\n${fs.readFileSync(path.join(DIR, f), 'utf8').trim()}\n`);
}
