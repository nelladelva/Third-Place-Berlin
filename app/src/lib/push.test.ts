import { vi } from 'vitest';
import { subscribeToPush } from './push';

vi.mock('./supabase', () => ({ supabase: { from: vi.fn(), auth: { getSession: vi.fn() } } }));

test('iPhone not installed to home screen needs install first', async () => {
  Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)' });
  Object.defineProperty(navigator, 'standalone', { configurable: true, value: false });
  expect(await subscribeToPush()).toBe('needs_install');
});

test('browsers without push support are unsupported', async () => {
  Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'Mozilla/5.0 (X11; Linux x86_64)' });
  expect(await subscribeToPush()).toBe('unsupported');
});

test('a failed save is reported, not shown as subscribed', async () => {
  vi.resetModules();
  vi.doMock('./supabase', () => ({
    supabase: {
      auth: { getSession: async () => ({ data: { session: { user: { id: 'u1' } } } }) },
      from: () => ({ upsert: async () => ({ error: { message: 'new row violates row-level security policy' } }) }),
    },
  }));
  vi.stubEnv('VITE_VAPID_PUBLIC_KEY', 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U');
  Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'Mozilla/5.0 (X11; Linux x86_64) Chrome' });
  Object.defineProperty(window, 'PushManager', { configurable: true, value: function PushManager() {} });
  Object.defineProperty(window, 'Notification', { configurable: true, value: { requestPermission: async () => 'granted' } });
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { ready: Promise.resolve({ pushManager: { getSubscription: async () => ({ toJSON: () => ({ endpoint: 'e', keys: { p256dh: 'p', auth: 'a' } }) }) } }) },
  });
  const { subscribeToPush } = await import('./push');
  expect(await subscribeToPush()).toBe('failed');
});
