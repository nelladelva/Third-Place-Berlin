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
