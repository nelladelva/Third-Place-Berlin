import { HashRouter, Route, Routes, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TabBar, type Tab } from './ui/TabBar';
import { Screen } from './ui/Screen';
import { AuthGate } from './features/auth/AuthGate';
import './lib/i18n';

function activeTab(path: string): Tab {
  if (path.startsWith('/circles')) return 'circles';
  if (path.startsWith('/people')) return 'people';
  if (path.startsWith('/me')) return 'me';
  return 'home';
}

function Placeholder({ tab }: { tab: Tab }) {
  const { t } = useTranslation();
  return <Screen title={t(`tabs.${tab}`)} subtitle={t('common.comingSoon')} />;
}

function Shell() {
  const location = useLocation();
  return (
    <div className="app">
      <AuthGate>
      <Routes>
        <Route path="/" element={<Placeholder tab="home" />} />
        <Route path="/circles/*" element={<Placeholder tab="circles" />} />
        <Route path="/people/*" element={<Placeholder tab="people" />} />
        <Route path="/me/*" element={<Placeholder tab="me" />} />
      </Routes>
      <TabBar active={activeTab(location.pathname)} />
      </AuthGate>
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  );
}
