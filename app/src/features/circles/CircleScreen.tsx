import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../ui/Screen';
import { Avatar } from '../../ui/Avatar';
import {
  decideJoin, getCircle, leaveCircle, listJoinRequests, listMembers,
  type CircleCard, type JoinRequestRow, type MemberRow,
} from '../../data/circles';
import { CircleTile } from './CircleTile';

export type CircleTab = 'chat' | 'meetups' | 'members' | 'board';

/** Content for the chat / meetups / board tabs is supplied by later features through this registry. */
export const circleTabContent: Partial<Record<CircleTab, (circle: CircleCard) => ReactNode>> = {};

function Members({ circle }: { circle: CircleCard }) {
  const { t } = useTranslation();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [requests, setRequests] = useState<JoinRequestRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    void listMembers(circle.id).then(setMembers);
    if (circle.isHost) void listJoinRequests(circle.id).then(setRequests);
  }, [circle.id, circle.isHost]);
  useEffect(load, [load]);

  async function decide(id: string, approve: boolean) {
    setError(null);
    try {
      await decideJoin(id, approve);
    } catch (e) {
      setError(t((e as Error).message.includes('needs_recommendation') ? 'circles.needsRecommendation' : 'common.error'));
    }
    load();
  }

  return (
    <>
      {circle.isHost && requests.length > 0 && (
        <div className="card">
          <div className="label" style={{ marginTop: 0 }}>{t('circles.requests')}</div>
          {requests.map((r) => (
            <div className="person" key={r.id}>
              <Avatar id={r.userId} name={r.displayName} url={r.avatarUrl} size={34} />
              <div style={{ flex: 1 }}>
                <Link to={`/people/${r.userId}`}><strong>{r.displayName}</strong></Link>
                <div className="muted">{r.field} · {t('circles.recommendations', { count: r.recommendations })}</div>
              </div>
              <button className="btn" onClick={() => void decide(r.id, true)}>{t('circles.approve')}</button>
              <button className="btn secondary" onClick={() => void decide(r.id, false)}>{t('circles.decline')}</button>
            </div>
          ))}
          {error && <p className="error" role="alert">{error}</p>}
        </div>
      )}
      {members.map((m) => (
        <Link to={`/people/${m.userId}`} className="person" key={m.userId} style={{ color: 'inherit', textDecoration: 'none' }}>
          <Avatar id={m.userId} name={m.displayName} url={m.avatarUrl} size={34} />
          <div>
            <strong>{m.displayName}</strong> {m.role === 'host' && <span className="tag teach">{t('circles.host')}</span>}
            <div className="muted">{m.field}</div>
          </div>
        </Link>
      ))}
    </>
  );
}

export function CircleScreen() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const [circle, setCircle] = useState<CircleCard | null | undefined>(undefined);
  const [tab, setTab] = useState<CircleTab>('chat');
  const load = useCallback(() => void getCircle(id).then(setCircle), [id]);
  useEffect(load, [load]);

  if (circle === undefined) return <Screen subtitle={t('common.loading')} />;
  if (circle === null) return <Screen title={t('circles.title')} subtitle={t('circles.notFound')} />;

  if (!circle.isMember) {
    return (
      <Screen>
        <Link to="/circles" className="muted">‹ {t('circles.title')}</Link>
        <div style={{ marginTop: 10 }}><CircleTile circle={circle} onChange={load} link={false} /></div>
        {circle.visibility === 'closed' && (
          <div className="card" style={{ marginTop: 12 }}>
            <p>{t('circles.closedInfo')}</p>
            <ol className="steps">
              <li>{circle.myRequestStatus ? '✓' : '○'} {t('circles.steps.sent')}</li>
              <li>○ {t('circles.steps.recommended')}</li>
              <li>○ {t('circles.steps.approved')}</li>
            </ol>
          </div>
        )}
        <p className="muted">{t('circles.membersOnly')}</p>
      </Screen>
    );
  }

  const tabs: CircleTab[] = ['chat', 'meetups', 'members', 'board'];
  const content = tab === 'members' ? <Members circle={circle} /> : circleTabContent[tab]?.(circle) ?? <p className="muted">{t('common.comingSoon')}</p>;
  return (
    <Screen>
      <Link to="/circles" className="muted">‹ {t('circles.title')}</Link>
      <h1 className="title">{circle.emoji} {circle.name}</h1>
      <p className="muted">
        {circle.visibility === 'open' ? t('circles.open') : t('circles.closed')} · {t('circles.members', { count: circle.memberCount })}
      </p>
      <div className="subtabs" role="tablist">
        {tabs.map((x) => (
          <button key={x} role="tab" aria-selected={tab === x} className={tab === x ? 'on' : ''} onClick={() => setTab(x)}>
            {t(`circles.tabs.${x}`)}
          </button>
        ))}
      </div>
      {content}
      {tab === 'members' && (
        <button className="btn ghost block" onClick={() => void leaveCircle(circle.id).then(load)}>{t('circles.leave')}</button>
      )}
    </Screen>
  );
}
