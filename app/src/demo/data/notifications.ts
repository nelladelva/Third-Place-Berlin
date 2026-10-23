// Demo twin of src/data/notifications.ts: notices appear in the in-app inbox only (no push in the demo).
import type { Notification, Prefs } from '../../data/notifications';
import { update } from '../store';
import { ME, state, useStore, when } from '../view';

export type { Notification, Prefs };
export const DEFAULT_PREFS: Prefs = { meetupsPolls: true, mentions: true, everyMessage: false };

export async function listNotifications(): Promise<Notification[]> {
  return state().notifications.filter((n) => n.userId === ME)
    .map((n) => ({ id: n.id, kind: n.kind, data: n.data, createdAt: when(n.createdAt, n.sample), read: n.read }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 40);
}

export async function markAllRead(): Promise<void> {
  update((s) => s.notifications.forEach((n) => { if (n.userId === ME) n.read = true; }));
}

export function useUnreadCount(): number {
  return useStore(() => state().notifications.filter((n) => n.userId === ME && !n.read).length);
}

export async function getAllPrefs(): Promise<Record<string, Prefs>> {
  return Object.fromEntries(state().notificationPrefs.map(({ circleId, ...p }) => [circleId, p]));
}

export async function setPrefs(circleId: string, p: Prefs): Promise<void> {
  update((s) => {
    s.notificationPrefs = s.notificationPrefs.filter((x) => x.circleId !== circleId);
    s.notificationPrefs.push({ circleId, ...p });
  });
}
