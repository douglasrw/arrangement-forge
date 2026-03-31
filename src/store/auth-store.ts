// auth-store.ts — Zustand store for Supabase authentication state.

import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/types';

export type AuthStatus = 'checking-session' | 'authenticated' | 'signed-out';

export type SignedOutReason =
  | 'no-session'
  | 'signed-out'
  | 'email-confirmation-required'
  | 'missing-profile'
  | 'profile-load-failed'
  | 'session-lookup-failed';

interface AuthStore {
  user: User | null;
  profile: Profile | null;
  authStatus: AuthStatus;
  signedOutReason: SignedOutReason | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  beginSessionCheck: () => void;
  completeAuthenticatedSession: (session: { user: User; profile: Profile }) => void;
  setProfile: (profile: Profile) => void;
  setSignedOut: (reason: SignedOutReason) => void;
}

export const useAuthStore = create<AuthStore>()((set) => ({
  user: null,
  profile: null,
  authStatus: 'checking-session',
  signedOutReason: null,
  isLoading: true,
  isAuthenticated: false,

  beginSessionCheck: () => set({
    user: null,
    profile: null,
    authStatus: 'checking-session',
    signedOutReason: null,
    isLoading: true,
    isAuthenticated: false,
  }),
  completeAuthenticatedSession: ({ user, profile }) => set({
    user,
    profile,
    authStatus: 'authenticated',
    signedOutReason: null,
    isLoading: false,
    isAuthenticated: true,
  }),
  setProfile: (profile) => set({ profile }),
  setSignedOut: (reason) => set({
    user: null,
    profile: null,
    authStatus: 'signed-out',
    signedOutReason: reason,
    isLoading: false,
    isAuthenticated: false,
  }),
}));
