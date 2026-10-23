// Fails the build if the demo leaks into the real app, or the Supabase client leaks into the demo.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const files = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? files(p) : /\.(js|html|webmanifest)$/.test(f) ? [p] : [];
});
const hits = (dir, re) => files(dir).filter((f) => re.test(readFileSync(f, 'utf8')));

let failed = false;
if (existsSync('dist')) {
  const bad = hits('dist', /Tempelhof picnic|tpb-demo:|demo-you|Amara Okafor/);
  if (bad.length) { console.error('Demo code or sample data in the real app:', bad); failed = true; }
  else console.log('dist: no demo code or sample data ✓');
}
if (existsSync('dist-demo')) {
  const bad = hits('dist-demo', /supabase\.co|realtime-js|postgrest|GoTrueClient/);
  if (bad.length) { console.error('Supabase client in the demo:', bad); failed = true; }
  else console.log('dist-demo: no Supabase client ✓');
}
process.exit(failed ? 1 : 0);
