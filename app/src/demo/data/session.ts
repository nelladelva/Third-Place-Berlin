// Demo twin of src/data/session.ts: you are always signed in as "You (demo)", already welcomed.
import { useCallback, useEffect, useState } from 'react';
import type { Profile, ProfileRow, SendCodeResult } from '../../data/session';
import { subscribe } from '../store';
import { ME, profileOf, state } from '../view';

export type { Profile, ProfileRow, SendCodeResult };

export function toProfile(r: ProfileRow): Profile {
  return {
    id: r.id as string, displayName: r.display_name as string, field: (r.field as string) ?? null,
    origin: (r.origin as string) ?? null, languages: (r.languages as string[]) ?? [], berlinSince: (r.berlin_since as string) ?? null,
    bio: (r.bio as string) ?? null, funFact: (r.fun_fact as string) ?? null, teach: (r.teach as string[]) ?? [],
    learn: (r.learn as string[]) ?? [], avatarUrl: (r.avatar_url as string) ?? null, locale: (r.locale as 'en' | 'de') ?? 'en',
    status: r.status as Profile['status'], role: r.role as Profile['role'], invitedBy: (r.invited_by as string) ?? null,
    consentAt: (r.consent_at as string) ?? null, welcomedAt: (r.welcomed_at as string) ?? null, createdAt: r.created_at as string,
    approvedAt: (r.approved_at as string) ?? null,
  };
}

export async function sendCode(email: string): Promise<SendCodeResult> {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? { ok: true } : { ok: false, reason: 'invalid_email' };
}
export async function verifyCode(_email: string, _code: string): Promise<boolean> {
  return true;
}
export async function currentUserId(): Promise<string | null> {
  return ME;
}
export async function signOut(): Promise<void> {
  /* the demo has no real session */
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const p = profileOf(userId);
  if (!p) return null;
  const { sample: _sample, ...profile } = p;
  return userId === ME ? { ...profile, role: state().me.viewAs } : profile;
}

export function useSession(): { userId: string | null; profile: Profile | null; loading: boolean; refresh: () => Promise<void> } {
  const [profile, setProfile] = useState<Profile | null>(null);
  const refresh = useCallback(async () => setProfile(await fetchProfile(ME)), []);
  useEffect(() => {
    void refresh();
    return subscribe(() => void refresh());
  }, [refresh]);
  return { userId: ME, profile, loading: profile === null, refresh };
}
