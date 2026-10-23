// Demo twin of src/data/chat.ts: circle and meetup chats, reactions, polls and the Board, all in the demo store.
import { useCallback } from 'react';
import type { ChatMessage, ChatScope, Pin, PollData, Reaction } from '../../data/chat';
import * as rules from '../rules';
import { update } from '../store';
import { ME, blockedByMe, profileOf, state, useStore, when } from '../view';

export type { ChatMessage, ChatScope, Pin, PollData, Reaction };
export const REACTIONS = ['❤️', '😂', '🙌', '👍', '🤔', '🔥'] as const;
const PAGE = 50;

function readMessages(scope: ChatScope): ChatMessage[] {
  const s = state();
  const hidden = blockedByMe();
  const rows = s.messages
    .filter((m) => ('circleId' in scope ? m.circleId === scope.circleId : m.meetupId === scope.meetupId) && !hidden.has(m.authorId))
    .map((m) => ({ m, at: when(m.createdAt, m.sample) }))
    .sort((a, b) => a.at.localeCompare(b.at))
    .slice(-PAGE);
  return rows.map(({ m, at }) => {
    const p = profileOf(m.authorId);
    const mine = s.reactions.filter((x) => x.messageId === m.id);
    const reactions: Reaction[] = REACTIONS.map((e) => ({ emoji: e, count: mine.filter((x) => x.emoji === e).length,
      mine: mine.some((x) => x.emoji === e && x.userId === ME) })).filter((x) => x.count > 0);
    return { id: m.id, authorId: m.authorId, authorName: p?.displayName ?? '…', authorAvatar: p?.avatarUrl ?? null, body: m.body,
      kind: m.kind, pollId: m.pollId, replyTo: m.replyTo, mentions: m.mentions, createdAt: at, deleted: !!m.deletedAt, reactions };
  });
}

export function useMessages(scope: ChatScope) {
  const key = 'circleId' in scope ? `c:${scope.circleId}` : `m:${scope.meetupId}`;
  const messages = useStore(() => readMessages(scope));
  const send = useCallback(async (body: string, opts: { replyTo?: string; mentions?: string[] } = {}) => {
    update((s) => { rules.postMessage(s, scope, body, opts); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return { messages, loading: false, send, loadOlder: async () => {}, hasMore: false, reload: async () => {} };
}

export async function react(messageId: string, emoji: string, mine: boolean): Promise<void> {
  update((s) => rules.react(s, messageId, emoji, mine));
}
export async function deleteMessage(id: string): Promise<void> {
  update((s) => rules.deleteMessage(s, id));
}
export async function report(targetType: 'message' | 'profile' | 'meetup', targetId: string, reason: string): Promise<void> {
  update((s) => rules.report(s, targetType, targetId, reason));
}
export async function createPoll(circleId: string, question: string, options: string[]): Promise<string> {
  let id = '';
  update((s) => { id = rules.createPoll(s, circleId, question, options); });
  return id;
}
export async function vote(pollId: string, optionId: string): Promise<void> {
  update((s) => rules.vote(s, pollId, optionId));
}

function readPoll(pollId: string): PollData | null {
  const s = state();
  const p = s.polls.find((x) => x.id === pollId);
  if (!p) return null;
  const votes = s.pollVotes.filter((v) => v.pollId === pollId);
  return { id: p.id, question: p.question, closesAt: p.closesAt ? when(p.closesAt, p.sample) : null,
    myOptionId: votes.find((v) => v.userId === ME)?.optionId ?? null,
    options: s.pollOptions.filter((o) => o.pollId === pollId).map((o) => ({ id: o.id, label: o.label,
      votes: votes.filter((v) => v.optionId === o.id).length })) };
}

export function usePoll(pollId: string): { poll: PollData | null; vote: (optionId: string) => Promise<void> } {
  const poll = useStore(() => readPoll(pollId));
  return { poll, vote: (optionId: string) => vote(pollId, optionId) };
}

export async function listPins(circleId: string): Promise<Pin[]> {
  return state().pins.filter((p) => p.circleId === circleId)
    .map((p) => ({ id: p.id, authorId: p.authorId, title: p.title, body: p.body, url: p.url, createdAt: when(p.createdAt, p.sample) }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export async function addPin(input: { circleId: string; title: string; body: string; url: string }): Promise<void> {
  update((s) => rules.addPin(s, input));
}
export async function deletePin(id: string): Promise<void> {
  update((s) => rules.deletePin(s, id));
}
