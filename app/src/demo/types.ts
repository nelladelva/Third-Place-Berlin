// The demo's in-browser "database": plain rows mirroring the tables the screens use (see supabase/migrations).
// `sample: true` marks seed rows, whose times move forward with today; anything the user creates has `sample: false`.
import type { Profile } from '../data/session';
import type { NotificationKind } from '../../supabase/functions/_shared/payload';

type S = { sample: boolean };
export type Visibility = 'open' | 'closed';

export type DemoProfile = Profile & S;
export type DemoCircle = S & { id: string; name: string; emoji: string; color: string; visibility: Visibility; description: string;
  status: 'active' | 'archived' };
export type DemoMember = S & { circleId: string; userId: string; role: 'member' | 'host' };
export type DemoJoinRequest = S & { id: string; circleId: string; userId: string; status: 'pending' | 'approved' | 'declined'; createdAt: string };
export type DemoRecommendation = S & { circleId: string; userId: string; byId: string; createdAt: string };
export type DemoProposal = S & { id: string; name: string; description: string; emoji: string; visibility: Visibility; proposerId: string;
  cohosts: string[]; status: 'pending' | 'approved' | 'declined' | 'question'; adminNote: string | null; createdAt: string };
export type DemoMeetup = S & { id: string; circleId: string; hostId: string; title: string; description: string | null; startsAt: string;
  endsAt: string; locationName: string | null; lat: number; lng: number; sign: string | null; bring: string | null; capacity: number | null;
  cancelledAt: string | null; createdAt: string };
export type DemoRsvp = S & { meetupId: string; userId: string; checkedInAt: string | null };
export type DemoMessage = S & { id: string; circleId: string | null; meetupId: string | null; authorId: string; body: string;
  kind: 'text' | 'poll'; pollId: string | null; replyTo: string | null; mentions: string[]; createdAt: string; deletedAt: string | null };
export type DemoReaction = S & { messageId: string; userId: string; emoji: string };
export type DemoPoll = S & { id: string; circleId: string; question: string; closesAt: string | null; createdAt: string };
export type DemoPollOption = S & { id: string; pollId: string; label: string };
export type DemoVote = S & { pollId: string; optionId: string; userId: string };
export type DemoPin = S & { id: string; circleId: string; authorId: string; title: string; body: string | null; url: string | null; createdAt: string };
export type DemoNotification = S & { id: string; userId: string; kind: NotificationKind; data: Record<string, unknown>; createdAt: string; read: boolean };
export type DemoPrefs = { circleId: string; meetupsPolls: boolean; mentions: boolean; everyMessage: boolean };
export type DemoInvite = S & { code: string; createdBy: string; createdAt: string; expiresAt: string; used: boolean };
export type DemoBlock = { blockerId: string; blockedId: string };
export type DemoReport = S & { id: string; reporterId: string; targetType: 'message' | 'profile' | 'meetup'; targetId: string; reason: string | null;
  createdAt: string; resolved: boolean };
export type DemoVouch = S & { candidateId: string; voucherId: string; createdAt: string };

export type DemoState = {
  version: number;
  startedAt: string; // YYYY-MM-DD of the first visit; sample times shift by the days since then
  me: { id: 'demo-you'; viewAs: 'admin' | 'member' };
  settings: { launchOpen: boolean; launchCode: string | null; vouchesRequired: number };
  profiles: DemoProfile[];
  circles: DemoCircle[];
  circleMembers: DemoMember[];
  joinRequests: DemoJoinRequest[];
  recommendations: DemoRecommendation[];
  proposals: DemoProposal[];
  meetups: DemoMeetup[];
  rsvps: DemoRsvp[];
  messages: DemoMessage[];
  reactions: DemoReaction[];
  polls: DemoPoll[];
  pollOptions: DemoPollOption[];
  pollVotes: DemoVote[];
  pins: DemoPin[];
  notifications: DemoNotification[];
  notificationPrefs: DemoPrefs[];
  invites: DemoInvite[];
  blocks: DemoBlock[];
  reports: DemoReport[];
  vouches: DemoVouch[];
};
