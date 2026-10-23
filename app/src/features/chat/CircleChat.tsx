import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { currentUserId } from '../../data/session';
import { listMembers, type CircleCard } from '../../data/circles';
import { createPoll } from '../../data/chat';
import type { Meetup } from '../../data/meetups';
import { ChatView, type Mentionable } from './ChatView';
import { PollComposer } from './PollComposer';
import { Board, PinForm } from './Board';

function useMe(): string | null {
  const [me, setMe] = useState<string | null>(null);
  useEffect(() => void currentUserId().then(setMe), []);
  return me;
}

function useMembers(circleId: string): Mentionable[] {
  const [members, setMembers] = useState<Mentionable[]>([]);
  useEffect(() => void listMembers(circleId).then((l) => setMembers(l.map((m) => ({ userId: m.userId, displayName: m.displayName })))), [circleId]);
  return members;
}

export function CircleChat({ circle }: { circle: CircleCard }) {
  const { t } = useTranslation();
  const me = useMe();
  const members = useMembers(circle.id);
  const [panel, setPanel] = useState<'poll' | 'pin' | null>(null);
  if (!me) return null;
  const menu = (
    <>
      <button className="btn secondary" onClick={() => setPanel('poll')}>{t('chat.poll')}</button>
      <button className="btn secondary" onClick={() => setPanel('pin')}>{t('chat.pin')}</button>
      <Link className="btn secondary" to={`/circles/${circle.id}/meetups/new`}>{t('chat.meetup')}</Link>
    </>
  );
  return (
    <>
      {panel === 'poll' && (
        <PollComposer onCancel={() => setPanel(null)}
                      onCreate={(q, opts) => void createPoll(circle.id, q, opts).then(() => setPanel(null))} />
      )}
      {panel === 'pin' && <PinForm circleId={circle.id} onSaved={() => setPanel(null)} onCancel={() => setPanel(null)} />}
      <ChatView scope={{ circleId: circle.id }} me={me} members={members} canModerate={circle.isHost} menu={menu} />
    </>
  );
}

export function CircleBoard({ circle }: { circle: CircleCard }) {
  const me = useMe();
  return <Board circleId={circle.id} me={me} canModerate={circle.isHost} />;
}

export function MeetupChat({ meetup }: { meetup: Meetup }) {
  const { t } = useTranslation();
  const me = useMe();
  const members = useMembers(meetup.circleId);
  if (!me) return null;
  const closesAt = new Date(new Date(meetup.endsAt).getTime() + 2 * 24 * 3600 * 1000).toISOString();
  return (
    <>
      <div className="label">{t('chat.title')}</div>
      <ChatView scope={{ meetupId: meetup.id }} me={me} members={members} closesAt={closesAt} canModerate={meetup.hostId === me} />
    </>
  );
}
