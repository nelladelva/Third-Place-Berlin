// The backend's main flows, reproduced for the demo (see supabase/migrations: functions and notification triggers).
// Each function mutates the demo state in place; the data twins wrap them in store.update(). Simplified on purpose:
// blocks are not applied everywhere, vouch edge cases and meetup-chat closing are not reproduced.
import type { MeetupInput } from '../data/meetups';
import type { ProposalInput } from '../data/circles';
import type { NotificationKind } from '../../supabase/functions/_shared/payload';
import { newId } from './store';
import { nowIso } from './time';
import type { DemoState } from './types';

type Scope = { circleId: string } | { meetupId: string };

const me = (s: DemoState) => s.me.id;
const isAdmin = (s: DemoState) => s.me.viewAs === 'admin';
function requireAdmin(s: DemoState): void {
  if (!isAdmin(s)) throw new Error('not_admin');
}
const nameOf = (s: DemoState, id: string) => s.profiles.find((p) => p.id === id)?.displayName ?? 'Someone';
const circleOf = (s: DemoState, id: string) => {
  const c = s.circles.find((x) => x.id === id);
  if (!c) throw new Error('not_found');
  return c;
};
const isMember = (s: DemoState, circleId: string, userId: string) =>
  s.circleMembers.some((m) => m.circleId === circleId && m.userId === userId);
const isHost = (s: DemoState, circleId: string, userId: string) =>
  s.circleMembers.some((m) => m.circleId === circleId && m.userId === userId && m.role === 'host');
const hostsOf = (s: DemoState, circleId: string) =>
  s.circleMembers.filter((m) => m.circleId === circleId && m.role === 'host').map((m) => m.userId);
const admins = (s: DemoState) => s.profiles.filter((p) => p.role === 'admin' && p.status === 'member').map((p) => p.id);

/** One inbox entry per recipient; never notify the person who acted. */
function notify(s: DemoState, userIds: string[], kind: NotificationKind, data: Record<string, unknown>): void {
  for (const userId of new Set(userIds)) {
    if (userId === me(s) && kind !== 'member_approved' && kind !== 'join_decided' && kind !== 'proposal_decided') continue;
    s.notifications.push({ id: newId('n'), userId, kind, data, createdAt: nowIso(), read: false, sample: false });
  }
}

// ── Circles ──────────────────────────────────────────────────────────────
export function joinCircle(s: DemoState, circleId: string): void {
  const c = circleOf(s, circleId);
  if (c.visibility === 'closed') throw new Error('closed');
  if (!isMember(s, circleId, me(s))) s.circleMembers.push({ circleId, userId: me(s), role: 'member', sample: false });
}

export function leaveCircle(s: DemoState, circleId: string): void {
  s.circleMembers = s.circleMembers.filter((m) => !(m.circleId === circleId && m.userId === me(s)));
}

export function requestJoin(s: DemoState, circleId: string): void {
  const c = circleOf(s, circleId);
  if (isMember(s, circleId, me(s))) return;
  if (s.joinRequests.some((j) => j.circleId === circleId && j.userId === me(s) && j.status === 'pending')) return;
  s.joinRequests.push({ id: newId('jr'), circleId, userId: me(s), status: 'pending', createdAt: nowIso(), sample: false });
  notify(s, [...hostsOf(s, circleId), ...admins(s)], 'join_request', { circle: c.name, circle_id: circleId, author: nameOf(s, me(s)) });
}

export function recommend(s: DemoState, circleId: string, userId: string): void {
  const c = circleOf(s, circleId);
  s.recommendations.push({ circleId, userId, byId: me(s), createdAt: nowIso(), sample: false });
  notify(s, [userId], 'recommended', { author: nameOf(s, me(s)), circle: c.name, circle_id: circleId });
}

