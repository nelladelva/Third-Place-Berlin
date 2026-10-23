// Demo twin of src/data/circles.ts, backed by the demo store and rules.
import type { CircleCard, JoinRequestRow, MemberRow, ProposalInput, ProposalRow } from '../../data/circles';
import * as rules from '../rules';
import { update } from '../store';
import type { DemoCircle } from '../types';
import { ME, profileOf, state } from '../view';

export type { CircleCard, JoinRequestRow, MemberRow, ProposalInput, ProposalRow };

function toCard(c: DemoCircle): CircleCard {
  const s = state();
  const members = s.circleMembers.filter((m) => m.circleId === c.id);
  const mine = s.joinRequests.filter((j) => j.circleId === c.id && j.userId === ME).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  return { id: c.id, name: c.name, description: c.description, emoji: c.emoji, color: c.color, visibility: c.visibility,
    memberCount: members.length, isMember: members.some((m) => m.userId === ME),
    isHost: members.some((m) => m.userId === ME && m.role === 'host'), myRequestStatus: mine?.status ?? null };
}

export async function listCircles(): Promise<CircleCard[]> {
  return state().circles.filter((c) => c.status === 'active').sort((a, b) => a.name.localeCompare(b.name)).map(toCard);
}

export async function getCircle(id: string): Promise<CircleCard | null> {
  const c = state().circles.find((x) => x.id === id);
  return c ? toCard(c) : null;
}

export async function joinCircle(id: string): Promise<void> {
  update((s) => rules.joinCircle(s, id));
}
export async function leaveCircle(id: string): Promise<void> {
  update((s) => rules.leaveCircle(s, id));
}
export async function requestJoin(id: string): Promise<void> {
  update((s) => rules.requestJoin(s, id));
}
export async function recommend(circleId: string, userId: string): Promise<void> {
  update((s) => rules.recommend(s, circleId, userId));
}
export async function proposeCircle(input: ProposalInput): Promise<string> {
  let id = '';
  update((s) => { id = rules.proposeCircle(s, input); });
  return id;
}

export async function listMembers(circleId: string): Promise<MemberRow[]> {
  return state().circleMembers.filter((m) => m.circleId === circleId).map((m) => {
    const p = profileOf(m.userId);
    return { userId: m.userId, role: m.role, displayName: p?.displayName ?? '?', avatarUrl: p?.avatarUrl ?? null, field: p?.field ?? null };
  }).filter((m) => m.displayName !== '?')
    .sort((a, b) => (a.role === b.role ? a.displayName.localeCompare(b.displayName) : a.role === 'host' ? -1 : 1));
}

export async function listJoinRequests(circleId: string): Promise<JoinRequestRow[]> {
  const s = state();
  return s.joinRequests.filter((j) => j.circleId === circleId && j.status === 'pending').map((j) => {
    const p = profileOf(j.userId);
    return { id: j.id, userId: j.userId, displayName: p?.displayName ?? '?', avatarUrl: p?.avatarUrl ?? null, field: p?.field ?? null,
      recommendations: s.recommendations.filter((r) => r.circleId === circleId && r.userId === j.userId).length };
  });
}

export async function decideJoin(requestId: string, approve: boolean): Promise<void> {
  update((s) => rules.decideJoin(s, requestId, approve));
}

export async function myProposals(): Promise<ProposalRow[]> {
  return state().proposals.filter((p) => p.proposerId === ME).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((p) => ({ id: p.id, name: p.name, status: p.status, adminNote: p.adminNote }));
}

