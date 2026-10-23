// Demo twin of src/data/admin.ts: the admin console works on the demo community.
import type { CircleAdmin, MemberAdmin, ProposalAdmin, ReportAdmin, Settings } from '../../data/admin';
import * as rules from '../rules';
import { update } from '../store';
import { nameOf, state, when } from '../view';

export type { CircleAdmin, MemberAdmin, ProposalAdmin, ReportAdmin, Settings };

export async function getSettings(): Promise<Settings> {
  return { ...state().settings };
}
export async function openLaunch(): Promise<string> {
  let code = '';
  update((s) => { code = rules.openLaunch(s); });
  return code;
}
export async function closeLaunch(): Promise<void> {
  update((s) => rules.closeLaunch(s));
}
export async function setVouchesRequired(n: number): Promise<void> {
  update((s) => rules.setVouchesRequired(s, n));
}
export async function approveMember(id: string): Promise<void> {
  update((s) => rules.approveMember(s, id));
}
export async function removeMember(id: string): Promise<void> {
  update((s) => rules.removeMember(s, id));
}
export async function setAdmin(id: string, admin: boolean): Promise<void> {
  update((s) => rules.setAdmin(s, id, admin));
}
export async function listMembersAdmin(): Promise<MemberAdmin[]> {
  return state().profiles.filter((p) => p.status === 'member').sort((a, b) => a.displayName.localeCompare(b.displayName))
    .map((p) => ({ id: p.id, displayName: p.displayName, role: p.role, status: p.status, field: p.field }));
}

export async function listProposals(): Promise<ProposalAdmin[]> {
  return state().proposals.filter((p) => p.status === 'pending' || p.status === 'question')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((p) => ({ id: p.id, name: p.name, description: p.description, emoji: p.emoji, visibility: p.visibility,
      proposerName: nameOf(p.proposerId), status: p.status, createdAt: when(p.createdAt, p.sample) }));
}
export async function decideProposal(id: string, decision: 'approved' | 'declined' | 'question', note: string): Promise<void> {
  update((s) => rules.decideProposal(s, id, decision, note));
}

export async function listReports(): Promise<ReportAdmin[]> {
  const s = state();
  return s.reports.filter((r) => !r.resolved).sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((r) => {
    let preview = '';
    if (r.targetType === 'message') preview = s.messages.find((m) => m.id === r.targetId)?.body ?? '';
    if (r.targetType === 'meetup') preview = s.meetups.find((m) => m.id === r.targetId)?.title ?? '';
    if (r.targetType === 'profile') preview = nameOf(r.targetId);
    return { id: r.id, targetType: r.targetType, targetId: r.targetId, reason: r.reason, reporterName: nameOf(r.reporterId), preview,
      createdAt: when(r.createdAt, r.sample) };
  });
}
export async function resolveReport(id: string): Promise<void> {
  update((s) => rules.resolveReport(s, id));
}
export async function removeReportedContent(r: ReportAdmin): Promise<void> {
  update((s) => rules.removeReportedContent(s, r.id));
}

export async function listAllCircles(): Promise<CircleAdmin[]> {
  const s = state();
  return [...s.circles].sort((a, b) => a.name.localeCompare(b.name)).map((c) => ({ id: c.id, name: c.name, emoji: c.emoji,
    visibility: c.visibility, status: c.status,
    hosts: s.circleMembers.filter((m) => m.circleId === c.id && m.role === 'host').map((m) => ({ userId: m.userId, displayName: nameOf(m.userId) })) }));
}
export async function setVisibility(id: string, v: 'open' | 'closed'): Promise<void> {
  update((s) => rules.setVisibility(s, id, v));
}
export async function setHost(circleId: string, userId: string, isHost: boolean): Promise<void> {
  update((s) => rules.setHost(s, circleId, userId, isHost));
}
export async function archiveCircle(id: string, archived: boolean): Promise<void> {
  update((s) => rules.archiveCircle(s, id, archived));
}
