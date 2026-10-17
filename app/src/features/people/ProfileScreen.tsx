import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../ui/Screen';
import { Avatar } from '../../ui/Avatar';
import { block, getProfile, myCircles, reportProfile, unblock, type MyCircle, type ProfileView } from '../../data/profiles';
import { recommend } from '../../data/circles';

export function ProfileScreen({ meId }: { meId?: string }) {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const [p, setP] = useState<ProfileView | null | undefined>(undefined);
  const [circles, setCircles] = useState<MyCircle[] | null>(null);
  const [sent, setSent] = useState<string[]>([]);
  const [blocked, setBlocked] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    getProfile(id).then(setP).catch(() => setP(null));
  }, [id]);

  if (p === undefined) return <Screen subtitle={t('common.loading')} />;
  if (p === null) return <Screen subtitle={t('people.notFound')} />;
  const isMe = meId === p.id;

  async function openRecommend() {
    setCircles(await myCircles());
  }

  return (
    <Screen>
      <Link to="/people" className="muted">‹ {t('people.title')}</Link>
      <div style={{ textAlign: 'center', marginTop: 8 }}>
        <Avatar id={p.id} name={p.displayName} url={p.avatarUrl} size={84} />
        <h1 className="title">{p.displayName}</h1>
        <p className="muted">
          {[p.field, p.origin, p.languages.join('/'), p.berlinSince && t('people.inBerlinSince', { date: p.berlinSince.slice(0, 7) })]
            .filter(Boolean).join(' · ')}
        </p>
      </div>
      {p.bio && <div className="card"><p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>“{p.bio}”</p></div>}
      {p.funFact && <p><strong>{t('people.funFact')}:</strong> {p.funFact}</p>}
      {p.teach.length > 0 && (<><div className="label">{t('people.canTeach')}</div>{p.teach.map((s) => <span key={s} className="tag teach">{s}</span>)}</>)}
      {p.learn.length > 0 && (<><div className="label">{t('people.wantToLearn')}</div>{p.learn.map((s) => <span key={s} className="tag learn">{s}</span>)}</>)}
      {p.circles.length > 0 && (
        <><div className="label">{t('people.circles')}</div>
          {p.circles.map((c) => <Link key={c.id} to={`/circles/${c.id}`} className="tag">{c.emoji} {c.name}</Link>)}</>
      )}

      {isMe ? (
        <Link className="btn block" to="/me" style={{ marginTop: 16 }}>{t('people.editMine')}</Link>
      ) : (
        <div style={{ marginTop: 16 }}>
          <button className="btn secondary block" onClick={() => void openRecommend()}>{t('people.recommend', { name: p.displayName })}</button>
          {circles && (
            <div className="card" style={{ marginTop: 8 }}>
              <div className="label" style={{ marginTop: 0 }}>{t('people.recommendTo', { name: p.displayName })}</div>
              {circles.length === 0 && <p className="muted">{t('people.noCircles')}</p>}
              {circles.filter((c) => !p.circles.some((x) => x.id === c.id)).map((c) => (
                <div className="row person" key={c.id}>
                  <span>{c.emoji} {c.name} {c.visibility === 'closed' ? '🔒' : ''}</span>
                  <span className="spacer" />
                  {sent.includes(c.id) ? <span className="muted">{t('people.recommended')}</span> : (
                    <button className="btn" onClick={() => void recommend(c.id, p.id).then(() => setSent([...sent, c.id]))}>
                      {t('people.recommendAction')}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="btnrow">
            <button className="btn ghost" onClick={() => void (blocked ? unblock(p.id) : block(p.id)).then(() => setBlocked(!blocked))}>
              {blocked ? t('people.unblock') : t('people.block')}
            </button>
            <button className="btn ghost" onClick={() => {
              const reason = window.prompt(t('people.reportReason')) ?? '';
              if (reason) void reportProfile(p.id, reason).then(() => setNote(t('people.reported')));
            }}>{t('people.report')}</button>
          </div>
          {blocked && <p className="notice">{t('people.blocked')}</p>}
          {note && <p className="notice">{note}</p>}
        </div>
      )}
    </Screen>
  );
}
