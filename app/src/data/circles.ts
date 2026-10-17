import { supabase } from '../lib/supabase';

export type CircleCard = {
  id: string; name: string; description: string | null; emoji: string | null; color: string | null;
  visibility: 'open' | 'closed'; memberCount: number; isMember: boolean; isHost: boolean;
  myRequestStatus: 'pending' | 'approved' | 'declined' | null;
};
export type MemberRow = { userId: string; role: 'member' | 'host'; displayName: string; avatarUrl: string | null; field: string | null };
export type JoinRequestRow = { id: string; userId: string; displayName: string; avatarUrl: string | null; field: string | null; recommendations: number };
export type ProposalInput = { name: string; description: string; emoji: string; visibility: 'open' | 'closed'; cohosts: string[] };

const toCard = (r: Record<string, unknown>): CircleCard => ({
  id: r.id as string, name: r.name as string, description: (r.description as string) ?? null, emoji: (r.emoji as string) ?? null,
  color: (r.color as string) ?? null, visibility: r.visibility as 'open' | 'closed', memberCount: (r.member_count as number) ?? 0,
  isMember: !!r.is_member, isHost: !!r.is_host, myRequestStatus: (r.my_request_status as CircleCard['myRequestStatus']) ?? null,
});

function check<T>({ data, error }: { data: T; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data;
}

export async function listCircles(): Promise<CircleCard[]> {
  const rows = check(await supabase.from('circle_cards').select('*').eq('status', 'active').order('name'));
  return (rows ?? []).map(toCard);
}

export async function getCircle(id: string): Promise<CircleCard | null> {
  const row = check(await supabase.from('circle_cards').select('*').eq('id', id).maybeSingle());
  return row ? toCard(row) : null;
}

export async function joinCircle(id: string): Promise<void> {
  check(await supabase.rpc('join_circle', { p_circle: id }));
}
export async function leaveCircle(id: string): Promise<void> {
  check(await supabase.rpc('leave_circle', { p_circle: id }));
}
export async function requestJoin(id: string): Promise<void> {
  check(await supabase.rpc('request_join', { p_circle: id }));
}
export async function recommend(circleId: string, userId: string): Promise<void> {
  check(await supabase.rpc('recommend', { p_circle: circleId, p_candidate: userId }));
}
export async function proposeCircle(input: ProposalInput): Promise<string> {
  return check(await supabase.rpc('propose_circle', {
    p_name: input.name, p_description: input.description, p_emoji: input.emoji, p_visibility: input.visibility, p_cohosts: input.cohosts,
  })) as string;
}

export async function listMembers(circleId: string): Promise<MemberRow[]> {
  const rows = check(await supabase.from('circle_members')
    .select('user_id, role, profiles!circle_members_user_id_fkey(display_name, avatar_url, field)').eq('circle_id', circleId));
  return (rows ?? []).map((r: Record<string, unknown>) => {
    const p = (r.profiles ?? {}) as Record<string, unknown>;
    return { userId: r.user_id as string, role: r.role as MemberRow['role'], displayName: (p.display_name as string) ?? '?',
             avatarUrl: (p.avatar_url as string) ?? null, field: (p.field as string) ?? null };
  }).filter((m) => m.displayName !== '?').sort((a, b) => (a.role === b.role ? a.displayName.localeCompare(b.displayName) : a.role === 'host' ? -1 : 1));
}

export async function listJoinRequests(circleId: string): Promise<JoinRequestRow[]> {
  const rows = check(await supabase.from('join_requests')
    .select('id, user_id, profiles!join_requests_user_id_fkey(display_name, avatar_url, field)')
    .eq('circle_id', circleId).eq('status', 'pending'));
  const recs = check(await supabase.from('circle_recommendations').select('candidate_id').eq('circle_id', circleId));
  return (rows ?? []).map((r: Record<string, unknown>) => {
    const p = (r.profiles ?? {}) as Record<string, unknown>;
    return { id: r.id as string, userId: r.user_id as string, displayName: (p.display_name as string) ?? '?',
             avatarUrl: (p.avatar_url as string) ?? null, field: (p.field as string) ?? null,
             recommendations: (recs ?? []).filter((x: { candidate_id: string }) => x.candidate_id === r.user_id).length };
  });
}

export async function decideJoin(requestId: string, approve: boolean): Promise<void> {
  check(await supabase.rpc('decide_join', { p_request: requestId, p_approve: approve }));
}

export type ProposalRow = { id: string; name: string; status: 'pending' | 'approved' | 'declined' | 'question'; adminNote: string | null };
export async function myProposals(): Promise<ProposalRow[]> {
  const { data: u } = await supabase.auth.getUser();
  const rows = check(await supabase.from('circle_proposals').select('id, name, status, admin_note')
    .eq('proposer_id', u.user?.id ?? '').order('created_at', { ascending: false }));
  return (rows ?? []).map((r: Record<string, unknown>) => ({ id: r.id as string, name: r.name as string,
    status: r.status as ProposalRow['status'], adminNote: (r.admin_note as string) ?? null }));
}
