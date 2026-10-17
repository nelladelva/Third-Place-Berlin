import { useTranslation } from 'react-i18next';
import { usePoll, type PollData } from '../../data/chat';

export function PollView({ poll, onVote }: { poll: PollData; onVote: (optionId: string) => void }) {
  const { t } = useTranslation();
  const total = poll.options.reduce((s, o) => s + o.votes, 0);
  const closed = !!poll.closesAt && new Date(poll.closesAt) < new Date();
  const top = Math.max(0, ...poll.options.map((o) => o.votes));
  return (
    <div className="poll">
      <div className="poll-k">📊 {closed ? t('poll.closed') : t('chat.poll').replace('📊 ', '')}</div>
      <div className="poll-q">{poll.question}</div>
      {poll.options.map((o) => {
        const pct = total ? Math.round((100 * o.votes) / total) : 0;
        const mine = o.id === poll.myOptionId;
        return (
          <button key={o.id} className={`poll-opt${mine ? ' mine' : ''}${o.votes === top && top > 0 ? ' win' : ''}`}
                  disabled={closed} onClick={() => onVote(o.id)}>
            <i style={{ width: `${pct}%` }} />
            <span>{o.label}</span>
            <span>{o.votes}{mine ? ' ✓' : ''}</span>
          </button>
        );
      })}
      <div className="muted">{t('poll.votes', { count: total })}</div>
    </div>
  );
}

export function PollCard({ pollId }: { pollId: string }) {
  const { poll, vote } = usePoll(pollId);
  return poll ? <PollView poll={poll} onVote={(id) => void vote(id)} /> : null;
}
