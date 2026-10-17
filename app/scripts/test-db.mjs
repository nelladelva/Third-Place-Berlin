// Runs the SQL test suite on a fresh local database `tpb_test`.
// Order: supabase/test/auth_stub.sql → supabase/migrations/*.sql → supabase/seed.sql → supabase/test/helpers.sql
// → each supabase/test/*.test.sql in its own transaction (rolled back).
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'supabase');
const DB = 'tpb_test';
const only = process.argv[2];

const admin = new pg.Client({ database: 'postgres' });
await admin.connect();
await admin.query(`drop database if exists ${DB} with (force)`);
await admin.query(`create database ${DB}`);
await admin.end();

const db = new pg.Client({ database: DB });
await db.connect();
let passed = 0;
db.on('notice', (n) => {
  if (n.message.startsWith('ok: ')) passed++;
});

async function run(file, label) {
  try {
    await db.query(readFileSync(file, 'utf8'));
  } catch (e) {
    console.error(`\n✗ ${label}\n  ${e.message}${e.where ? `\n  at ${e.where.split('\n')[0]}` : ''}`);
    await db.end();
    process.exit(1);
  }
}

await run(join(root, 'test/auth_stub.sql'), 'auth_stub.sql');
for (const f of readdirSync(join(root, 'migrations')).filter((f) => f.endsWith('.sql')).sort()) {
  await run(join(root, 'migrations', f), `migration ${f}`);
}
if (existsSync(join(root, 'seed.sql'))) await run(join(root, 'seed.sql'), 'seed.sql');
await run(join(root, 'test/helpers.sql'), 'helpers.sql');

const tests = readdirSync(join(root, 'test')).filter((f) => f.endsWith('.test.sql') && (!only || f.includes(only))).sort();
for (const f of tests) {
  const before = passed;
  await db.query('begin');
  await run(join(root, 'test', f), f);
  await db.query('rollback');
  console.log(`✓ ${f} (${passed - before} assertions)`);
}
console.log(`\nSQL tests: ${tests.length} files, ${passed} assertions passed`);
await db.end();
