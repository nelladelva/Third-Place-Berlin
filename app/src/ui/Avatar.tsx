const COLORS = ['#C1592A', '#2F5D58', '#D9A441', '#3C4A7A', '#8E3B8A', '#2E6E8E', '#A0522D', '#B9647D'];

export function colorFor(id: string): string {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return COLORS[h % COLORS.length];
}

export function Avatar({ id, name, url, size = 40 }: { id: string; name: string; url?: string | null; size?: number }) {
  const style = { width: size, height: size, fontSize: size * 0.4, background: colorFor(id) };
  if (url) return <img className="avatar" src={url} alt="" style={style} />;
  return (
    <span className="avatar" style={style} aria-hidden>
      {(name.trim()[0] ?? '?').toUpperCase()}
    </span>
  );
}
