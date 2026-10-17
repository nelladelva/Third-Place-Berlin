import { supabase } from './supabase';

export type PushResult = 'subscribed' | 'denied' | 'unsupported' | 'needs_install' | 'failed';

const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent);
const isStandalone = () =>
  (navigator as Navigator & { standalone?: boolean }).standalone === true || window.matchMedia?.('(display-mode: standalone)').matches;

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

/** Ask permission and store this device's push subscription. iPhones must install the app to the home screen first. */
export async function subscribeToPush(): Promise<PushResult> {
  if (isIOS() && !isStandalone()) return 'needs_install';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported';
  const key = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!key) return 'unsupported';
  if ((await Notification.requestPermission()) !== 'granted') return 'denied';
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) }));
  const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  const { data } = await supabase.auth.getSession();
  const { error } = await supabase.from('push_subscriptions').upsert(
    { user_id: data.session?.user.id, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth },
    { onConflict: 'endpoint' });
  return error ? 'failed' : 'subscribed';
}
