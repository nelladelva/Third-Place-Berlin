import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export function PollComposer({ onCreate, onCancel }: { onCreate: (question: string, options: string[]) => void; onCancel: () => void }) {
  const { t } = useTranslation();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const filled = options.map((o) => o.trim()).filter(Boolean);
  const ok = question.trim().length > 0 && filled.length >= 2 && filled.length <= 6;
  return (
    <div className="card">
      <label className="label" htmlFor="poll-q">{t('poll.question')}</label>
      <input id="poll-q" className="input" maxLength={200} value={question} onChange={(e) => setQuestion(e.target.value)} />
      {options.map((o, i) => (
        <div key={i}>
          <label className="label" htmlFor={`poll-o${i}`}>{t('poll.option', { n: i + 1 })}</label>
          <input id={`poll-o${i}`} className="input" maxLength={80} value={o}
                 onChange={(e) => setOptions(options.map((x, j) => (j === i ? e.target.value : x)))} />
        </div>
      ))}
      {options.length < 6 && <button type="button" className="btn ghost" onClick={() => setOptions([...options, ''])}>{t('poll.addOption')}</button>}
      <div className="btnrow">
        <button type="button" className="btn secondary" onClick={onCancel}>{t('common.cancel')}</button>
        <button type="button" className="btn" disabled={!ok} onClick={() => onCreate(question.trim(), filled)}>{t('poll.create')}</button>
      </div>
    </div>
  );
}
