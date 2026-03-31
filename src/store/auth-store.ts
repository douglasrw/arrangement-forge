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

export interface AuthTruth extends AuthGateTruth {
  status: AuthStatus;
}

export interface AuthStoreTruthSlice {
  user: User | null;
  profile: Profile | null;
  authTruth: AuthTruth;
  authGate: AuthGateTruth;
}

const CHECKING_SESSION_AUTH_GATE: AuthGateTruth = {
  access: 'pending',
  nextStep: 'wait-for-session',
  signedOutReason: null,
};

const AUTHENTICATED_AUTH_GATE: AuthGateTruth = {
  access: 'granted',
  nextStep: 'open-app',
  signedOutReason: null,
};

const SIGNED_OUT_AUTH_GATES: Record<SignedOutReason, AuthGateTruth> = {
  'no-session': {
    access: 'blocked',
    nextStep: 'sign-in',
    signedOutReason: 'no-session',
  },
  'signed-out': {
    access: 'blocked',
    nextStep: 'sign-in',
    signedOutReason: 'signed-out',
  },
  'email-confirmation-required': {
    access: 'blocked',
    nextStep: 'confirm-email',
    signedOutReason: 'email-confirmation-required',
  },
  'missing-profile': {
    access: 'blocked',
    nextStep: 'complete-profile',
    signedOutReason: 'missing-profile',
  },
  'profile-load-failed': {
    access: 'blocked',
    nextStep: 'retry-profile-load',
    signedOutReason: 'profile-load-failed',
  },
  'session-lookup-failed': {
    access: 'blocked',
    nextStep: 'retry-session',
    signedOutReason: 'session-lookup-failed',
  },
};

const SIGNED_OUT_WITHOUT_REASON_AUTH_GATE: AuthGateTruth = {
  access: 'blocked',
  nextStep: 'sign-in',
  signedOutReason: null,
};

const CHECKING_SESSION_AUTH_TRUTH: AuthTruth = {
  status: 'checking-session',
  ...CHECKING_SESSION_AUTH_GATE,
};

const AUTHENTICATED_AUTH_TRUTH: AuthTruth = {
  status: 'authenticated',
  ...AUTHENTICATED_AUTH_GATE,
};

const SIGNED_OUT_AUTH_TRUTHS: Record<SignedOutReason, AuthTruth> = {
  'no-session': {
    status: 'signed-out',
    ...SIGNED_OUT_AUTH_GATES['no-session'],
  },
  'signed-out': {
    status: 'signed-out',
    ...SIGNED_OUT_AUTH_GATES['signed-out'],
  },
  'email-confirmation-required': {
    status: 'signed-out',
    ...SIGNED_OUT_AUTH_GATES['email-confirmation-required'],
  },
  'missing-profile': {
    status: 'signed-out',
    ...SIGNED_OUT_AUTH_GATES['missing-profile'],
  },
  'profile-load-failed': {
    status: 'signed-out',
    ...SIGNED_OUT_AUTH_GATES['profile-load-failed'],
  },
  'session-lookup-failed': {
    status: 'signed-out',
    ...SIGNED_OUT_AUTH_GATES['session-lookup-failed'],
  },
};

const SIGNED_OUT_WITHOUT_REASON_AUTH_TRUTH: AuthTruth = {
  status: 'signed-out',
  ...SIGNED_OUT_WITHOUT_REASON_AUTH_GATE,
};

type AuthStoreState = {
  user: User | null;
  profile: Profile | null;
  authStatus: AuthStatus;
  signedOutReason: SignedOutReason | null;
  isLoading: boolean;
  isAuthenticated: boolean;
};

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
}: Pick<AuthStoreState, 'authStatus' | 'signedOutReason'>): AuthGateTruth {
  switch (authStatus) {
    case 'checking-session':
      return CHECKING_SESSION_AUTH_GATE;
    case 'authenticated':
      return AUTHENTICATED_AUTH_GATE;
    default:
      return signedOutReason
        ? SIGNED_OUT_AUTH_GATES[signedOutReason]
        : SIGNED_OUT_WITHOUT_REASON_AUTH_GATE;
  }
}

export function selectAuthGateTruth(
  state: Pick<AuthStoreState, 'authStatus' | 'signedOutReason'>
): AuthGateTruth {
  return getAuthGateTruth(state);
}

export function getAuthTruth(
  state: Pick<AuthStoreState, 'authStatus' | 'signedOutReason'>
): AuthTruth {
  switch (state.authStatus) {
    case 'checking-session':
      return CHECKING_SESSION_AUTH_TRUTH;
    case 'authenticated':
      return AUTHENTICATED_AUTH_TRUTH;
    default:
      return state.signedOutReason
        ? SIGNED_OUT_AUTH_TRUTHS[state.signedOutReason]
        : SIGNED_OUT_WITHOUT_REASON_AUTH_TRUTH;
  }
}

export function selectAuthTruth(
  state: Pick<AuthStoreState, 'authStatus' | 'signedOutReason'>
): AuthTruth {
  return getAuthTruth(state);
}

export function getAuthStoreTruthSlice(
  state: Pick<AuthStoreState, 'user' | 'profile' | 'authStatus' | 'signedOutReason'>
): AuthStoreTruthSlice {
  return {
    user: state.user,
    profile: state.profile,
    authTruth: getAuthTruth(state),
    authGate: getAuthGateTruth(state),
  };
}

export function selectAuthStoreTruthSlice(
  state: Pick<AuthStoreState, 'user' | 'profile' | 'authStatus' | 'signedOutReason'>
): AuthStoreTruthSlice {
  return getAuthStoreTruthSlice(state);
}

function createAuthStoreState(overrides: AuthStoreState): AuthStoreState {
  return {
    ...overrides,
  };
}

export const useAuthStore = create<AuthStore>()((set) => ({
  ...createAuthStoreState({
    user: null,
    profile: null,
    authStatus: 'checking-session',
    signedOutReason: null,
    isLoading: true,
    isAuthenticated: false,
  }),

  beginSessionCheck: () =>
    set(
      createAuthStoreState({
        user: null,
        profile: null,
        authStatus: 'checking-session',
        signedOutReason: null,
        isLoading: true,
        isAuthenticated: false,
      })
    ),
  completeAuthenticatedSession: ({ user, profile }) =>
    set(
      createAuthStoreState({
        user,
        profile,
        authStatus: 'authenticated',
        signedOutReason: null,
        isLoading: false,
        isAuthenticated: true,
      })
    ),
  setProfile: (profile) => set({ profile }),
  setSignedOut: (reason) =>
    set(
      createAuthStoreState({
        user: null,
        profile: null,
        authStatus: 'signed-out',
        signedOutReason: reason,
        isLoading: false,
        isAuthenticated: false,
      })
    ),
}));
