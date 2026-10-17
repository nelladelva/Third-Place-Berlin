import { vi } from 'vitest';

const calls = vi.hoisted(() => ({ deleted: [] as unknown[], signOut: vi.fn(), unsubscribe: vi.fn() }));
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: { signOut: calls.signOut },
    from: (table: string) => ({ delete: () => ({ eq: (col: string, val: string) => { calls.deleted.push([table, col, val]); return Promise.resolve({ error: null }); } }) }),
  },
}));

test('logging out removes this device\'s push subscription first', async () => {
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { getRegistration: async () => ({ pushManager: { getSubscription: async () => ({ endpoint: 'https://push.example/abc', unsubscribe: calls.unsubscribe }) } }) },
  });
  const { signOut } = await import('./session');
  await signOut();
  expect(calls.deleted).toContainEqual(['push_subscriptions', 'endpoint', 'https://push.example/abc']);
  expect(calls.unsubscribe).toHaveBeenCalled();
  expect(calls.signOut).toHaveBeenCalled();
});
