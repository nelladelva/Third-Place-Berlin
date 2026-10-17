import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import '../lib/i18n';

export type Tab = 'home' | 'circles' | 'people' | 'me';

const TABS: { id: Tab; icon: string; to: string }[] = [
  { id: 'home', icon: '🏠', to: '/' },
  { id: 'circles', icon: '🧭', to: '/circles' },
  { id: 'people', icon: '👥', to: '/people' },
  { id: 'me', icon: '👤', to: '/me' },
];

export function TabBar({ active, badges = {} }: { active: Tab; badges?: Partial<Record<Tab, number>> }) {
  const { t } = useTranslation();
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map((tab) => (
        <Link key={tab.id} to={tab.to} className={tab.id === active ? 'tab on' : 'tab'} aria-current={tab.id === active ? 'page' : undefined}>
          <span className="tab-icon" aria-hidden>
            {tab.icon}
            {badges[tab.id] ? <span className="tab-badge">{badges[tab.id]}</span> : null}
          </span>
          <span>{t(`tabs.${tab.id}`)}</span>
        </Link>
      ))}
    </nav>
  );
}
