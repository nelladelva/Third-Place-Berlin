// Demo twin of src/data/me.ts: profile changes and photos stay in this browser; "delete my account" resets the demo.
import type { Lang } from '../../lib/i18n';
import { getState, resetDemo, update } from '../store';
import { ME } from '../view';

const FIELDS: Record<string, string> = { display_name: 'displayName', berlin_since: 'berlinSince', fun_fact: 'funFact',
  avatar_url: 'avatarUrl', welcomed_at: 'welcomedAt', consent_at: 'consentAt' };

export async function saveLocale(lang: Lang): Promise<void> {
  update((s) => { const p = s.profiles.find((x) => x.id === ME); if (p) p.locale = lang; });
}

/** Resize to ≤ 256 px and keep it in the demo store (small JPEG data URL). */
export async function uploadAvatar(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 256 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const url = canvas.toDataURL('image/jpeg', 0.8);
  update((s) => { const p = s.profiles.find((x) => x.id === ME); if (p) p.avatarUrl = url; });
  return url;
}

export async function exportMyData(): Promise<Blob> {
  const s = getState();
  const mine = { profile: s.profiles.find((p) => p.id === ME), circles: s.circleMembers.filter((m) => m.userId === ME),
    messages: s.messages.filter((m) => m.authorId === ME), rsvps: s.rsvps.filter((r) => r.userId === ME), note: 'Demo data only' };
  return new Blob([JSON.stringify(mine, null, 2)], { type: 'application/json' });
}

export async function deleteAccount(): Promise<void> {
  resetDemo();
}

export async function saveProfile(id: string, changes: Record<string, unknown>): Promise<void> {
  update((s) => {
    const p = s.profiles.find((x) => x.id === id) as Record<string, unknown> | undefined;
    if (!p) throw new Error('not_found');
    for (const [k, v] of Object.entries(changes)) p[FIELDS[k] ?? k] = v;
  });
}

export async function savePushSubscription(_s: { endpoint: string; p256dh: string; auth: string }): Promise<boolean> {
  return false; // no real push in the demo
}
