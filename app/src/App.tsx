import { HashRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { TabBar, type Tab } from './ui/TabBar';
import { AuthGate, useProfile } from './features/auth/AuthGate';
import { WelcomeFlow } from './features/auth/WelcomeFlow';
import { CircleGrid, CirclesScreen } from './features/circles/CirclesScreen';
import { CircleScreen, circleTabContent } from './features/circles/CircleScreen';
import { ProposeCircle } from './features/circles/ProposeCircle';
import { HomeScreen } from './features/home/HomeScreen';
import { MeetupScreen, meetupChatSlot } from './features/meetups/MeetupScreen';
import { MeetupForm } from './features/meetups/MeetupForm';
import { CircleMeetups } from './features/meetups/CircleMeetups';
import { CircleBoard, CircleChat, MeetupChat } from './features/chat/CircleChat';
import { PeopleScreen } from './features/people/PeopleScreen';
import { ProfileScreen } from './features/people/ProfileScreen';
import { MeScreen, meSections } from './features/me/MeScreen';
import { Inbox } from './features/me/Inbox';
import { NotificationSettings } from './features/me/NotificationSettings';
import { useUnreadCount } from './data/notifications';
import './lib/i18n';

circleTabContent.meetups = (circle) => <CircleMeetups circle={circle} />;
circleTabContent.chat = (circle) => <CircleChat circle={circle} />;
circleTabContent.board = (circle) => <CircleBoard circle={circle} />;
meetupChatSlot.render = (m) => <MeetupChat meetup={m} />;
meSections.inbox = () => <Inbox />;
meSections.notifications = () => <NotificationSettings />;

function activeTab(path: string): Tab {
  if (path.startsWith('/circles')) return 'circles';
  if (path.startsWith('/people')) return 'people';
  if (path.startsWith('/me')) return 'me';
  return 'home';
}

function HomeRoute() {
  const { profile } = useProfile();
  return <HomeScreen name={profile.displayName} />;
}
function PeopleRoute() {
  const { profile } = useProfile();
  return <PeopleScreen me={profile} />;
}
function ProfileRoute() {
  const { profile } = useProfile();
  return <ProfileScreen meId={profile.id} />;
}
function MeRoute() {
  const { profile, refresh } = useProfile();
  return <MeScreen profile={profile} onChanged={() => void refresh()} />;
}
function EditProfileRoute() {
  const { profile, refresh } = useProfile();
  const navigate = useNavigate();
  return <WelcomeFlow profile={profile} requireConsent={false} onDone={() => void refresh().then(() => navigate('/me'))} />;
}

function Tabs({ path }: { path: string }) {
  const unread = useUnreadCount();
  return <TabBar active={activeTab(path)} badges={{ me: unread }} />;
}

function Shell() {
  const location = useLocation();
  return (
    <div className="app">
      <AuthGate circlesStep={<CircleGrid link={false} />}>
        <Routes>
          <Route path="/" element={<HomeRoute />} />
          <Route path="/circles" element={<CirclesScreen />} />
          <Route path="/circles/propose" element={<ProposeCircle />} />
          <Route path="/circles/:id" element={<CircleScreen />} />
          <Route path="/circles/:id/meetups/new" element={<MeetupForm />} />
          <Route path="/meetups/:id" element={<MeetupScreen />} />
          <Route path="/people" element={<PeopleRoute />} />
          <Route path="/people/:id" element={<ProfileRoute />} />
          <Route path="/me" element={<MeRoute />} />
          <Route path="/me/edit" element={<EditProfileRoute />} />
          <Route path="*" element={<HomeRoute />} />
        </Routes>
        <Tabs path={location.pathname} />
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
