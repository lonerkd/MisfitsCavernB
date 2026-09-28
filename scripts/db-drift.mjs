#!/usr/bin/env node
// Schema drift check.
//
// supabase/schema.fingerprint is the committed, reviewable snapshot of the
// schema the migrations produce (one canonical line per table column,
// constraint, index, policy, function, grant, trigger, view, bucket, …; see
// supabase/fingerprint.sql). It must always equal what the migrations build.
//
//   npm run db:drift                 local DB (after `supabase db reset`) vs snapshot
//   npm run db:drift -- --update     rewrite the snapshot from the local DB
//   DRIFT_TARGET_DB_URL=… npm run db:drift -- --target
//                                    a deployed DB (e.g. production) vs snapshot
//
// Exit 1 on any difference, printing exactly which lines differ.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SNAPSHOT = path.join(root, 'supabase', 'schema.fingerprint');
const QUERY = readFileSync(path.join(root, 'supabase', 'fingerprint.sql'), 'utf8');
const LOCAL_DB_URL = process.env.SUPABASE_DB_URL_LOCAL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

const args = new Set(process.argv.slice(2));

async function fingerprint(url) {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    const { rows } = await client.query(QUERY);
    return rows.map((r) => r.line);
  } finally {
    await client.end();
  }
}

function diff(expected, actual) {
  const want = new Set(expected);
  const got = new Set(actual);
  return {
    missing: expected.filter((l) => !got.has(l)),
    unexpected: actual.filter((l) => !want.has(l)),
  };
}

async function main() {
  const targetMode = args.has('--target');
  const url = targetMode ? process.env.DRIFT_TARGET_DB_URL : LOCAL_DB_URL;
  if (!url) {
    console.error('DRIFT_TARGET_DB_URL is not set.');
    process.exit(2);
  }
  const label = targetMode ? 'target database' : 'local database (built from supabase/migrations)';
  const lines = await fingerprint(url);

  if (args.has('--update')) {
    if (targetMode) {
      console.error('--update only writes from the local database; the snapshot must come from the migrations.');
      process.exit(2);
    }
    writeFileSync(SNAPSHOT, lines.join('\n') + '\n');
    console.log(`Wrote ${lines.length} lines to supabase/schema.fingerprint`);
    return;
  }

  if (!existsSync(SNAPSHOT)) {
    console.error('supabase/schema.fingerprint is missing — run `npm run db:drift -- --update`.');
    process.exit(2);
  }
  const snapshot = readFileSync(SNAPSHOT, 'utf8').split('\n').filter(Boolean);
  const { missing, unexpected } = diff(snapshot, lines);

  if (missing.length === 0 && unexpected.length === 0) {
    console.log(`No drift: ${label} matches supabase/schema.fingerprint (${lines.length} objects).`);
    return;
  }

  console.error(`Schema drift: ${label} differs from supabase/schema.fingerprint.\n`);
  for (const l of missing) console.error(`- ${l}`);
  for (const l of unexpected) console.error(`+ ${l}`);
  console.error(
    targetMode
      ? '\n(-) in the repo but not in the target, (+) in the target but not in the repo. Someone changed the target outside a migration, or a migration was not applied.'
      : '\n(-) in the snapshot, (+) built by the migrations. If a migration changed the schema on purpose, run `npm run db:drift -- --update` and commit the snapshot.',
  );
  process.exit(1);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(2);
});
