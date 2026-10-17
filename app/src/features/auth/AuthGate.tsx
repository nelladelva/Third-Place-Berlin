import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSession, type Profile } from '../../data/session';
import { rememberInvite, rememberedInvite } from '../../data/invites';
import { LoginScreen } from './LoginScreen';
import { JoinScreen, NeedInviteScreen, RemovedScreen, WaitingScreen } from './AuthScreens';
import { WelcomeFlow } from './WelcomeFlow';
import { Screen } from '../../ui/Screen';

type ProfileCtx = { profile: Profile; refresh: () => Promise<void> };
const ProfileContext = createContext<ProfileCtx | null>(null);

/** The logged-in member's profile; only usable inside AuthGate's children. */
export function useProfile(): ProfileCtx {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile outside AuthGate');
  return ctx;
}

export function AuthGate({ children, circlesStep }: { children: ReactNode; circlesStep?: ReactNode }) {
  const { t } = useTranslation();
  const location = useLocation();
  const { userId, profile, loading, refresh } = useSession();
  const [, force] = useState(0);
  const [editing, setEditing] = useState(false);

  const joinMatch = location.pathname.match(/^\/join\/([a-z0-9]{10})$/i);
  useEffect(() => {
    if (joinMatch) rememberInvite(joinMatch[1]);
  }, [joinMatch]);
  if (joinMatch) return <Navigate to="/" replace />;

  if (loading) return <Screen subtitle={t('common.loading')} />;
  if (!userId) return <LoginScreen onLoggedIn={() => void refresh()} />;
  if (!profile) {
    const code = rememberedInvite();
    return code ? <JoinScreen code={code} onJoined={() => void refresh()} /> : <NeedInviteScreen onCode={() => force((n) => n + 1)} />;
  }
  if (profile.status === 'removed') return <RemovedScreen />;
  if (profile.status === 'pending') {
    return editing ? (
      <WelcomeFlow profile={profile} requireConsent={false} onDone={() => { setEditing(false); void refresh(); }} />
    ) : (
      <WaitingScreen onRefresh={() => void refresh()} onEditProfile={() => setEditing(true)} />
    );
  }
  if (!profile.welcomedAt) return <WelcomeFlow profile={profile} circlesStep={circlesStep} onDone={() => void refresh()} />;
  return <ProfileContext.Provider value={{ profile, refresh }}>{children}</ProfileContext.Provider>;
}
