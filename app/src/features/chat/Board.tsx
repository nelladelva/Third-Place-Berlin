import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { addPin, deletePin, listPins, type Pin } from '../../data/chat';

export function PinForm({ circleId, onSaved, onCancel }: { circleId: string; onSaved: () => void; onCancel: () => void }) {
  const { t } = useTranslation();
  const [f, setF] = useState({ title: '', body: '', url: '' });
  const [error, setError] = useState<string | null>(null);
  async function save() {
    try {
      await addPin({ circleId, title: f.title.trim(), body: f.body.trim(), url: f.url.trim() });
      onSaved();
    } catch {
      setError(t('common.error'));
    }
  }
  return (
    <div className="card">
      <label className="label" htmlFor="pin-t">{t('board.pinTitle')}</label>
      <input id="pin-t" className="input" maxLength={100} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
      <label className="label" htmlFor="pin-b">{t('board.pinBody')}</label>
      <textarea id="pin-b" className="input" rows={3} maxLength={1000} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} />
      <label className="label" htmlFor="pin-u">{t('board.pinUrl')}</label>
      <input id="pin-u" className="input" type="url" placeholder="https://" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} />
      {error && <p className="error">{error}</p>}
      <div className="btnrow">
        <button className="btn secondary" onClick={onCancel}>{t('common.cancel')}</button>
        <button className="btn" disabled={!f.title.trim() || (!!f.url && !/^https?:\/\//i.test(f.url))} onClick={() => void save()}>{t('board.save')}</button>
      </div>
    </div>
  );
}

export function Board({ circleId, me, canModerate }: { circleId: string; me: string | null; canModerate: boolean }) {
  const { t } = useTranslation();
  const [pins, setPins] = useState<Pin[]>([]);
  const [adding, setAdding] = useState(false);
  const load = useCallback(() => void listPins(circleId).then(setPins), [circleId]);
  useEffect(load, [load]);
  return (
    <>
      {adding ? <PinForm circleId={circleId} onSaved={() => { setAdding(false); load(); }} onCancel={() => setAdding(false)} />
              : <button className="btn block" onClick={() => setAdding(true)} style={{ marginBottom: 10 }}>{t('board.add')}</button>}
      {pins.length === 0 && <p className="muted">{t('board.empty')}</p>}
      {pins.map((p) => (
        <div className="card" key={p.id}>
          <strong>📌 {p.title}</strong>
          {p.body && <p style={{ whiteSpace: 'pre-wrap', margin: '6px 0' }}>{p.body}</p>}
          {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer">{p.url}</a>}
          {(p.authorId === me || canModerate) && (
            <div><button className="btn ghost" onClick={() => void deletePin(p.id).then(load)}>{t('board.remove')}</button></div>
          )}
        </div>
      ))}
    </>
  );
}
