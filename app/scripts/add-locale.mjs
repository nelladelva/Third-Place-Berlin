// Merge a JSON fragment {"en": {...}, "de": {...}} into src/locales/*.json (deep merge, sorted top-level keys kept).
import { readFileSync, writeFileSync } from 'node:fs';
const frag = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const merge = (a, b) => { for (const [k, v] of Object.entries(b)) a[k] = v && typeof v === 'object' && !Array.isArray(v) ? merge(a[k] ?? {}, v) : v; return a; };
for (const lang of ['en', 'de']) {
  const f = `src/locales/${lang}.json`;
  writeFileSync(f, JSON.stringify(merge(JSON.parse(readFileSync(f, 'utf8')), frag[lang]), null, 2) + '\n');
}
