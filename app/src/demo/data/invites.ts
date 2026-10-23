// Demo twin of src/data/invites.ts: invite links point at the demo, and the demo never touches the real app's keys.
import type { JoinStatus, MyInvite } from '../../data/invites';
import { baseFor } from '../../pwa-manifest';
import { update } from '../store';
import { ME, state, when } from '../view';

export type { JoinStatus, MyInvite };
export const INVITE_KEY = 'tpb-demo:invite';

export function rememberInvite(code: string): void {
  try { sessionStorage.setItem(INVITE_KEY, code.trim().toLowerCase()); } catch { /* storage unavailable */ }
}
export function rememberedInvite(): string | null {
  try { return sessionStorage.getItem(INVITE_KEY); } catch { return null; }
}
export function forgetInvite(): void {
  try { sessionStorage.removeItem(INVITE_KEY); } catch { /* storage unavailable */ }
}

/** Accepts a full invite link (…#/join/<code>) or a bare code. */
export function parseInvite(input: string): string | null {
  const m = input.trim().toLowerCase().match(/([a-z0-9]{10})\s*$/);
  return m ? m[1] : null;
}

export async function redeemInvite(_code: string, _displayName: string): Promise<'member' | 'pending' | 'removed'> {
  return 'member';
}

export async function myJoinStatus(): Promise<JoinStatus | null> {
  return { status: 'member', vouches: 0, required: state().settings.vouchesRequired, invited_by_name: null };
}

export function inviteUrl(code: string): string {
  return `${location.origin}${baseFor('demo')}#/join/${code}`;
}

export async function createInvite(): Promise<{ code: string; url: string }> {
  const code = Array.from({ length: 10 }, () => 'abcdefghijkmnpqrstuvwxyz23456789'[Math.floor(Math.random() * 32)]).join('');
  const now = new Date();
  update((s) => s.invites.push({ code, createdBy: ME, createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 14 * 24 * 3600 * 1000).toISOString(), used: false, sample: false }));
  return { code, url: inviteUrl(code) };
}

export async function listMyInvites(): Promise<MyInvite[]> {
  return state().invites.filter((i) => i.createdBy === ME).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 20)
    .map((i) => ({ code: i.code, url: inviteUrl(i.code), createdAt: when(i.createdAt, i.sample), expiresAt: when(i.expiresAt, i.sample), used: i.used }));
}
