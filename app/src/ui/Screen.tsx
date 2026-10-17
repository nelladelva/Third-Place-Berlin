import type { ReactNode } from 'react';

export function Screen({ title, subtitle, children, actions }: { title?: string; subtitle?: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <main className="screen">
      {(title || actions) && (
        <div className="row">
          {title && <h1 className="title">{title}</h1>}
          <span className="spacer" />
          {actions}
        </div>
      )}
      {subtitle && <p className="subtitle">{subtitle}</p>}
      {children}
    </main>
  );
}