export function decideJoin(s: DemoState, requestId: string, approve: boolean): void {
  const j = s.joinRequests.find((x) => x.id === requestId);
  if (!j) throw new Error('not_found');
  if (!isAdmin(s) && !isHost(s, j.circleId, me(s))) throw new Error('not_allowed');
  j.status = approve ? 'approved' : 'declined';
  if (approve && !isMember(s, j.circleId, j.userId)) s.circleMembers.push({ circleId: j.circleId, userId: j.userId, role: 'member', sample: false });
  notify(s, [j.userId], 'join_decided', { approved: approve, circle: circleOf(s, j.circleId).name, circle_id: j.circleId });
}

export function proposeCircle(s: DemoState, input: ProposalInput): string {
  const id = newId('prop');
  s.proposals.push({ id, name: input.name, description: input.description, emoji: input.emoji, visibility: input.visibility,
    proposerId: me(s), cohosts: input.cohosts, status: 'pending', adminNote: null, createdAt: nowIso(), sample: false });
  notify(s, admins(s), 'proposal_new', { name: input.name, author: nameOf(s, me(s)) });
  return id;
}

// ── Meetups ──────────────────────────────────────────────────────────────
export function createMeetup(s: DemoState, input: MeetupInput): string {
  const c = circleOf(s, input.circleId);
  const id = newId('m');
  s.meetups.push({ id, circleId: input.circleId, hostId: me(s), title: input.title, description: input.description || null,
    startsAt: input.startsAt, endsAt: input.endsAt, locationName: input.locationName || null, lat: input.lat, lng: input.lng,
    sign: input.sign || null, bring: input.bring || null, capacity: input.capacity, cancelledAt: null, createdAt: nowIso(), sample: false });
  s.rsvps.push({ meetupId: id, userId: me(s), checkedInAt: null, sample: false });
  const members = s.circleMembers.filter((m) => m.circleId === input.circleId).map((m) => m.userId);
  notify(s, members, 'meetup_new', { circle: c.name, title: input.title, meetup_id: id, circle_id: input.circleId });
  return id;
}

const meetupOf = (s: DemoState, id: string) => {
  const m = s.meetups.find((x) => x.id === id);
  if (!m) throw new Error('not_found');
  return m;
};
const going = (s: DemoState, meetupId: string) => s.rsvps.filter((r) => r.meetupId === meetupId);

export function rsvp(s: DemoState, meetupId: string): 'going' | 'full' {
  const m = meetupOf(s, meetupId);
  if (going(s, meetupId).some((r) => r.userId === me(s))) return 'going';
  if (m.capacity != null && going(s, meetupId).length >= m.capacity) return 'full';
  s.rsvps.push({ meetupId, userId: me(s), checkedInAt: null, sample: false });
  return 'going';
}

export function cancelRsvp(s: DemoState, meetupId: string): void {
  s.rsvps = s.rsvps.filter((r) => !(r.meetupId === meetupId && r.userId === me(s)));
}

export function cancelMeetup(s: DemoState, meetupId: string): void {
  const m = meetupOf(s, meetupId);
  if (m.hostId !== me(s) && !isAdmin(s) && !isHost(s, m.circleId, me(s))) throw new Error('not_allowed');
  m.cancelledAt = nowIso();
}

export function updatePin(s: DemoState, meetupId: string, lat: number, lng: number, sign: string | null): void {
  const m = meetupOf(s, meetupId);
  Object.assign(m, { lat, lng, sign });
}

/** The demo doesn't check place or time: if you're going, you're checked in. */
export function checkIn(s: DemoState, meetupId: string): 'checked_in' | 'not_going' {
  const r = going(s, meetupId).find((x) => x.userId === me(s));
  if (!r) return 'not_going';
  r.checkedInAt = r.checkedInAt ?? nowIso();
  return 'checked_in';
}

