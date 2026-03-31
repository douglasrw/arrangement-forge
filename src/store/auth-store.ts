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
  currentState: string;
  nextStep: AuthGateNextStep;
  nextStepLabel: string;
  nextStepDetail: string;
  signedOutReason: SignedOutReason | null;
}

export interface AuthTruth extends AuthGateTruth {
  status: AuthStatus;
}

export interface AuthStoreTruthSlice {
  user: User | null;
  profile: Profile | null;
  authTruth: AuthTruth;
}

type AuthStoreTruthSliceState = Pick<
  AuthStoreState,
  'user' | 'profile' | 'authStatus' | 'signedOutReason'
>;

type AuthGateDefinition = Omit<AuthGateTruth, 'signedOutReason'>;

const CHECKING_SESSION_AUTH_GATE: AuthGateDefinition = {
  access: 'pending',
  currentState: 'Checking for an existing session.',
  nextStep: 'wait-for-session',
  nextStepLabel: 'Wait for session bootstrap',
  nextStepDetail: 'Wait for session bootstrap to finish.',
};

const AUTHENTICATED_AUTH_GATE: AuthGateDefinition = {
  access: 'granted',
  currentState: 'An authenticated session is ready.',
  nextStep: 'open-app',
  nextStepLabel: 'Open the app',
  nextStepDetail: 'Open the app.',
};

const SIGNED_OUT_AUTH_GATES: Record<SignedOutReason, AuthGateDefinition> = {
  'no-session': {
    access: 'blocked',
    currentState: 'No saved session was found.',
    nextStep: 'sign-in',
    nextStepLabel: 'Sign in',
    nextStepDetail: 'Sign in to reopen the app.',
  },
  'signed-out': {
    access: 'blocked',
    currentState: 'The previous session has been signed out.',
    nextStep: 'sign-in',
    nextStepLabel: 'Sign in again',
    nextStepDetail: 'Sign in again to continue.',
  },
  'email-confirmation-required': {
    access: 'blocked',
    currentState: 'Email confirmation is still required before a session can start.',
    nextStep: 'confirm-email',
    nextStepLabel: 'Confirm your email',
    nextStepDetail: 'Open the confirmation email, then sign in again.',
  },
  'missing-profile': {
    access: 'blocked',
    currentState: 'The saved profile is missing, so the session cannot reopen yet.',
    nextStep: 'complete-profile',
    nextStepLabel: 'Complete the profile',
    nextStepDetail: 'Restore or complete the profile, then sign in again.',
  },
  'profile-load-failed': {
    access: 'blocked',
    currentState: 'The saved profile could not be loaded.',
    nextStep: 'retry-profile-load',
    nextStepLabel: 'Retry the profile load',
    nextStepDetail: 'Retry the profile load by signing in again.',
  },
  'session-lookup-failed': {
    access: 'blocked',
    currentState: 'The previous session could not be restored.',
    nextStep: 'retry-session',
    nextStepLabel: 'Retry session restore',
    nextStepDetail: 'Retry session restoration by signing in again.',
  },
};

