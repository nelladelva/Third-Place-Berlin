import { supabase } from '../lib/supabase';

function check<T>({ data, error }: { data: T; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data;
}

export type Settings = { launchOpen: boolean; launchCode: string | null; vouchesRequired: number };
export type ProposalAdmin = { id: string; name: string; description: string | null; emoji: string | null; visibility: 'open' | 'closed';
  proposerName: string; status: string; createdAt: string };
export type ReportAdmin = { id: string; targetType: 'message' | 'profile' | 'meetup'; targetId: string; reason: string | null;
  reporterName: string; preview: string; createdAt: string };
export type CircleAdmin = { id: string; name: string; emoji: string | null; visibility: 'open' | 'closed'; status: 'active' | 'archived';
  hosts: { userId: string; displayName: string }[] };
export type MemberAdmin = { id: string; displayName: string; role: 'member' | 'admin'; status: string; field: string | null };

export async function getSettings(): Promise<Settings> {
  const r = check(await supabase.from('app_settings').select('*').eq('id', 1).single()) as Record<string, unknown>;
  return { launchOpen: !!r.launch_open, launchCode: (r.launch_code as string) ?? null, vouchesRequired: r.vouches_required as number };
}
export async function openLaunch(): Promise<string> {
  return check(await supabase.rpc('open_launch')) as string;
}
export async function closeLaunch(): Promise<void> {
  check(await supabase.rpc('close_launch'));
}
export async function setVouchesRequired(n: number): Promise<void> {
  check(await supabase.from('app_settings').update({ vouches_required: n }).eq('id', 1));
}
export async function approveMember(id: string): Promise<void> {
  check(await supabase.rpc('approve_member', { p_candidate: id }));
}
export async function removeMember(id: string): Promise<void> {
  check(await supabase.rpc('remove_member', { p_user: id }));
}
export async function setAdmin(id: string, admin: boolean): Promise<void> {
  check(await supabase.rpc('set_admin', { p_user: id, p_admin: admin }));
}
export async function listMembersAdmin(): Promise<MemberAdmin[]> {
  const rows = check(await supabase.from('profiles').select('id, display_name, role, status, field').eq('status', 'member').order('display_name')) ?? [];
  return rows.map((r: Record<string, unknown>) => ({ id: r.id as string, displayName: r.display_name as string,
    role: r.role as MemberAdmin['role'], status: r.status as string, field: (r.field as string) ?? null }));
}

export async function listProposals(): Promise<ProposalAdmin[]> {
  const rows = check(await supabase.from('circle_proposals')
    .select('id, name, description, emoji, visibility, status, created_at, profiles!circle_proposals_proposer_id_fkey(display_name)')
    .in('status', ['pending', 'question']).order('created_at')) ?? [];
  return rows.map((r: Record<string, unknown>) => ({ id: r.id as string, name: r.name as string, description: (r.description as string) ?? null,
    emoji: (r.emoji as string) ?? null, visibility: r.visibility as 'open' | 'closed', status: r.status as string, createdAt: r.created_at as string,
    proposerName: ((r.profiles ?? {}) as Record<string, unknown>).display_name as string ?? '…' }));
}
export async function decideProposal(id: string, decision: 'approved' | 'declined' | 'question', note: string): Promise<void> {
  check(await supabase.rpc('decide_proposal', { p_id: id, p_decision: decision, p_note: note || null }));
}

export async function listReports(): Promise<ReportAdmin[]> {
  const rows = check(await supabase.from('reports')
    .select('id, target_type, target_id, reason, created_at, profiles!reports_reporter_id_fkey(display_name)')
    .eq('status', 'open').order('created_at')) ?? [];
  return Promise.all(rows.map(async (r: Record<string, unknown>) => {
    const type = r.target_type as ReportAdmin['targetType'];
    const id = r.target_id as string;
    let preview = '';
    if (type === 'message') preview = ((await supabase.from('messages').select('body').eq('id', id).maybeSingle()).data?.body as string) ?? '';
    if (type === 'meetup') preview = ((await supabase.from('meetups').select('title').eq('id', id).maybeSingle()).data?.title as string) ?? '';
    if (type === 'profile') preview = ((await supabase.from('profiles').select('display_name').eq('id', id).maybeSingle()).data?.display_name as string) ?? '';
    return { id: r.id as string, targetType: type, targetId: id, reason: (r.reason as string) ?? null, preview, createdAt: r.created_at as string,
      reporterName: ((r.profiles ?? {}) as Record<string, unknown>).display_name as string ?? '…' };
  }));
}
export async function resolveReport(id: string): Promise<void> {
  check(await supabase.from('reports').update({ status: 'resolved' }).eq('id', id));
}
export async function removeReportedContent(r: ReportAdmin): Promise<void> {
  if (r.targetType === 'message') check(await supabase.rpc('delete_message', { p_id: r.targetId }));
  if (r.targetType === 'meetup') check(await supabase.from('meetups').delete().eq('id', r.targetId));
  if (r.targetType === 'profile') await removeMember(r.targetId);
}

export async function listAllCircles(): Promise<CircleAdmin[]> {
  const rows = check(await supabase.from('circles').select('id, name, emoji, visibility, status').order('name')) ?? [];
  const hosts = check(await supabase.from('circle_members').select('circle_id, user_id, profiles!circle_members_user_id_fkey(display_name)').eq('role', 'host')) ?? [];
  return rows.map((c: Record<string, unknown>) => ({ id: c.id as string, name: c.name as string, emoji: (c.emoji as string) ?? null,
    visibility: c.visibility as 'open' | 'closed', status: c.status as 'active' | 'archived',
    hosts: hosts.filter((h: Record<string, unknown>) => h.circle_id === c.id).map((h: Record<string, unknown>) => ({ userId: h.user_id as string,
      displayName: ((h.profiles ?? {}) as Record<string, unknown>).display_name as string ?? '…' })) }));
}
export async function setVisibility(id: string, v: 'open' | 'closed'): Promise<void> {
  check(await supabase.rpc('set_visibility', { p_circle: id, p_visibility: v }));
}
export async function setHost(circleId: string, userId: string, isHost: boolean): Promise<void> {
  check(await supabase.rpc('set_host', { p_circle: circleId, p_user: userId, p_is_host: isHost }));
}
export async function archiveCircle(id: string, archived: boolean): Promise<void> {
  check(await supabase.rpc('archive_circle', { p_circle: id, p_archived: archived }));
}
