import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../ui/Screen';
import { myProposals, proposeCircle, type ProposalRow } from '../../data/circles';

export function ProposeCircle() {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [emoji, setEmoji] = useState('');
  const [visibility, setVisibility] = useState<'open' | 'closed'>('open');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mine, setMine] = useState<ProposalRow[]>([]);
  useEffect(() => {
    myProposals().then(setMine).catch(() => setMine([]));
  }, [sent]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await proposeCircle({ name: name.trim(), description: description.trim(), emoji: emoji.trim(), visibility, cohosts: [] });
      setSent(true);
    } catch {
      setError(t('common.error'));
    }
  }

  return (
    <Screen title={t('propose.title')} subtitle={t('propose.intro')}>
      {sent ? (
        <p className="notice">{t('propose.sent')}</p>
      ) : (
        <form onSubmit={submit}>
          <label className="label" htmlFor="pc-name">{t('propose.name')}</label>
          <input id="pc-name" className="input" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
          <label className="label" htmlFor="pc-desc">{t('propose.description')}</label>
          <textarea id="pc-desc" className="input" rows={3} maxLength={300} value={description} onChange={(e) => setDescription(e.target.value)} />
          <label className="label" htmlFor="pc-emoji">{t('propose.emoji')}</label>
          <input id="pc-emoji" className="input" maxLength={4} value={emoji} onChange={(e) => setEmoji(e.target.value)} placeholder="🍳" />
          <div className="label">{t('propose.visibility')}</div>
          <div className="toggle">
            <button type="button" className={visibility === 'open' ? 'on' : ''} onClick={() => setVisibility('open')}>{t('circles.open')}</button>
            <button type="button" className={visibility === 'closed' ? 'on' : ''} onClick={() => setVisibility('closed')}>{t('circles.closed')}</button>
          </div>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn block" type="submit" disabled={!name.trim()}>{t('propose.send')}</button>
        </form>
      )}
      {mine.length > 0 && (
        <>
          <div className="label">{t('propose.mine')}</div>
          {mine.map((p) => (
            <div className="card" key={p.id}>
              <strong>{p.name}</strong> · <span className="muted">{t(`propose.status.${p.status}`)}</span>
              {p.adminNote && <div className="muted">“{p.adminNote}”</div>}
            </div>
          ))}
        </>
      )}
    </Screen>
  );
}
