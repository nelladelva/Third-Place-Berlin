// Demo build (vite --mode demo): every data module, the Supabase client and the demo slot are swapped for their
// demo twins. The real build never resolves anything under src/demo/data, so no demo code ships in the real app.
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

export function demoAliases(root: string, dataDir = join(root, 'src', 'data')): Record<string, string> {
  const names = readdirSync(dataDir).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'));
  const map: Record<string, string> = {};
  for (const f of names) map[`${root}/src/data/${f}`] = `${root}/src/demo/data/${f}`;
  map[`${root}/src/lib/supabase.ts`] = `${root}/src/demo/no-supabase.ts`;
  map[`${root}/src/demo/slot.tsx`] = `${root}/src/demo/slot.demo.tsx`;
  return map;
}
