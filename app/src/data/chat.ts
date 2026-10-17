import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

export type ChatScope = { circleId: string } | { meetupId: string };
export type Reaction = { emoji: string; count: number; mine: boolean };
export type ChatMessage = {
  id: string; authorId: string; authorName: string; authorAvatar: string | null; body: string; kind: 'text' | 'poll';
  pollId: string | null; replyTo: string | null; mentions: string[]; createdAt: string; deleted: boolean; reactions: Reaction[];
};
export type PollData = { id: string; question: string; closesAt: string | null; myOptionId: string | null; options: { id: string; label: string; votes: number }[] };
export type Pin = { id: string; authorId: string; title: string; body: string | null; url: string | null; createdAt: string };
export const REACTIONS = ['❤️', '😂', '🙌', '👍', '🤔', '🔥'] as const;
const PAGE = 50;

function check<T>({ data, error }: { data: T; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data;
}
async function me(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}
const scopeCol = (s: ChatScope) => ('circleId' in s ? ['circle_id', s.circleId] : ['meetup_id', s.meetupId]) as [string, string];

async function hydrate(rows: Record<string, unknown>[]): Promise<ChatMessage[]> {
  if (!rows.length) return [];
  const uid = await me();
  const authorIds = [...new Set(rows.map((r) => r.author_id as string))];
  const people = check(await supabase.from('profiles').select('id, display_name, avatar_url').in('id', authorIds)) ?? [];
  const byId = new Map(people.map((p: Record<string, unknown>) => [p.id as string, p]));
  const reacts = check(await supabase.from('reactions').select('message_id, user_id, emoji').in('message_id', rows.map((r) => r.id as string))) ?? [];
  return rows.map((r) => {
    const p = byId.get(r.author_id as string) as Record<string, unknown> | undefined;
    const mine = reacts.filter((x: Record<string, unknown>) => x.message_id === r.id);
    const reactions = REACTIONS.map((e) => ({
      emoji: e, count: mine.filter((x: Record<string, unknown>) => x.emoji === e).length,
      mine: mine.some((x: Record<string, unknown>) => x.emoji === e && x.user_id === uid),
    })).filter((x) => x.count > 0);
    return {
      id: r.id as string, authorId: r.author_id as string, authorName: (p?.display_name as string) ?? '…',
      authorAvatar: (p?.avatar_url as string) ?? null, body: r.body as string, kind: r.kind as 'text' | 'poll',
      pollId: (r.poll_id as string) ?? null, replyTo: (r.reply_to as string) ?? null, mentions: (r.mentions as string[]) ?? [],
      createdAt: r.created_at as string, deleted: !!r.deleted_at, reactions,
    };
  });
}

export function useMessages(scope: ChatScope) {
  const [col, val] = scopeCol(scope);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const oldest = useRef<string | null>(null);

  const reload = useCallback(async () => {
    const rows = check(await supabase.from('messages_visible').select('*').eq(col, val).order('created_at', { ascending: false }).limit(PAGE)) ?? [];
    const list = (await hydrate(rows)).reverse();
    oldest.current = list[0]?.createdAt ?? null;
    setHasMore(rows.length === PAGE);
    setMessages(list);
    setLoading(false);
  }, [col, val]);

  const loadOlder = useCallback(async () => {
    if (!oldest.current) return;
    const rows = check(await supabase.from('messages_visible').select('*').eq(col, val).lt('created_at', oldest.current)
      .order('created_at', { ascending: false }).limit(PAGE)) ?? [];
    const older = (await hydrate(rows)).reverse();
    if (older.length) oldest.current = older[0].createdAt;
    setHasMore(rows.length === PAGE);
    setMessages((cur) => [...older, ...cur]);
  }, [col, val]);

  useEffect(() => {
    void reload();
    const ch = supabase.channel(`chat-${col}-${val}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `${col}=eq.${val}` }, () => void reload())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, () => void reload())
      .subscribe();
    return () => void supabase.removeChannel(ch);
  }, [col, val, reload]);

  const send = useCallback(async (body: string, opts: { replyTo?: string; mentions?: string[] } = {}) => {
    const uid = await me();
    check(await supabase.from('messages').insert({ [col]: val, author_id: uid, body, reply_to: opts.replyTo ?? null, mentions: opts.mentions ?? [] }));
    await reload();
  }, [col, val, reload]);

  return { messages, loading, send, loadOlder, hasMore, reload };
}

export async function react(messageId: string, emoji: string, mine: boolean): Promise<void> {
  const uid = await me();
  if (mine) check(await supabase.from('reactions').delete().match({ message_id: messageId, user_id: uid, emoji }));
  else check(await supabase.from('reactions').insert({ message_id: messageId, user_id: uid, emoji }));
}
export async function deleteMessage(id: string): Promise<void> {
  check(await supabase.rpc('delete_message', { p_id: id }));
}
export async function report(targetType: 'message' | 'profile' | 'meetup', targetId: string, reason: string): Promise<void> {
  const uid = await me();
  check(await supabase.from('reports').insert({ reporter_id: uid, target_type: targetType, target_id: targetId, reason }));
}
export async function createPoll(circleId: string, question: string, options: string[]): Promise<string> {
  return check(await supabase.rpc('create_poll', { p_circle: circleId, p_question: question, p_options: options })) as string;
}
export async function vote(pollId: string, optionId: string): Promise<void> {
  check(await supabase.rpc('vote', { p_poll: pollId, p_option: optionId }));
}

export function usePoll(pollId: string): { poll: PollData | null; vote: (optionId: string) => Promise<void> } {
  const [poll, setPoll] = useState<PollData | null>(null);
  const load = useCallback(async () => {
    const uid = await me();
    const p = check(await supabase.from('polls').select('id, question, closes_at').eq('id', pollId).maybeSingle());
    if (!p) return;
    const opts = check(await supabase.from('poll_options').select('id, label, position').eq('poll_id', pollId).order('position')) ?? [];
    const votes = check(await supabase.from('poll_votes').select('user_id, option_id').eq('poll_id', pollId)) ?? [];
    setPoll({
      id: p.id as string, question: p.question as string, closesAt: (p.closes_at as string) ?? null,
      myOptionId: (votes.find((v: Record<string, unknown>) => v.user_id === uid)?.option_id as string) ?? null,
      options: opts.map((o: Record<string, unknown>) => ({ id: o.id as string, label: o.label as string,
        votes: votes.filter((v: Record<string, unknown>) => v.option_id === o.id).length })),
    });
  }, [pollId]);
  useEffect(() => {
    void load();
    const ch = supabase.channel(`poll-${pollId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poll_votes', filter: `poll_id=eq.${pollId}` }, () => void load())
      .subscribe();
    return () => void supabase.removeChannel(ch);
  }, [pollId, load]);
  return { poll, vote: async (optionId: string) => { await vote(pollId, optionId); await load(); } };
}

export async function listPins(circleId: string): Promise<Pin[]> {
  const rows = check(await supabase.from('board_pins').select('*').eq('circle_id', circleId).order('created_at', { ascending: false })) ?? [];
  return rows.map((r: Record<string, unknown>) => ({ id: r.id as string, authorId: r.author_id as string, title: r.title as string,
    body: (r.body as string) ?? null, url: (r.url as string) ?? null, createdAt: r.created_at as string }));
}
export async function addPin(input: { circleId: string; title: string; body: string; url: string }): Promise<void> {
  const uid = await me();
  check(await supabase.from('board_pins').insert({ circle_id: input.circleId, author_id: uid, title: input.title,
    body: input.body || null, url: input.url || null }));
}
export async function deletePin(id: string): Promise<void> {
  check(await supabase.from('board_pins').delete().eq('id', id));
}