// ── Chat ─────────────────────────────────────────────────────────────────
export function postMessage(s: DemoState, scope: Scope, body: string, opts: { replyTo?: string; mentions?: string[] } = {}): string {
  const id = newId('msg');
  const circleId = 'circleId' in scope ? scope.circleId : null;
  const meetupId = 'meetupId' in scope ? scope.meetupId : null;
  s.messages.push({ id, circleId, meetupId, authorId: me(s), body, kind: 'text', pollId: null, replyTo: opts.replyTo ?? null,
    mentions: opts.mentions ?? [], createdAt: nowIso(), deletedAt: null, sample: false });
  const author = nameOf(s, me(s));
  const where = circleId ?? meetupOf(s, meetupId!).circleId;
  const base = { author, body, circle: circleOf(s, where).name, circle_id: circleId, meetup_id: meetupId };
  notify(s, opts.mentions ?? [], 'mention', base);
  const parent = opts.replyTo ? s.messages.find((m) => m.id === opts.replyTo) : undefined;
  if (parent && !(opts.mentions ?? []).includes(parent.authorId)) notify(s, [parent.authorId], 'reply', base);
  return id;
}

export function react(s: DemoState, messageId: string, emoji: string, mine: boolean): void {
  s.reactions = s.reactions.filter((x) => !(x.messageId === messageId && x.userId === me(s) && x.emoji === emoji));
  if (!mine) s.reactions.push({ messageId, userId: me(s), emoji, sample: false });
}

export function deleteMessage(s: DemoState, messageId: string): void {
  const m = s.messages.find((x) => x.id === messageId);
  if (!m) throw new Error('not_found');
  const circleId = m.circleId ?? (m.meetupId ? meetupOf(s, m.meetupId).circleId : '');
  if (m.authorId !== me(s) && !isAdmin(s) && !isHost(s, circleId, me(s))) throw new Error('not_allowed');
  m.deletedAt = nowIso();
  m.body = '';
}

export function createPoll(s: DemoState, circleId: string, question: string, options: string[]): string {
  const c = circleOf(s, circleId);
  const pollId = newId('poll');
  s.polls.push({ id: pollId, circleId, question, closesAt: null, createdAt: nowIso(), sample: false });
  options.filter((o) => o.trim()).forEach((label) => s.pollOptions.push({ id: newId('opt'), pollId, label: label.trim(), sample: false }));
  s.messages.push({ id: newId('msg'), circleId, meetupId: null, authorId: me(s), body: question, kind: 'poll', pollId, replyTo: null,
    mentions: [], createdAt: nowIso(), deletedAt: null, sample: false });
  const members = s.circleMembers.filter((m) => m.circleId === circleId).map((m) => m.userId);
  notify(s, members, 'poll_new', { circle: c.name, question, circle_id: circleId });
  return pollId;
}

export function vote(s: DemoState, pollId: string, optionId: string): void {
  s.pollVotes = s.pollVotes.filter((v) => !(v.pollId === pollId && v.userId === me(s)));
  s.pollVotes.push({ pollId, optionId, userId: me(s), sample: false });
}

export function addPin(s: DemoState, input: { circleId: string; title: string; body: string; url: string }): void {
  s.pins.push({ id: newId('pin'), circleId: input.circleId, authorId: me(s), title: input.title, body: input.body || null,
    url: input.url || null, createdAt: nowIso(), sample: false });
}

export function deletePin(s: DemoState, id: string): void {
  s.pins = s.pins.filter((p) => p.id !== id);
}

export function report(s: DemoState, targetType: 'message' | 'profile' | 'meetup', targetId: string, reason: string): void {
  s.reports.push({ id: newId('rep'), reporterId: me(s), targetType, targetId, reason: reason || null, createdAt: nowIso(),
    resolved: false, sample: false });
}

// ── People ───────────────────────────────────────────────────────────────
function approve(s: DemoState, id: string): void {
  const p = s.profiles.find((x) => x.id === id);
  if (!p || p.status !== 'pending') return;
  p.status = 'member';
  p.approvedAt = nowIso();
  notify(s, [id], 'member_approved', {});
}

/** Returns the new status of the person ('pending' or 'member'). */
export function vouch(s: DemoState, candidateId: string): string {
  if (!s.vouches.some((v) => v.candidateId === candidateId && v.voucherId === me(s))) {
    s.vouches.push({ candidateId, voucherId: me(s), createdAt: nowIso(), sample: false });
  }
  const count = s.vouches.filter((v) => v.candidateId === candidateId).length;
  if (count >= s.settings.vouchesRequired) approve(s, candidateId);
  return s.profiles.find((p) => p.id === candidateId)?.status ?? 'pending';
}

