// auth-store.ts — Zustand store for Supabase authentication state.

import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/types';

export type AuthStatus = 'checking-session' | 'authenticated' | 'signed-out';
export type AuthGateAccess = 'pending' | 'granted' | 'blocked';

export type SignedOutReason =
  | 'no-session'
  | 'signed-out'
  | 'email-confirmation-required'
  | 'missing-profile'
  | 'profile-load-failed'
  | 'session-lookup-failed';

export type AuthGateNextStep =
  | 'wait-for-session'
  | 'open-app'
  | 'sign-in'
  | 'confirm-email'
  | 'complete-profile'
  | 'retry-profile-load'
  | 'retry-session';

export interface AuthGateTruth {
  access: AuthGateAccess;
  nextStep: AuthGateNextStep;
  signedOutReason: SignedOutReason | null;
}

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

// Keep auth gating and the operator's next step derivable from one shared surface.
export function getAuthGateTruth({
  authStatus,
  signedOutReason,
}: Pick<AuthStore, 'authStatus' | 'signedOutReason'>): AuthGateTruth {
  switch (authStatus) {
    case 'checking-session':
      return {
        access: 'pending',
        nextStep: 'wait-for-session',
        signedOutReason: null,
      };
    case 'authenticated':
      return {
        access: 'granted',
        nextStep: 'open-app',
        signedOutReason: null,
      };
    default:
      return {
        access: 'blocked',
        nextStep: resolveSignedOutNextStep(signedOutReason),
        signedOutReason,
      };
  }
}

function resolveSignedOutNextStep(reason: SignedOutReason | null): AuthGateNextStep {
  switch (reason) {
    case 'email-confirmation-required':
      return 'confirm-email';
    case 'missing-profile':
      return 'complete-profile';
    case 'profile-load-failed':
      return 'retry-profile-load';
    case 'session-lookup-failed':
      return 'retry-session';
    default:
      return 'sign-in';
  }
}

export const useAuthStore = create<AuthStore>()((set) => ({
  user: null,
  profile: null,
  authStatus: 'checking-session',
  signedOutReason: null,
  isLoading: true,
  isAuthenticated: false,

  beginSessionCheck: () =>
    set({
      user: null,
      profile: null,
      authStatus: 'checking-session',
      signedOutReason: null,
      isLoading: true,
      isAuthenticated: false,
    }),
  completeAuthenticatedSession: ({ user, profile }) =>
    set({
      user,
      profile,
      authStatus: 'authenticated',
      signedOutReason: null,
      isLoading: false,
      isAuthenticated: true,
    }),
  setProfile: (profile) => set({ profile }),
  setSignedOut: (reason) =>
    set({
      user: null,
      profile: null,
      authStatus: 'signed-out',
      signedOutReason: reason,
      isLoading: false,
      isAuthenticated: false,
    }),
}));
