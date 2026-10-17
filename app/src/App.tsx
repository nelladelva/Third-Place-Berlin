import { HashRouter, Route, Routes, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TabBar, type Tab } from './ui/TabBar';
import { Screen } from './ui/Screen';
import { AuthGate } from './features/auth/AuthGate';
import { CirclesScreen, CircleGrid } from './features/circles/CirclesScreen';
import { CircleScreen } from './features/circles/CircleScreen';
import { ProposeCircle } from './features/circles/ProposeCircle';
import { circleTabContent } from './features/circles/CircleScreen';
import { HomeScreen } from './features/home/HomeScreen';
import { MeetupScreen } from './features/meetups/MeetupScreen';
import { MeetupForm } from './features/meetups/MeetupForm';
import { CircleMeetups } from './features/meetups/CircleMeetups';
import { SessionContext } from './features/auth/AuthGate';

import { CircleBoard, CircleChat, MeetupChat } from './features/chat/CircleChat';
import { meetupChatSlot } from './features/meetups/MeetupScreen';
import { PeopleScreen } from './features/people/PeopleScreen';
import { ProfileScreen } from './features/people/ProfileScreen';

circleTabContent.meetups = (circle) => <CircleMeetups circle={circle} />;
circleTabContent.chat = (circle) => <CircleChat circle={circle} />;
circleTabContent.board = (circle) => <CircleBoard circle={circle} />;
meetupChatSlot.render = (m) => <MeetupChat meetup={m} />;
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
      <AuthGate circlesStep={<CircleGrid link={false} />}>
      <Routes>
        <Route path="/" element={<HomeScreen name={SessionContext.current?.profile.displayName} />} />
        <Route path="/meetups/:id" element={<MeetupScreen />} />
        <Route path="/circles/:id/meetups/new" element={<MeetupForm />} />
        <Route path="/circles" element={<CirclesScreen />} />
        <Route path="/circles/propose" element={<ProposeCircle />} />
        <Route path="/circles/:id" element={<CircleScreen />} />
        <Route path="/people" element={SessionContext.current ? <PeopleScreen me={SessionContext.current.profile} /> : null} />
        <Route path="/people/:id" element={<ProfileScreen meId={SessionContext.current?.profile.id} />} />
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