export function approveMember(s: DemoState, id: string): void {
  requireAdmin(s);
  approve(s, id);
}

export function removeMember(s: DemoState, id: string): void {
  requireAdmin(s);
  const p = s.profiles.find((x) => x.id === id);
  if (p) p.status = 'removed';
  s.circleMembers = s.circleMembers.filter((m) => m.userId !== id);
}

export function setAdmin(s: DemoState, id: string, admin: boolean): void {
  requireAdmin(s);
  const p = s.profiles.find((x) => x.id === id);
  if (p) p.role = admin ? 'admin' : 'member';
}

export function block(s: DemoState, id: string): void {
  if (!s.blocks.some((b) => b.blockerId === me(s) && b.blockedId === id)) s.blocks.push({ blockerId: me(s), blockedId: id });
}

export function unblock(s: DemoState, id: string): void {
  s.blocks = s.blocks.filter((b) => !(b.blockerId === me(s) && b.blockedId === id));
}

// ── Admin ────────────────────────────────────────────────────────────────
export function openLaunch(s: DemoState): string {
  requireAdmin(s);
  const code = s.settings.launchCode ?? `LAUNCH-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  s.settings.launchOpen = true;
  s.settings.launchCode = code;
  return code;
}

export function closeLaunch(s: DemoState): void {
  requireAdmin(s);
  s.settings.launchOpen = false;
}

export function setVouchesRequired(s: DemoState, n: number): void {
  requireAdmin(s);
  s.settings.vouchesRequired = Math.max(0, Math.round(n));
}

export function decideProposal(s: DemoState, id: string, decision: 'approved' | 'declined' | 'question', note: string): void {
  requireAdmin(s);
  const p = s.proposals.find((x) => x.id === id);
  if (!p) throw new Error('not_found');
  p.status = decision;
  p.adminNote = note || null;
  let circleId: string | null = null;
  if (decision === 'approved') {
    circleId = newId('c');
    s.circles.push({ id: circleId, name: p.name, emoji: p.emoji || '✨', color: '#2F5D58', visibility: p.visibility,
      description: p.description, status: 'active', sample: false });
    s.circleMembers.push({ circleId, userId: p.proposerId, role: 'host', sample: false });
    for (const u of p.cohosts) s.circleMembers.push({ circleId, userId: u, role: 'host', sample: false });
  }
  notify(s, [p.proposerId], 'proposal_decided', { status: decision, name: p.name, note: note || '', circle_id: circleId });
}

export function resolveReport(s: DemoState, id: string): void {
  requireAdmin(s);
  const rep = s.reports.find((x) => x.id === id);
  if (rep) rep.resolved = true;
}

export function removeReportedContent(s: DemoState, id: string): void {
  requireAdmin(s);
  const rep = s.reports.find((x) => x.id === id);
  if (!rep) return;
  if (rep.targetType === 'message') {
    const m = s.messages.find((x) => x.id === rep.targetId);
    if (m) { m.deletedAt = nowIso(); m.body = ''; }
  } else if (rep.targetType === 'meetup') {
    const m = s.meetups.find((x) => x.id === rep.targetId);
    if (m) m.cancelledAt = nowIso();
  } else {
    const p = s.profiles.find((x) => x.id === rep.targetId);
    if (p) p.status = 'removed';
  }
  rep.resolved = true;
}

export function setVisibility(s: DemoState, circleId: string, v: 'open' | 'closed'): void {
  requireAdmin(s);
  circleOf(s, circleId).visibility = v;
}

export function setHost(s: DemoState, circleId: string, userId: string, host: boolean): void {
  requireAdmin(s);
  const m = s.circleMembers.find((x) => x.circleId === circleId && x.userId === userId);
  if (m) m.role = host ? 'host' : 'member';
  else if (host) s.circleMembers.push({ circleId, userId, role: 'host', sample: false });
}

export function archiveCircle(s: DemoState, circleId: string, archived: boolean): void {
  requireAdmin(s);
  circleOf(s, circleId).status = archived ? 'archived' : 'active';
}
