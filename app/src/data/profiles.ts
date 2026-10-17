import { supabase } from '../lib/supabase';
import type { PersonCard } from '../lib/people';

export type ProfileView = PersonCard & { berlinSince: string | null; funFact: string | null; circles: { id: string; name: string; emoji: string | null }[] };
export type PendingCard = { id: string; displayName: string; field: string | null; origin: string | null; bio: string | null;
  invitedByName: string | null; vouches: number; required: number; iVouched: boolean };
export type MyCircle = { id: string; name: string; emoji: string | null; visibility: 'open' | 'closed' };

function check<T>({ data, error }: { data: T; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data;
}
async function me(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}
const toCard = (r: Record<string, unknown>): PersonCard => ({
  id: r.id as string, displayName: r.display_name as string, field: (r.field as string) ?? null, origin: (r.origin as string) ?? null,
  languages: (r.languages as string[]) ?? [], teach: (r.teach as string[]) ?? [], learn: (r.learn as string[]) ?? [],
  avatarUrl: (r.avatar_url as string) ?? null, approvedAt: (r.approved_at as string) ?? null, bio: (r.bio as string) ?? null,
});
const CARD_COLS = 'id, display_name, field, origin, languages, teach, learn, avatar_url, approved_at, bio';

export async function listPeople(): Promise<PersonCard[]> {
  const rows = check(await supabase.from('profiles').select(CARD_COLS).eq('status', 'member').order('display_name')) ?? [];
  return rows.map(toCard);
}

export async function getProfile(id: string): Promise<ProfileView | null> {
  const r = check(await supabase.from('profiles').select(`${CARD_COLS}, berlin_since, fun_fact`).eq('id', id).maybeSingle());
  if (!r) return null;
  const cm = check(await supabase.from('circle_members').select('circles(id, name, emoji)').eq('user_id', id)) ?? [];
  return {
    ...toCard(r), berlinSince: (r.berlin_since as string) ?? null, funFact: (r.fun_fact as string) ?? null,
    circles: cm.map((x: Record<string, unknown>) => x.circles as { id: string; name: string; emoji: string | null }).filter(Boolean),
  };
}

export async function myCircles(): Promise<MyCircle[]> {
  const rows = check(await supabase.from('circle_cards').select('id, name, emoji, visibility').eq('is_member', true).order('name')) ?? [];
  return rows as MyCircle[];
}

export async function listPending(): Promise<PendingCard[]> {
  const rows = check(await supabase.rpc('pending_candidates')) ?? [];
  return (rows as Record<string, unknown>[]).map((r) => ({
    id: r.id as string, displayName: r.display_name as string, field: (r.field as string) ?? null, origin: (r.origin as string) ?? null,
    bio: (r.bio as string) ?? null, invitedByName: (r.invited_by_name as string) ?? null, vouches: r.vouches as number,
    required: r.required as number, iVouched: !!r.i_vouched,
  }));
}

export async function vouch(id: string): Promise<string> {
  return check(await supabase.rpc('vouch', { p_candidate: id })) as string;
}
export async function isBlocked(id: string): Promise<boolean> {
  const rows = check(await supabase.from('blocks').select('blocked_id').eq('blocked_id', id)) ?? [];
  return rows.length > 0;
}
export async function block(id: string): Promise<void> {
  check(await supabase.from('blocks').insert({ blocker_id: await me(), blocked_id: id }));
}
export async function unblock(id: string): Promise<void> {
  check(await supabase.from('blocks').delete().match({ blocker_id: await me(), blocked_id: id }));
}
export async function listBlocked(): Promise<{ id: string; displayName: string }[]> {
  const rows = check(await supabase.from('blocks').select('blocked_id, profiles!blocks_blocked_id_fkey(display_name)')) ?? [];
  return rows.map((r: Record<string, unknown>) => ({ id: r.blocked_id as string,
    displayName: ((r.profiles ?? {}) as Record<string, unknown>).display_name as string ?? '…' }));
}
export async function reportProfile(id: string, reason: string): Promise<void> {
  check(await supabase.from('reports').insert({ reporter_id: await me(), target_type: 'profile', target_id: id, reason }));
}