const SIGNED_OUT_WITHOUT_REASON_AUTH_GATE: AuthGateDefinition = {
  access: 'blocked',
  currentState: 'Authentication is blocked until a new session starts.',
  nextStep: 'sign-in',
  nextStepLabel: 'Sign in',
  nextStepDetail: 'Sign in to continue.',
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

function createAuthGateTruth(
  definition: AuthGateDefinition,
  signedOutReason: SignedOutReason | null
): AuthGateTruth {
  return {
    ...definition,
    signedOutReason,
  };
}

function createAuthTruth(
  status: AuthStatus,
  definition: AuthGateDefinition,
  signedOutReason: SignedOutReason | null
): AuthTruth {
  return {
    status,
    ...createAuthGateTruth(definition, signedOutReason),
  };
}

const CHECKING_SESSION_AUTH_GATE_TRUTH = createAuthGateTruth(CHECKING_SESSION_AUTH_GATE, null);
const AUTHENTICATED_AUTH_GATE_TRUTH = createAuthGateTruth(AUTHENTICATED_AUTH_GATE, null);
const SIGNED_OUT_AUTH_GATE_TRUTHS: Record<SignedOutReason, AuthGateTruth> = {
  'no-session': createAuthGateTruth(SIGNED_OUT_AUTH_GATES['no-session'], 'no-session'),
  'signed-out': createAuthGateTruth(SIGNED_OUT_AUTH_GATES['signed-out'], 'signed-out'),
  'email-confirmation-required': createAuthGateTruth(
    SIGNED_OUT_AUTH_GATES['email-confirmation-required'],
    'email-confirmation-required'
  ),
  'missing-profile': createAuthGateTruth(SIGNED_OUT_AUTH_GATES['missing-profile'], 'missing-profile'),
  'profile-load-failed': createAuthGateTruth(
    SIGNED_OUT_AUTH_GATES['profile-load-failed'],
    'profile-load-failed'
  ),
  'session-lookup-failed': createAuthGateTruth(
    SIGNED_OUT_AUTH_GATES['session-lookup-failed'],
    'session-lookup-failed'
  ),
};
const SIGNED_OUT_WITHOUT_REASON_AUTH_GATE_TRUTH = createAuthGateTruth(
  SIGNED_OUT_WITHOUT_REASON_AUTH_GATE,
  null
);
const CHECKING_SESSION_AUTH_TRUTH = createAuthTruth('checking-session', CHECKING_SESSION_AUTH_GATE, null);
const AUTHENTICATED_AUTH_TRUTH = createAuthTruth('authenticated', AUTHENTICATED_AUTH_GATE, null);
const SIGNED_OUT_AUTH_TRUTHS: Record<SignedOutReason, AuthTruth> = {
  'no-session': createAuthTruth('signed-out', SIGNED_OUT_AUTH_GATES['no-session'], 'no-session'),
  'signed-out': createAuthTruth('signed-out', SIGNED_OUT_AUTH_GATES['signed-out'], 'signed-out'),
  'email-confirmation-required': createAuthTruth(
    'signed-out',
    SIGNED_OUT_AUTH_GATES['email-confirmation-required'],
    'email-confirmation-required'
  ),
  'missing-profile': createAuthTruth(
    'signed-out',
    SIGNED_OUT_AUTH_GATES['missing-profile'],
    'missing-profile'
  ),
  'profile-load-failed': createAuthTruth(
    'signed-out',
    SIGNED_OUT_AUTH_GATES['profile-load-failed'],
    'profile-load-failed'
  ),
  'session-lookup-failed': createAuthTruth(
    'signed-out',
    SIGNED_OUT_AUTH_GATES['session-lookup-failed'],
    'session-lookup-failed'
  ),
};
const SIGNED_OUT_WITHOUT_REASON_AUTH_TRUTH = createAuthTruth(
  'signed-out',
  SIGNED_OUT_WITHOUT_REASON_AUTH_GATE,
  null
);

// Keep auth gating and the operator's next step derivable from one shared surface.
export function getAuthGateTruth({
  authStatus,
  signedOutReason,
}: Pick<AuthStoreState, 'authStatus' | 'signedOutReason'>): AuthGateTruth {
  switch (authStatus) {
    case 'checking-session':
      return CHECKING_SESSION_AUTH_GATE_TRUTH;
    case 'authenticated':
      return AUTHENTICATED_AUTH_GATE_TRUTH;
    default:
      return signedOutReason
        ? SIGNED_OUT_AUTH_GATE_TRUTHS[signedOutReason]
        : SIGNED_OUT_WITHOUT_REASON_AUTH_GATE_TRUTH;
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
  state: AuthStoreTruthSliceState
): AuthStoreTruthSlice {
  return {
    user: state.user,
    profile: state.profile,
    authTruth: getAuthTruth(state),
  };
}

let cachedAuthStoreTruthSliceState: AuthStoreTruthSliceState | null = null;
let cachedAuthStoreTruthSlice: AuthStoreTruthSlice | null = null;

export function selectAuthStoreTruthSlice(
  state: AuthStoreTruthSliceState
): AuthStoreTruthSlice {
  if (
    cachedAuthStoreTruthSliceState &&
    cachedAuthStoreTruthSlice &&
    cachedAuthStoreTruthSliceState.user === state.user &&
    cachedAuthStoreTruthSliceState.profile === state.profile &&
    cachedAuthStoreTruthSliceState.authStatus === state.authStatus &&
    cachedAuthStoreTruthSliceState.signedOutReason === state.signedOutReason
  ) {
    return cachedAuthStoreTruthSlice;
  }

  cachedAuthStoreTruthSliceState = {
    user: state.user,
    profile: state.profile,
    authStatus: state.authStatus,
    signedOutReason: state.signedOutReason,
  };
  cachedAuthStoreTruthSlice = getAuthStoreTruthSlice(state);
  return cachedAuthStoreTruthSlice;
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
