// Demo twin of src/data/profiles.ts: the fictional members, the waiting list and vouching.
import type { MyCircle, PendingCard, ProfileView } from '../../data/profiles';
import type { PersonCard } from '../../lib/people';
import * as rules from '../rules';
import { update } from '../store';
import type { DemoProfile } from '../types';
import { ME, blockedByMe, nameOf, profileOf, state } from '../view';

export type { MyCircle, PendingCard, ProfileView };

const toCard = (p: DemoProfile): PersonCard => ({ id: p.id, displayName: p.displayName, field: p.field, origin: p.origin,
  languages: p.languages, teach: p.teach, learn: p.learn, avatarUrl: p.avatarUrl, approvedAt: p.approvedAt, bio: p.bio });

export async function listPeople(): Promise<PersonCard[]> {
  return state().profiles.filter((p) => p.status === 'member').sort((a, b) => a.displayName.localeCompare(b.displayName)).map(toCard);
}

export async function getProfile(id: string): Promise<ProfileView | null> {
  const p = profileOf(id);
  if (!p) return null;
  const s = state();
  const circles = s.circleMembers.filter((m) => m.userId === id)
    .map((m) => s.circles.find((c) => c.id === m.circleId))
    .filter((c): c is NonNullable<typeof c> => !!c)
    .map((c) => ({ id: c.id, name: c.name, emoji: c.emoji }));
  return { ...toCard(p), berlinSince: p.berlinSince, funFact: p.funFact, circles };
}

export async function myCircles(): Promise<MyCircle[]> {
  const s = state();
  return s.circles.filter((c) => c.status === 'active' && s.circleMembers.some((m) => m.circleId === c.id && m.userId === ME))
    .sort((a, b) => a.name.localeCompare(b.name)).map((c) => ({ id: c.id, name: c.name, emoji: c.emoji, visibility: c.visibility }));
}

export async function listPending(): Promise<PendingCard[]> {
  const s = state();
  return s.profiles.filter((p) => p.status === 'pending').map((p) => {
    const vs = s.vouches.filter((v) => v.candidateId === p.id);
    return { id: p.id, displayName: p.displayName, field: p.field, origin: p.origin, bio: p.bio,
      invitedByName: p.invitedBy ? nameOf(p.invitedBy) : null, vouches: vs.length, required: s.settings.vouchesRequired,
      iVouched: vs.some((v) => v.voucherId === ME) };
  });
}

export async function vouch(id: string): Promise<string> {
  let status = 'pending';
  update((s) => { status = rules.vouch(s, id); });
  return status;
}
export async function isBlocked(id: string): Promise<boolean> {
  return blockedByMe().has(id);
}
export async function block(id: string): Promise<void> {
  update((s) => rules.block(s, id));
}
export async function unblock(id: string): Promise<void> {
  update((s) => rules.unblock(s, id));
}
export async function listBlocked(): Promise<{ id: string; displayName: string }[]> {
  return [...blockedByMe()].map((id) => ({ id, displayName: nameOf(id) }));
}
export async function reportProfile(id: string, reason: string): Promise<void> {
  update((s) => rules.report(s, 'profile', id, reason));
}
