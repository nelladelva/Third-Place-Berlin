import { supabase } from '../lib/supabase';
import type { Lang } from '../lib/i18n';

async function uid(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error('not_authenticated');
  return data.session.user.id;
}

export async function saveLocale(lang: Lang): Promise<void> {
  await supabase.from('profiles').update({ locale: lang }).eq('id', await uid());
}

/** Resize to ≤ 512 px JPEG in the browser, upload to avatars/<uid>.jpg, store the public URL on the profile. */
export async function uploadAvatar(file: File): Promise<string> {
  const id = await uid();
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 512 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob: Blob = await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('encode'))), 'image/jpeg', 0.85));
  const { error } = await supabase.storage.from('avatars').upload(`${id}.jpg`, blob, { upsert: true, contentType: 'image/jpeg' });
  if (error) throw new Error(error.message);
  const url = `${supabase.storage.from('avatars').getPublicUrl(`${id}.jpg`).data.publicUrl}?v=${Date.now()}`;
  const { error: saveError } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', id);
  if (saveError) throw new Error(saveError.message);
  return url;
}

export async function exportMyData(): Promise<Blob> {
  const { data, error } = await supabase.rpc('export_my_data');
  if (error) throw new Error(error.message);
  return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
}

export async function deleteAccount(): Promise<void> {
  const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
  if (error) throw new Error(error.message);
  await supabase.auth.signOut();
}

/** Update my profile row (welcome flow and profile edit). Throws on error. */
export async function saveProfile(id: string, update: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from('profiles').update(update).eq('id', id);
  if (error) throw new Error(error.message);
}

/** Store this device's push subscription. Returns false on error. */
export async function savePushSubscription(s: { endpoint: string; p256dh: string; auth: string }): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  const { error } = await supabase.from('push_subscriptions').upsert(
    { user_id: data.session?.user.id, endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth },
    { onConflict: 'endpoint' });
  return !error;
}
