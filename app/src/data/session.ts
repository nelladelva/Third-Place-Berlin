import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type Profile = {
  id: string; displayName: string; field: string | null; origin: string | null; languages: string[];
  berlinSince: string | null; bio: string | null; funFact: string | null; teach: string[]; learn: string[];
  avatarUrl: string | null; locale: 'en' | 'de'; status: 'pending' | 'member' | 'removed'; role: 'member' | 'admin';
  invitedBy: string | null; consentAt: string | null; welcomedAt: string | null; createdAt: string; approvedAt: string | null;
};

export type ProfileRow = Record<string, unknown>;

export function toProfile(r: ProfileRow): Profile {
  return {
    id: r.id as string, displayName: r.display_name as string, field: (r.field as string) ?? null,
    origin: (r.origin as string) ?? null, languages: (r.languages as string[]) ?? [], berlinSince: (r.berlin_since as string) ?? null,
    bio: (r.bio as string) ?? null, funFact: (r.fun_fact as string) ?? null, teach: (r.teach as string[]) ?? [],
    learn: (r.learn as string[]) ?? [], avatarUrl: (r.avatar_url as string) ?? null, locale: (r.locale as 'en' | 'de') ?? 'en',
    status: r.status as Profile['status'], role: r.role as Profile['role'], invitedBy: (r.invited_by as string) ?? null,
    consentAt: (r.consent_at as string) ?? null, welcomedAt: (r.welcomed_at as string) ?? null, createdAt: r.created_at as string, approvedAt: (r.approved_at as string) ?? null,
  };
}

export type SendCodeResult = { ok: true } | { ok: false; reason: 'rate_limited' | 'invalid_email' | 'unknown' };

export async function sendCode(email: string): Promise<SendCodeResult> {
  const clean = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return { ok: false, reason: 'invalid_email' };
  const { error } = await supabase.auth.signInWithOtp({ email: clean, options: { shouldCreateUser: true } });
  if (!error) return { ok: true };
  const e = error as { status?: number; code?: string };
  if (e.status === 429 || e.code === 'over_email_send_rate_limit' || e.code === 'over_request_rate_limit') {
    return { ok: false, reason: 'rate_limited' };
  }
  if (e.code === 'validation_failed' || e.code === 'email_address_invalid') return { ok: false, reason: 'invalid_email' };
  return { ok: false, reason: 'unknown' };
}

export async function verifyCode(email: string, code: string): Promise<boolean> {
  const { data, error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: 'email' });
  return !error && !!data?.session;
}

/** Log out. This device's push subscription is removed first, so the next person on this phone gets no one else's notifications. */
export async function signOut(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
      await sub.unsubscribe();
    }
  } catch {
    /* no service worker / push: nothing to clean up */
  }
  await supabase.auth.signOut();
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  return data ? toProfile(data) : null;
}

export function useSession(): { userId: string | null; profile: Profile | null; loading: boolean; refresh: () => Promise<void> } {
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (uid: string | null) => {
    setUserId(uid);
    setProfile(uid ? await fetchProfile(uid) : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => load(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => void load(s?.user.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, [load]);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await load(data.session?.user.id ?? null);
  }, [load]);

  return { userId, profile, loading, refresh };
}
