import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { deleteMessage, react, report, useMessages, REACTIONS, type ChatMessage, type ChatScope } from '../../data/chat';
import { Avatar } from '../../ui/Avatar';
import { PollCard } from './PollCard';

export type Mentionable = { userId: string; displayName: string };
const HM = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' });

function Bubble({ m, me, canModerate, onReply, byId }: { m: ChatMessage; me: string; canModerate: boolean; onReply: () => void; byId: Map<string, ChatMessage> }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const mine = m.authorId === me;
  const parent = m.replyTo ? byId.get(m.replyTo) : undefined;
  if (m.kind === 'poll' && m.pollId && !m.deleted) return <PollCard pollId={m.pollId} />;
  return (
    <div className={`msg-row${mine ? ' me' : ''}`}>
      {!mine && <Link to={`/people/${m.authorId}`}><Avatar id={m.authorId} name={m.authorName} url={m.authorAvatar} size={28} /></Link>}
      <div className="msg" onClick={() => setOpen(!open)}>
        {!mine && <div className="msg-who">{m.authorName}</div>}
        {parent && <div className="msg-quote">↪ {parent.authorName}: {parent.body.slice(0, 60)}</div>}
        <div className="msg-body">{m.deleted ? <em className="muted">{t('chat.deleted')}</em> : m.body}</div>
        <div className="msg-meta">
          {m.reactions.map((r) => <span key={r.emoji} className={r.mine ? 'rx mine' : 'rx'}>{r.emoji} {r.count}</span>)}
          <span className="muted">{HM.format(new Date(m.createdAt))}</span>
        </div>
        {open && !m.deleted && (
          <div className="msg-actions" onClick={(e) => e.stopPropagation()}>
            {REACTIONS.map((e) => (
              <button key={e} onClick={() => void react(m.id, e, !!m.reactions.find((r) => r.emoji === e && r.mine))}>{e}</button>
            ))}
            <button onClick={onReply}>{t('chat.reply')}</button>
            {(mine || canModerate) && <button onClick={() => void deleteMessage(m.id)}>{t('chat.delete')}</button>}
            {!mine && <button onClick={() => {
              const reason = window.prompt(t('chat.reportReason')) ?? '';
              if (reason) void report('message', m.id, reason).then(() => setNote(t('chat.reported')));
            }}>{t('chat.report')}</button>}
          </div>
        )}
        {note && <div className="muted">{note}</div>}
      </div>
    </div>
  );
}

export function ChatView({ scope, me, members, closesAt, now = new Date(), canModerate = false, menu }:
  { scope: ChatScope; me: string; members: Mentionable[]; closesAt?: string; now?: Date; canModerate?: boolean; menu?: ReactNode }) {
  const { t } = useTranslation();
  const { messages, loading, send, loadOlder, hasMore } = useMessages(scope);
  const [text, setText] = useState('');
  const [picked, setPicked] = useState<Mentionable[]>([]);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const byId = useMemo(() => new Map(messages.map((m) => [m.id, m])), [messages]);
  const closed = !!closesAt && now > new Date(closesAt);

  // Braces matter: Chrome 155+ returns a Promise from scrollIntoView, and an effect must return a cleanup or nothing.
  useEffect(() => {
    end.current?.scrollIntoView?.({ block: 'end' });
  }, [messages.length]);

  const query = text.match(/@([\p{L}\p{N}_-]*)$/u)?.[1];
  const suggestions = query === undefined ? [] : members
    .filter((m) => m.userId !== me && m.displayName.toLowerCase().startsWith(query.toLowerCase())).slice(0, 5);

  function pick(m: Mentionable) {
    setText(text.replace(/@([\p{L}\p{N}_-]*)$/u, `@${m.displayName} `));
    setPicked((p) => (p.some((x) => x.userId === m.userId) ? p : [...p, m]));
  }

  async function submit() {
    const body = text.trim();
    if (!body) return;
    const mentions = picked.filter((m) => body.includes(`@${m.displayName}`)).map((m) => m.userId);
    await send(body, { replyTo: replyTo?.id, mentions });
    setText('');
    setPicked([]);
    setReplyTo(null);
  }

  return (
    <div className="chat">
      {hasMore && <button className="btn ghost block" onClick={() => void loadOlder()}>{t('chat.older')}</button>}
      {!loading && messages.length === 0 && <p className="muted" style={{ textAlign: 'center' }}>{t('chat.empty')}</p>}
      {messages.map((m) => (
        <Bubble key={m.id} m={m} me={me} canModerate={canModerate} byId={byId} onReply={() => setReplyTo(m)} />
      ))}
      <div ref={end} />
      {closed ? (
        <p className="notice">{t('chat.closed')}</p>
      ) : (
        <div className="composer-wrap">
          {replyTo && (
            <div className="muted">{t('chat.replyingTo', { name: replyTo.authorName })} <button className="btn ghost" onClick={() => setReplyTo(null)}>×</button></div>
          )}
          {suggestions.length > 0 && (
            <div className="mention-list">
              {suggestions.map((m) => <button key={m.userId} type="button" onClick={() => pick(m)}>@{m.displayName}</button>)}
            </div>
          )}
          {showMenu && menu && <div className="chat-menu" onClick={() => setShowMenu(false)}>{menu}</div>}
          <div className="composer">
            {menu && <button type="button" className="tool" aria-label={t('chat.menu')} onClick={() => setShowMenu(!showMenu)}>＋</button>}
            <textarea className="composer-in" rows={1} maxLength={2000} placeholder={t('chat.placeholder')} value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void submit(); } }} />
            <button type="button" className="btn" onClick={() => void submit()} disabled={!text.trim()}>{t('chat.send')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
