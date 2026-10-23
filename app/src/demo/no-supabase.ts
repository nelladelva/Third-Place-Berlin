// Stands in for lib/supabase in the demo build: the demo never talks to a backend.
export const supabase = new Proxy({}, {
  get() {
    throw new Error('Supabase is not available in the demo');
  },
}) as never;
