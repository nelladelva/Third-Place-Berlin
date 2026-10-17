import { supabase } from '../lib/supabase';

export const INVITE_KEY = 'tpb.invite';

export function rememberInvite(code: string): void {
  sessionStorage.setItem(INVITE_KEY, code.trim().toLowerCase());
}
export function rememberedInvite(): string | null {
  return sessionStorage.getItem(INVITE_KEY);
}
export function forgetInvite(): void {
  sessionStorage.removeItem(INVITE_KEY);
}

/** Accepts a full invite link (…#/join/<code>) or a bare code. */
export function parseInvite(input: string): string | null {
  const m = input.trim().toLowerCase().match(/([a-z0-9]{10})\s*$/);
  return m ? m[1] : null;
}

export async function redeemInvite(code: string, displayName: string): Promise<'member' | 'pending' | 'removed'> {
  const { data, error } = await supabase.rpc('redeem_invite', { p_code: code, p_display_name: displayName });
  if (error) throw new Error(error.message.includes('invite_invalid') ? 'invite_invalid' : error.message);
  return data as 'member' | 'pending' | 'removed';
}

export type JoinStatus = { status: string; vouches: number; required: number; invited_by_name: string | null };

export async function myJoinStatus(): Promise<JoinStatus | null> {
  const { data } = await supabase.rpc('my_join_status');
  return (data as JoinStatus) ?? null;
}

export function inviteUrl(code: string): string {
  return `${location.origin}${import.meta.env.BASE_URL}#/join/${code}`;
}

export async function createInvite(): Promise<{ code: string; url: string }> {
  const { data, error } = await supabase.rpc('create_invite');
  if (error) throw new Error(error.message);
  return { code: data as string, url: inviteUrl(data as string) };
}

export type MyInvite = { code: string; url: string; createdAt: string; expiresAt: string; used: boolean };
export async function listMyInvites(): Promise<MyInvite[]> {
  const { data: s } = await supabase.auth.getSession();
  const { data } = await supabase.from('invites').select('code, created_at, expires_at, used_by')
    .eq('inviter_id', s.session?.user.id ?? '').eq('kind', 'personal').order('created_at', { ascending: false }).limit(20);
  return (data ?? []).map((r: Record<string, unknown>) => ({ code: r.code as string, url: inviteUrl(r.code as string),
    createdAt: r.created_at as string, expiresAt: r.expires_at as string, used: !!r.used_by }));
}
