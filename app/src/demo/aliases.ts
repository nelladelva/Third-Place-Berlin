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

/** Vite plugin for the demo build: after an import is resolved to a real file, swap it for its demo twin.
 * (resolve.alias only matches import strings like '../data/session', not the files they point to.) */
export function demoSwap(root: string) {
  const map = demoAliases(root);
  return {
    name: 'tpb-demo-swap',
    enforce: 'pre' as const,
    async resolveId(this: { resolve: (s: string, i?: string, o?: Record<string, unknown>) => Promise<{ id: string } | null> },
      source: string, importer: string | undefined, options: Record<string, unknown>) {
      if (!importer || !(source.startsWith('.') || source.startsWith('/'))) return null; // only the app's own imports
      const r = await this.resolve(source, importer, { ...options, skipSelf: true });
      return r && map[r.id] && importer !== map[r.id] ? map[r.id] : null;
    },
    /** iPhones name a home-screen app from the page head, not the manifest: give the demo its own name. */
    transformIndexHtml(html: string) {
      return html.replace('content="Third Place"', 'content="TPB Demo"').replace('<title>Third Place Berlin</title>', '<title>Third Place Berlin Demo</title>');
    },
  };
}
