import { Fragment } from 'react';

const URL_RE = /https:\/\/[^\s<>"]+/g;
const TRAILING = /[.,;:!?)\]]+$/;

/** Plain text with https:// links made clickable (opened in a new tab). Only https, nothing else. */
export function Linkify({ text }: { text: string }) {
  const parts: (string | { href: string })[] = [];
  let last = 0;
  for (const m of text.matchAll(URL_RE)) {
    const href = m[0].replace(TRAILING, '');
    const start = m.index ?? 0;
    parts.push(text.slice(last, start), { href });
    last = start + href.length;
  }
  parts.push(text.slice(last));
  return (
    <>
      {parts.map((p, i) => typeof p === 'string'
        ? <Fragment key={i}>{p}</Fragment>
        : <a key={i} href={p.href} target="_blank" rel="noopener noreferrer" style={{ overflowWrap: 'anywhere' }}>{p.href}</a>)}
    </>
  );
}
